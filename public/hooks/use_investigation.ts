/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useState, useCallback, useRef } from 'react';
import { timer } from 'rxjs';
import { concatMap, takeWhile } from 'rxjs/operators';
import { useObservable } from 'react-use';

import type { NoteBookServices } from 'public/types';
import type { ParagraphStateValue } from 'common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';

import {
  createAgenticExecutionMemory,
  executeMLCommonsAgent,
  executeMLCommonsAgenticMessage,
  getMLCommonsAgentDetail,
  getMLCommonsConfig,
} from '../utils/ml_commons_apis';
import { extractParentInteractionId } from '../../common/utils/task';
import { PERAgentInvestigationResponse } from '../../common/types/notebooks';
import { isValidPERAgentInvestigationResponse } from '../../common/utils/per_agent';
import { useNotebook } from './use_notebook';
import { CoreStart } from '../../../../src/core/public';
import { getNotebookTopLevelContextPrompt } from '../services/helpers/per_agent';

const commonInstructions = `
# Instructions

## Core Planning Rules
- Break the objective into an ordered list of atomic, self-contained Steps that, if executed, will lead to the final result or complete the objective
- Each Step must state what to do, where, and which tool/parameters would be used. You do not execute tools, only reference them for planning
- Use only the provided tools; do not invent or assume tools. If no suitable tool applies, use reasoning or observations instead
- Base your plan only on the data and information explicitly provided; do not rely on unstated knowledge or external facts
- If there is insufficient information to create a complete plan, summarize what is known so far and clearly state what additional information is required to proceed
- Stop and summarize if the task is complete or further progress is unlikely
- Avoid vague instructions; be specific about data sources, indexes, or parameters
- Never make assumptions or rely on implicit knowledge
- Respond only in JSON format

## Step Examples
**Good example:** "Use Tool to sample documents from index: 'my-index'"

**Bad example:** "Use Tool to sample documents from each index"

**Bad example:** "Use Tool to sample documents from all indices"`;

const commonResponseFormat = `
# Response Format

## JSON Response Requirements
Only respond in JSON format. Always follow the given response instructions. Do not return any content that does not follow the response instructions. Do not add anything before or after the expected JSON

Always respond with a valid JSON object that strictly follows the below schema:
\`\`\`json
{
  "steps": array[string],
  "result": string
}
\`\`\`

- Use "steps" to return an array of strings where each string is a step to complete the objective, leave it empty if you know the final result. Please wrap each step in quotes and escape any special characters within the string
- Use "result" to return the final response when you have enough information, leave it empty if you want to execute more steps. When providing the final result, it MUST be a stringified JSON object with the following structure:

## Final Result Structure
Final result must be a stringified JSON object:
\`\`\`json
{
    "findings": array[object],
    "hypotheses": array[object]
}
\`\`\`

Your final result JSON must include:
- **"findings"**: An array of finding objects, each containing:
  * **"id"**: A unique identifier for the finding (e.g., "F1", "F2")
  * **"description"**: Clear statement of the finding
  * **"importance"**: Rating from 0-100 indicating overall significance
  * **"evidence"**: Specific data, quotes, or observations supporting this finding
- **"hypotheses"**: An array of hypothesis objects, each containing:
  * **"id"**: A unique identifier for the hypothesis (e.g., "H1")
  * **"title"**: A concise title for the hypothesis
  * **"description"**: Clear statement of the hypothesis
  * **"likelihood"**: Rating from 0-100 indicating probability of being correct
  * **"supporting_findings"**: Array of finding IDs that support or relate to this hypothesis

### Finding Structure
\`\`\`json
{
    "id": string,
    "description": string,
    "importance": number (0-100),
    "evidence": string
}
\`\`\`

### Hypothesis Structure
\`\`\`json
{
    "id": string,
    "title": string,
    "description": string,
    "likelihood": number (0-100),
    "supporting_findings": array[string]
}
\`\`\`

### Likelihood Guidelines
- **Strong likelihood (70-100)**: High confidence, substantial supporting evidence
- **Moderate likelihood (40-70)**: Medium confidence, some supporting evidence  
- **Weak likelihood (0-40)**: Low confidence, limited supporting evidence

## Examples
**Planning response:**
\`\`\`json
{
  "steps": ["This is an example step", "this is another example step"],
  "result": ""
}
\`\`\`

**Final response:**
\`\`\`json
{
  "steps": [],
  "result": "{\"findings\":[{\"id\":\"F1\",\"description\":\"High error rate detected\",\"importance\":90,\"evidence\":\"500+ errors in last hour\"}],\"hypotheses\":[{\"id\":\"H1\",\"title\":\"Database Connection Issue\",\"description\":\"Application errors caused by database connectivity problems\",\"likelihood\":85,\"supporting_findings\":[\"F1\"]}]}"
}
\`\`\`

## Critical Rules
1. Do not use commas within individual steps
2. **CRITICAL: For tool parameters use commas without spaces (e.g., "param1,param2,param3") - This rule must be followed exactly**
3. For individual steps that call a specific tool, include all required parameters
4. Do not add any content before or after the JSON
5. Only respond with a pure JSON object
6. **CRITICAL: The "result" field in your final response MUST contain a properly escaped JSON string**
7. **CRITICAL: The hypothesis must reference specific findings by their IDs in the supporting_findings array**`;

const executePERAgent = async ({
  context,
  agentId,
  http,
  question,
  prompt,
  dataSourceId,
  executorAgentMemoryId,
}: {
  context: string;
  http: CoreStart['http'];
  agentId: string;
  question: string;
  prompt: string;
  executorAgentMemoryId: string;
  dataSourceId?: string;
}) =>
  executeMLCommonsAgent({
    http,
    agentId,
    async: true,
    parameters: {
      system_prompt: prompt,
      question,
      planner_prompt_template: `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\${parameters.planner_prompt}

## OBJECTIVE
Your job is to fulfill user's requirements and answer their questions effectively. User Input:
\`\`\`\${parameters.user_prompt}\`\`\`

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
[\${parameters.context}]

Remember: Respond only in JSON format following the required schema.`,
      planner_with_history_template: `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\${parameters.planner_prompt}

## OBJECTIVE
The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
\`\`\`\${parameters.user_prompt}\`\`\`

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research
[\${parameters.context}]

## CURRENT PROGRESS
You have already completed the following steps in the current plan. Consider these when determining next actions:
[\${parameters.completed_steps}]

Remember: Respond only in JSON format following the required schema.`,
      reflect_prompt_template: `
## AVAILABLE TOOLS
\${parameters.tools_prompt}

## PLANNING GUIDANCE
\`\`\`\${parameters.planner_prompt}\`\`\`

## OBJECTIVE
The following is the user's input. Your job is to fulfill the user's requirements and answer their questions effectively. User Input:
\${parameters.user_prompt}

## ORIGINAL PLAN
This was the initially created plan to address the objective:
[\${parameters.steps}]

## PREVIOUS CONTEXT
The following are steps executed previously to help you investigate, you can take these as background knowledge and utilize these information for further research without doing the same thing again:
[\${parameters.context}]

## CURRENT PROGRESS
You have already completed the following steps from the original plan. Consider these when determining next actions:
[\${parameters.completed_steps}]

## REFLECTION GUIDELINE
\${parameters.reflect_prompt}

Remember: Respond only in JSON format following the required schema.`,
      context,
      executor_agent_memory_id: executorAgentMemoryId,
    },
    dataSourceId,
  });

const getFindingFromParagraph = (paragraph: ParagraphStateValue<unknown>) => {
  return `
### Finding (ID: ${paragraph.id})
${paragraph.input.inputText}
    `;
};

const convertParagraphsToFindings = (paragraphs: Array<ParagraphStateValue<unknown>>) => {
  return paragraphs.map(getFindingFromParagraph).join(
    `

`.trim()
  );
};

export const useInvestigation = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { http, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { updateHypotheses, updateNotebookContext } = useNotebook();
  const { createParagraph, runParagraph } = useContext(NotebookReactContext).paragraphHooks;
  const contextStateValue = useObservable(context.state.getValue$());
  const paragraphStates = useObservable(context.state.getParagraphStates$());
  const paragraphLengthRef = useRef(0);
  paragraphLengthRef.current = paragraphStates?.length ?? 0;
  const hypothesesRef = useRef(contextStateValue?.hypotheses);
  hypothesesRef.current = contextStateValue?.hypotheses;

  const [isInvestigating, setIsInvestigating] = useState(false);

  const storeInvestigationResponse = useCallback(
    async ({ payload }: { payload: PERAgentInvestigationResponse }) => {
      const findingId2ParagraphId: { [key: string]: string } = {};
      let startParagraphIndex = paragraphLengthRef.current;
      // TODO: Handle legacy paragraphs if operation is REPLACE
      for (let i = 0; i < payload.findings.length; i++) {
        const finding = payload.findings[i];
        let paragraph;
        try {
          paragraph = await createParagraph({
            index: startParagraphIndex,
            input: {
              inputText: `%md
Importance: ${finding.importance}

Description:
${finding.description}

Evidence:
${finding.evidence}

              `.trim(),
              inputType: 'MARKDOWN',
              parameters: { findingId: finding.id },
            },
          });
          startParagraphIndex++;
        } catch (e) {
          console.error('Failed to create paragraph for finding:', JSON.stringify(finding));
          continue;
        }
        if (paragraph) {
          findingId2ParagraphId[finding.id] = paragraph.value.id;
          try {
            await runParagraph({
              id: paragraph.value.id,
            });
          } catch (e) {
            console.error('Failed to run paragraph:', e);
          }
        }
      }
      const newHypotheses = payload.hypotheses.map((hypothesis) => ({
        id: hypothesis.id,
        title: hypothesis.title,
        description: hypothesis.description,
        likelihood: hypothesis.likelihood,
        supportingFindingParagraphIds: [
          ...hypothesis.supporting_findings
            .map((id) => findingId2ParagraphId[id] || (id.startsWith('paragraph_') ? id : null))
            .filter((id) => !!id),
        ],
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }));
      try {
        await updateHypotheses([...(newHypotheses as any)]);
      } catch (e) {
        console.error('Failed to update investigation result', e);
      }
    },
    [updateHypotheses, createParagraph, runParagraph]
  );

  /**
   * Poll for investigation completion and process the response
   * @returns Promise that resolves when investigation is complete or rejects on error
   */
  const pollInvestigationCompletion = useCallback(
    ({
      memoryContainerId,
      parentInteractionId,
      abortController,
    }: {
      memoryContainerId: string | undefined;
      parentInteractionId: string;
      abortController?: AbortController;
    }): Promise<void> => {
      const dataSourceId = context.state.value.context.value.dataSourceId;

      return new Promise((resolve, reject) => {
        const subscription = timer(0, 5000)
          .pipe(
            concatMap(() =>
              executeMLCommonsAgenticMessage({
                memoryContainerId,
                messageId: parentInteractionId,
                http,
                signal: abortController?.signal,
                dataSourceId,
              })
            ),
            takeWhile(
              (message) => !message?.hits?.hits?.[0]?._source?.structured_data?.response,
              true
            )
          )
          .subscribe(async (message) => {
            const response = message?.hits?.hits?.[0]?._source?.structured_data?.response;

            if (!response) {
              return;
            }

            let responseJson;
            try {
              responseJson = JSON.parse(response);
            } catch (error) {
              console.error('Failed to parse response message', response);
              notifications.toasts.addError(error as Error, {
                title: 'Failed to parse response message',
              });
              return;
            }

            if (!isValidPERAgentInvestigationResponse(responseJson)) {
              console.error('Investigation response not valid', responseJson);
              return;
            }

            try {
              await storeInvestigationResponse({
                payload: responseJson,
              });
              resolve(undefined);
            } catch (e) {
              console.error('Failed to store investigation response', e);
              notifications.toasts.addError(e as Error, {
                title: 'Failed to store investigation response',
              });
              reject(e);
            } finally {
              subscription.unsubscribe();
            }
          });

        const abortHandler = () => {
          subscription.unsubscribe();
          abortController?.signal.removeEventListener('abort', abortHandler);
          reject(new Error('Investigation aborted'));
        };
        abortController?.signal.addEventListener('abort', abortHandler);
      });
    },
    [http, notifications, context.state, storeInvestigationResponse]
  );

  const executeInvestigation = useCallback(
    async ({
      question,
      contextPrompt,
      prompt,
      abortController,
    }: {
      question: string;
      contextPrompt: string;
      prompt: string;
      abortController?: AbortController;
    }) => {
      const dataSourceId = context.state.value.context.value.dataSourceId;
      setIsInvestigating(true);

      if (context.state.value.context.value.initialGoal !== question) {
        await updateNotebookContext({ initialGoal: question });
      }

      try {
        const agentId = (
          await getMLCommonsConfig({
            http,
            signal: abortController?.signal,
            configName: 'os_deep_research',
            dataSourceId,
          })
        ).configuration.agent_id;

        if (!agentId) {
          setIsInvestigating(false);
          return;
        }

        const memoryContainerId = (
          await getMLCommonsAgentDetail({
            http,
            agentId,
            dataSourceId,
          })
        )?.memory?.memory_container_id;

        const executorMemoryId = (
          await createAgenticExecutionMemory({
            http,
            dataSourceId,
            memoryContainerId,
          })
        )?.session_id;

        if (!executorMemoryId) {
          setIsInvestigating(false);
          return;
        }

        const result = await executePERAgent({
          http,
          agentId,
          dataSourceId,
          question,
          context: contextPrompt,
          prompt,
          executorAgentMemoryId: executorMemoryId,
        });

        const parentInteractionId = extractParentInteractionId(result);

        if (!parentInteractionId) {
          setIsInvestigating(false);
          return;
        }

        context.state.updateValue({
          memoryContainerId,
          currentParentInteractionId: parentInteractionId,
          currentExecutorMemoryId: executorMemoryId,
        });

        // Immediately save these IDs to backend so they persist across page refreshes
        try {
          await updateHypotheses(contextStateValue?.hypotheses || []);
        } catch (e) {
          notifications.toasts.addError(e, { title: 'Failed to save investigation IDs' });
        }

        return pollInvestigationCompletion({
          memoryContainerId,
          parentInteractionId,
          abortController,
        }).finally(() => {
          setIsInvestigating(false);
        });
      } catch (e) {
        console.error('Failed to execute per agent', e);
        notifications.toasts.addError(e, { title: 'Failed to execute per agent' });
        setIsInvestigating(false);
      }
    },
    [
      context.state,
      http,
      updateNotebookContext,
      updateHypotheses,
      contextStateValue?.hypotheses,
      pollInvestigationCompletion,
      notifications.toasts,
    ]
  );

  const doInvestigate = useCallback(
    async ({
      investigationQuestion,
      abortController,
    }: {
      investigationQuestion: string;
      abortController?: AbortController;
    }) => {
      const notebookContextPrompt = getNotebookTopLevelContextPrompt(
        context.state.value.context.value
      );

      const plannerSystemPrompt = `
# Investigation Planner Agent

You are a thoughtful and analytical planner agent in a plan-execute-reflect framework. Your job is to design a clear, step-by-step plan for a given objective.

${commonInstructions}

${commonResponseFormat}
`.trim();

      return executeInvestigation({
        question: investigationQuestion,
        contextPrompt: notebookContextPrompt,
        prompt: plannerSystemPrompt,
        abortController,
      });
    },
    [context.state, executeInvestigation]
  );

  const doInvestigateRef = useRef(doInvestigate);
  doInvestigateRef.current = doInvestigate;

  const addNewFinding = useCallback(
    async ({ hypothesisIndex, text }: { hypothesisIndex: number; text: string }) => {
      if (!hypothesesRef.current) {
        return;
      }
      const paragraph = await createParagraph({
        index: paragraphLengthRef.current,
        input: {
          inputText: text,
          inputType: 'MARKDOWN',
        },
      });
      const hypotheses = hypothesesRef.current;

      if (paragraph) {
        await runParagraph({ id: paragraph.value.id });
        const newHypotheses = [...hypotheses];
        const currentHypothesis = hypotheses[hypothesisIndex];

        if (currentHypothesis) {
          newHypotheses[hypothesisIndex] = {
            ...currentHypothesis,
            newAddedFindingIds: [
              ...(currentHypothesis.newAddedFindingIds ?? []),
              paragraph.value.id,
            ],
          };
          await updateHypotheses(newHypotheses);
        }
      }
    },
    [createParagraph, updateHypotheses, runParagraph]
  );

  const rerunInvestigation = async ({
    investigationQuestion,
    abortController,
  }: {
    investigationQuestion?: string;
    abortController?: AbortController;
  }) => {
    // Clear old memory IDs before starting new investigation
    context.state.updateValue({
      currentExecutorMemoryId: undefined,
      currentParentInteractionId: undefined,
      memoryContainerId: undefined,
    });
    const allParagraphs = context.state.getParagraphsValue();
    const question = investigationQuestion || context.state.value.context.value.initialGoal || '';

    const notebookContextPrompt = getNotebookTopLevelContextPrompt(
      context.state.value.context.value
    );

    const originalHypotheses = contextStateValue?.hypotheses || [];
    const rerunPrompt = `
# Re-Investigation Agent

You are a thoughtful and analytical planner agent specializing in **RE-INVESTIGATION**. Your job is to update existing hypotheses based on current evidence while minimizing new findings creation.

## Investigation Context
${
  investigationQuestion
    ? `**ORIGINAL QUESTION:** "${context.state.value.context.value.initialGoal || ''}"

The hypotheses were generated from this original question.

**NEW INVESTIGATION QUESTION:** "${investigationQuestion}"

You are now investigating this new question. Update the hypotheses based on this new question and current evidence.`
    : `**ORIGINAL QUESTION:** "${question}"
This is a re-run of the original investigation. Update the hypotheses based on the same question and current evidence.`
}

## Re-Investigation Rules
- Analyze existing hypotheses and findings to determine if they remain valid
- **REUSE** existing findings that are still relevant rather than creating duplicates
- Only create **NEW** findings when absolutely necessary for novel evidence
- Update hypothesis likelihood based on all available evidence

${commonInstructions}

## Findings Handling
- **CRITICAL:** In the "findings" array of your response, return **ONLY NEW findings** that provide genuinely novel evidence
- **For existing findings:** Use paragraph IDs in format "paragraph_uuid" (e.g., "paragraph_bb46405b-81ca-42e6-9868-8b61a6d1005c") in supporting_findings array
- **For new findings:** Use generated finding IDs (e.g., "F1", "F2", "F3") - frontend will replace these with actual paragraph IDs
- The supporting_findings array can contain a mix of existing paragraph IDs and new finding IDs
- **Do NOT return existing findings in the findings array** - they will not be deleted and don't need to be recreated

## Findings Novelty Check
You **MUST** include ONLY findings that are genuinely NEW. A finding is **NOT** new if:
- It restates the same conclusion with different wording
- It provides minor technical details about the same core issue
- It describes the same evidence using different terminology
- It's a methodological note about how you found existing information
- It summarizes or contextualizes already-known information

**A finding IS new only if:**
- It reveals a previously unknown cause or effect
- It identifies a different system component involved
- It discovers a new time pattern or scope
- It uncovers additional impact or consequences not previously known
- It provides genuinely new evidence (not just rewording existing evidence)

## Operation Guidance
Create new hypotheses with fresh IDs. Previous hypotheses will be replaced.

${commonResponseFormat}

**The final response should create a clear chain of evidence where findings support your hypothesis while maximizing reuse of existing evidence.**
`.trim();

    const currentStatePrompt = `${notebookContextPrompt}

# Current Hypotheses State
${originalHypotheses.reduce((acc, hypothesis, index) => {
  const existingFindingsPrompt = convertParagraphsToFindings(
    allParagraphs.filter((paragraph) =>
      hypothesis?.supportingFindingParagraphIds.includes(paragraph.id)
    )
  );
  const newFindingsPrompt = convertParagraphsToFindings(
    allParagraphs.filter((paragraph) => hypothesis?.newAddedFindingIds?.includes(paragraph.id))
  );
  return `${acc}
## Hypothesis ${index + 1}

Title: ${hypothesis.title}

Description: ${hypothesis.description}

Likelihood: ${hypothesis.likelihood}

### Supporting Findings
${existingFindingsPrompt}

${
  newFindingsPrompt
    ? `
### Additional Findings (Manually Added - Pay Special Attention)
${newFindingsPrompt}`
    : ''
}
    `;
}, '')}`;

    return executeInvestigation({
      question,
      contextPrompt: currentStatePrompt,
      prompt: rerunPrompt,
      abortController,
    });
  };

  const continueInvestigation = useCallback(async () => {
    const { currentParentInteractionId, memoryContainerId } = context.state.value;

    if (!currentParentInteractionId) {
      console.log('No ongoing investigation to continue');
      return;
    }

    const dataSourceId = context.state.value.context.value.dataSourceId;
    setIsInvestigating(true);

    try {
      // Check if investigation is already complete
      const initialMessage = await executeMLCommonsAgenticMessage({
        memoryContainerId,
        messageId: currentParentInteractionId,
        http,
        dataSourceId,
      });

      const initialResponse = initialMessage.hits.hits[0]._source.structured_data.response;

      // If already has response, process it immediately
      if (initialResponse) {
        setIsInvestigating(false);
        return;
      }

      // Otherwise, continue polling
      return pollInvestigationCompletion({
        memoryContainerId,
        parentInteractionId: currentParentInteractionId,
      }).finally(() => {
        setIsInvestigating(false);
      });
    } catch (e) {
      console.error('Failed to continue investigation', e);
      notifications.toasts.addError(e, { title: 'Failed to continue investigation' });
      setIsInvestigating(false);
    }
  }, [context.state, http, notifications, pollInvestigationCompletion]);

  return {
    isInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
  };
};
