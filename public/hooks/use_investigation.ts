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
  executeMLCommonsAgent,
  getMLCommonsConfig,
  getMLCommonsMessage,
} from '../utils/ml_commons_apis';
import { extractParentInteractionId } from '../../common/utils/task';
import { PERAgentInvestigationResponse } from '../../common/types/notebooks';
import { isValidPERAgentInvestigationResponse } from '../../common/utils/per_agent';
import { useNotebook } from './use_notebook';
import { CoreStart } from '../../../../src/core/public';
import { getNotebookTopLevelContextPrompt } from '../services/helpers/per_agent';

const plannerSystemPrompt = `
You are a thoughtful and analytical planner agent in a plan-execute-reflect framework. Your job is to design a clear, step-by-step plan for a given objective.

Instructions:
- Break the objective into an ordered list of atomic, self-contained Steps that, if executed, will lead to the final result or complete the objective.
- Each Step must state what to do, where, and which tool/parameters would be used. You do not execute tools, only reference them for planning.
- Use only the provided tools; do not invent or assume tools. If no suitable tool applies, use reasoning or observations instead.
- Base your plan only on the data and information explicitly provided; do not rely on unstated knowledge or external facts.
- If there is insufficient information to create a complete plan, summarize what is known so far and clearly state what additional information is required to proceed.
- Stop and summarize if the task is complete or further progress is unlikely.
- Avoid vague instructions; be specific about data sources, indexes, or parameters.
- Never make assumptions or rely on implicit knowledge.
- Respond only in JSON format.

Step examples:
Good example: "Use Tool to sample documents from index: 'my-index'"
Bad example: "Use Tool to sample documents from each index"
Bad example: "Use Tool to sample documents from all indices"

Response Instructions:
Only respond in JSON format. Always follow the given response instructions. Do not return any content that does not follow the response instructions. Do not add anything before or after the expected JSON.

Always respond with a valid JSON object that strictly follows the below schema:
{
  "steps": array[string],
  "result": string
}

Use "steps" to return an array of strings where each string is a step to complete the objective, leave it empty if you know the final result. Please wrap each step in quotes and escape any special characters within the string.

Use "result" to return the final response when you have enough information, leave it empty if you want to execute more steps. When providing the final result, it MUST be a stringified JSON object with the following structure:
{
    "findings": array[object],
    "hypothesis": object,
    "operation": string
}

Where each finding object has this structure:
{
    "id": string,
    "description": string,
    "importance": number,
    "evidence": string
}

Note: When replacing an existing hypothesis, only include NEW findings with IDs that don't conflict with existing finding IDs.

And the hypothesis object has this structure:
{
    "id": string,
    "title": string,
    "description": string,
    "likelihood": number,
    "supporting_findings": array[string]
}

The operation field must be either "CREATE" (if creating a new hypothesis) or "REPLACE" (if replacing an existing hypothesis).

Here are examples of valid responses following the required JSON schema:
Example 1 - When you need to execute steps:
{
  "steps": ["This is an example step", "this is another example step"],
  "result": ""
}

Example 2 - When you have the final result:
{
  "steps": [],
  "result": "{\"findings\":[{\"id\":\"F1\",\"description\":\"Key finding from data analysis\",\"importance\":90,\"evidence\":\"Specific data points or observations supporting this finding\"},{\"id\":\"F2\",\"description\":\"Another significant finding\",\"importance\":70,\"evidence\":\"Evidence supporting this finding\"},{\"id\":\"F3\",\"description\":\"Additional finding from analysis\",\"importance\":60,\"evidence\":\"Specific evidence for this finding\"}],\"hypothesis\":{\"id\":\"H1\",\"title\":\"Main Hypothesis Title\",\"description\":\"Main hypothesis about the data\",\"likelihood\":85,\"supporting_findings\":[\"F1\",\"F2\",\"F3\"]},\"operation\":\"CREATE\"}"
}

Important rules for the response:
1. Do not use commas within individual steps
2. **CRITICAL: For tool parameters use commas without spaces (e.g., "param1,param2,param3") - This rule must be followed exactly**
3. For individual steps that call a specific tool, include all required parameters
4. Do not add any content before or after the JSON
5. Only respond with a pure JSON object
6. **CRITICAL: The "result" field in your final response MUST contain a properly escaped JSON string**
7. **CRITICAL: The hypothesis must reference specific findings by their IDs in the supporting_findings array**

Your final result JSON must include:
- "findings": An array of finding objects, each containing:
  * "id": A unique identifier for the finding (e.g., "F1", "F2")
  * "description": Clear statement of the finding
  * "importance": Rating from 0-100 indicating overall significance
  * "evidence": Specific data, quotes, or observations supporting this finding
- "hypothesis": A single hypothesis object containing:
  * "id": A unique identifier for the hypothesis (e.g., "H1")
  * "title": A concise title for the hypothesis
  * "description": Clear statement of the hypothesis
  * "likelihood": Rating from 0-100 indicating probability of being correct
  * "supporting_findings": Array of finding IDs that support or relate to this hypothesis
- "operation": Either "CREATE" or "REPLACE" to indicate if you're creating a new hypothesis or replacing an existing one

## CRITICAL RULES FOR CREATE VS REPLACE DECISION

**MANDATORY DECISION PROCESS - FOLLOW THESE STEPS IN ORDER:**

### STEP 1: SEMANTIC SIMILARITY CHECK
Before making any CREATE/REPLACE decision, you MUST evaluate the semantic similarity between the original and new hypothesis:

**Use REPLACE if ALL of these are true:**
- The core conclusion is essentially the same (>80% semantic overlap)
- The root cause identified is the same
- The affected system/component is the same
- The problem type/category is the same
- The title differs by <50% of the words

**Use CREATE if ANY of these are true:**
- Different root cause identified
- Different system/component affected
- Different problem type (e.g., configuration vs performance vs security)
- Title differs by >50% of the words
- Fundamentally different interpretation of the data

### STEP 2: FINDINGS NOVELTY CHECK
**For REPLACE operations ONLY:**
You MUST include ONLY findings that are genuinely NEW. A finding is NOT new if:
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

### STEP 3: MANDATORY SELF-CHECK
Before finalizing your response, ask yourself:
1. "Is my new hypothesis conclusion fundamentally different from the original?" (If No → likely REPLACE)
2. "Do my new findings reveal genuinely new information, or am I rewording existing conclusions?" (If rewording → use empty findings array)
3. "Would a human expert see these as the same hypothesis with minor refinements?" (If Yes → REPLACE)

### SIMPLIFIED DECISION TREE:
\`\`\`
Is the core conclusion/root cause the same?
├─ YES → Use REPLACE
│   ├─ Do I have genuinely NEW findings?
│   │   ├─ YES → Include only the NEW findings
│   │   └─ NO → Use empty findings array []
│   └─ Keep original hypothesis ID
└─ NO → Use CREATE with new hypothesis ID
\`\`\`

## EXAMPLES OF CORRECT DECISIONS:

**REPLACE Example:**
- Original: "Database timeout errors due to connection pool exhaustion"
- New: "Database timeout errors due to connection pool exhaustion affecting payment transactions"
- Decision: REPLACE (same root cause, added scope detail)

**CREATE Example:**
- Original: "Database timeout errors due to connection pool exhaustion"
- New: "Application memory leaks causing container restarts"
- Decision: CREATE (completely different root cause and problem type)

**REPLACE with Empty Findings:**
- Original: "API rate limiting causing 429 errors"
- New: "API rate limiting causing 429 errors" (same conclusion, no new info)
- Decision: REPLACE with findings: [] and supporting_findings: []

When using "REPLACE" operation:
- CRITICAL: Only include findings that reveal genuinely NEW information
- If you're only confirming or rephrasing existing findings, use an empty findings array []
- The "supporting_findings" array should include ONLY the IDs of NEW findings being added
- Never create duplicate findings that convey the same information with different wording

When using "CREATE" operation:
- Include all relevant findings (new and previously established)
- Use a new hypothesis ID to clearly distinguish it from any previous hypothesis

The final response should create a clear chain of evidence where findings support your hypothesis.


`.trim();

const executePERAgent = async ({
  context,
  agentId,
  http,
  question,
  prompt,
  dataSourceId,
}: {
  context: string;
  http: CoreStart['http'];
  agentId: string;
  question: string;
  prompt: string;
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
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { updateHypotheses } = useNotebook();
  const { createParagraph, runParagraph } = useContext(NotebookReactContext).paragraphHooks;
  const contextStateValue = useObservable(context.state.getValue$());
  const paragraphStates = useObservable(context.state.getParagraphStates$());
  const paragraphLengthRef = useRef(0);
  paragraphLengthRef.current = paragraphStates?.length ?? 0;
  const hypothesesRef = useRef(contextStateValue?.hypotheses);
  hypothesesRef.current = contextStateValue?.hypotheses;

  const [isInvestigating, setIsInvestigating] = useState(false);

  const storeInvestigationResponse = useCallback(
    async ({
      payload,
      hypothesisIndex,
      isReinvestigate,
    }: {
      payload: PERAgentInvestigationResponse;
      hypothesisIndex?: number;
      isReinvestigate?: boolean;
    }) => {
      const findingId2ParagraphId: { [key: string]: string } = {};
      const originalHypothesis =
        typeof hypothesisIndex !== 'undefined'
          ? contextStateValue?.hypotheses?.[hypothesisIndex]
          : undefined;
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
      const newHypothesis = {
        id: payload.hypothesis.id,
        title: payload.hypothesis.title,
        description: payload.hypothesis.description,
        likelihood: payload.hypothesis.likelihood,
        supportingFindingParagraphIds: [
          ...(originalHypothesis
            ? [
                ...originalHypothesis.supportingFindingParagraphIds,
                ...(originalHypothesis.newAddedFindingIds ?? []),
              ]
            : []),
          ...payload.hypothesis.supporting_findings
            .map((findingId) => findingId2ParagraphId[findingId])
            .filter((id) => !!id),
        ],
      };
      try {
        if (isReinvestigate) {
          await deleteHypotheses();
        }

        const newHypotheses = isReinvestigate ? [] : contextStateValue?.hypotheses ?? [];
        if (
          typeof hypothesisIndex === 'undefined' ||
          !newHypotheses[hypothesisIndex] ||
          payload.operation === 'CREATE'
        ) {
          newHypotheses.push(newHypothesis as any);
          // Clear old hypothesis new finding array
          if (typeof hypothesisIndex !== 'undefined' && newHypotheses[hypothesisIndex]) {
            newHypotheses[hypothesisIndex] = {
              ...newHypotheses[hypothesisIndex],
              newAddedFindingIds: [],
            };
          }
        } else {
          newHypotheses[hypothesisIndex] = newHypothesis as any;
        }

        await updateHypotheses(newHypotheses);
      } catch (e) {
        console.error('Failed to update investigation result', e);
      }
    },
    [
      updateHypotheses,
      createParagraph,
      runParagraph,
      deleteHypotheses,
      contextStateValue?.hypotheses,
    ]
  );

  const executeInvestigation = useCallback(
    async ({
      question,
      contextPrompt,
      hypothesisIndex,
      isReinvestigate = false,
      abortController,
    }: {
      question: string;
      contextPrompt: string;
      hypothesisIndex?: number;
      isReinvestigate?: boolean;
      abortController?: AbortController;
    }) => {
      const dataSourceId = context.state.value.context.value.dataSourceId;
      setIsInvestigating(true);

      try {
        const agentId = (
          await getMLCommonsConfig({
            http,
            signal: abortController?.signal,
            configName: 'os_deep_research',
            dataSourceId,
          })
        ).configuration.agent_id;

        const result = await executePERAgent({
          http,
          agentId,
          dataSourceId,
          question,
          context: contextPrompt,
          prompt: plannerSystemPrompt,
        });

        const parentInteractionId = extractParentInteractionId(result);
        if (!parentInteractionId) {
          setIsInvestigating(false);
          return;
        }

        return new Promise((resolve, reject) => {
          const subscription = timer(0, 5000)
            .pipe(
              concatMap(() => {
                return getMLCommonsMessage({
                  messageId: parentInteractionId,
                  http,
                  signal: abortController?.signal,
                  dataSourceId,
                });
              }),
              takeWhile((message) => !message.response, true)
            )
            .subscribe(async (message) => {
              if (!message.response) {
                return;
              }
              let responseJson;
              try {
                responseJson = JSON.parse(message.response);
              } catch (error) {
                console.error('Failed to parse response message', message.response);
                return;
              }
              if (!isValidPERAgentInvestigationResponse(responseJson)) {
                console.error('Investigation response not valid', responseJson);
                return;
              }
              try {
                await storeInvestigationResponse({
                  payload: responseJson,
                  hypothesisIndex,
                  isReinvestigate,
                });
                resolve(undefined);
              } catch (e) {
                console.error('Failed to store investigation response', e);
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
        }).finally(() => {
          setIsInvestigating(false);
        });
      } catch (e) {
        console.error('Failed to execute per agent', e);
        setIsInvestigating(false);
      }
    },
    [context.state, http, storeInvestigationResponse]
  );

  const doInvestigate = useCallback(
    async ({
      investigationQuestion,
      hypothesisIndex,
      abortController,
    }: {
      investigationQuestion: string;
      hypothesisIndex?: number;
      abortController?: AbortController;
    }) => {
      const originalHypothesis =
        typeof hypothesisIndex !== 'undefined'
          ? contextStateValue?.hypotheses?.[hypothesisIndex]
          : undefined;
      const allParagraphs = context.state.getParagraphsValue();
      const notebookContextPrompt = await getNotebookTopLevelContextPrompt(
        context.state.value.context.value
      );
      const existingFindingsPrompt = convertParagraphsToFindings(
        allParagraphs.filter((paragraph) =>
          originalHypothesis?.supportingFindingParagraphIds.includes(paragraph.id)
        )
      );
      const newFindingsPrompt = convertParagraphsToFindings(
        allParagraphs.filter((paragraph) =>
          originalHypothesis?.newAddedFindingIds?.includes(paragraph.id)
        )
      );
      const contextPrompt = originalHypothesis
        ? `
${notebookContextPrompt}

## Original hypothesis
Title: ${originalHypothesis.title}
Description: ${originalHypothesis.description}
Likelihood: ${originalHypothesis.likelihood}

## Original hypothesis findings
${existingFindingsPrompt}

## New added findings
${newFindingsPrompt}
      `.trim()
        : `${notebookContextPrompt}${convertParagraphsToFindings(allParagraphs)}`;

      return executeInvestigation({
        question: investigationQuestion,
        contextPrompt,
        hypothesisIndex,
        abortController,
      });
    },
    [contextStateValue?.hypotheses, context.state, executeInvestigation]
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

  const rerunInvestigation = async ({ abortController }: { abortController?: AbortController }) => {
    const allParagraphs = context.state.getParagraphsValue();
    const question = context.state.value.context.value.initialGoal || '';

    const originalHypotheses = contextStateValue?.hypotheses || [];
    const rerunPrompt = originalHypotheses.reduce(
      (acc, hypothesis, index) => {
        const existingFindingsPrompt = convertParagraphsToFindings(
          allParagraphs.filter((paragraph) =>
            hypothesis?.supportingFindingParagraphIds.includes(paragraph.id)
          )
        );
        const newFindingsPrompt = convertParagraphsToFindings(
          allParagraphs.filter((paragraph) =>
            hypothesis?.newAddedFindingIds?.includes(paragraph.id)
          )
        );
        return (acc = `${acc}
## Hypothesis ${index + 1}

Title: ${hypothesis.title}

Description: ${hypothesis.description}

Likelihood: ${hypothesis.likelihood}

### Supporting Findings
${existingFindingsPrompt}

### Additional Findings
${newFindingsPrompt}
    `);
      },
      `You are a thoughtful and analytical planner agent specializing in RE-INVESTIGATION. Your job is to update existing hypotheses based on current evidence while minimizing new findings creation.

ORIGINAL QUESTION: "${question}"
This is the original question that the user asked which generated the hypotheses below. Your re-investigation should address this same question while updating the hypotheses based on current evidence.

RE-INVESTIGATION PRINCIPLES:
1. REUSE existing findings that are still valid and relevant
2. Only create NEW findings when absolutely necessary
3. Update hypothesis likelihood based on all available evidence
4. Maintain continuity with previous investigation work

CRITICAL FINDINGS HANDLING:
- MINIMIZE new findings: Return empty findings array [] unless absolutely necessary
- New hypotheses MUST reference existing paragraph IDs in supportingFindingParagraphIds
- Generate new findings ONLY for completely novel evidence not covered by existing findings
- Existing findings remain available - original hypotheses will be replaced but findings persist
- Prefer reusing existing findings over creating new ones

OPERATION REQUIREMENT: Use "REPLACE" operation for all hypotheses - this is a re-investigation that updates existing hypotheses, not creation of new ones.

Response Instructions:
Only respond in JSON format. Always follow the given response instructions. Do not return any content that does not follow the response instructions. Do not add anything before or after the expected JSON.
Always respond with a valid JSON object that strictly follows the below schema:
{
  "steps": array[string],
  "result": string
}
Use "steps" to return an array of strings where each string is a step to complete the objective, leave it empty if you know the final result. Please wrap each step in quotes and escape any special characters within the string.
Use "result" to return the final response when you have enough information, leave it empty if you want to execute more steps. When providing the final result, it MUST be a stringified JSON object with the following structure:
{
    "findings": array[object],
    "hypothesis": object,
    "operation": string
}
Where each finding object has this structure:
{
    "id": string,
    "description": string,
    "importance": number,
    "evidence": string
}

And the hypothesis object has this structure:
{
    "id": string,
    "title": string,
    "description": string,
    "likelihood": number,
    "supporting_findings": array[string]
}

The operation field MUST be "REPLACE" for re-investigation.

Important rules for the response:
1. Do not use commas within individual steps
2. **CRITICAL: For tool parameters use commas without spaces (e.g., "param1,param2,param3") - This rule must be followed exactly**
3. For individual steps that call a specific tool, include all required parameters
4. Do not add any content before or after the JSON
5. Only respond with a pure JSON object
6. **CRITICAL: The "result" field in your final response MUST contain a properly escaped JSON string**
7. **CRITICAL: The hypothesis must reference specific findings by their IDs in the supporting_findings array**
8. **CRITICAL: ALWAYS USE "REPLACE" OPERATION FOR RE-INVESTIGATION**

The final response should create a clear chain of evidence where findings support your hypothesis while maximizing reuse of existing evidence.

CRITICAL: You MUST thoroughly analyze the Current Investigation State below. Each existing hypothesis and finding contains valuable evidence that should be carefully evaluated for reuse. Do not ignore or overlook any existing findings - they represent completed investigative work that should be preserved whenever possible.

HYPOTHESIS SUPPORT REQUIREMENT: Every hypothesis you generate MUST be supported by findings. If existing findings cannot adequately support your updated hypothesis, you MUST create new findings to provide proper evidence. A hypothesis without supporting findings is invalid.

# Current Investigation State:`
    );

    return executeInvestigation({
      question,
      contextPrompt: rerunPrompt,
      isReinvestigate: true,
      abortController,
    });
  };

  return {
    isInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
  };
};
