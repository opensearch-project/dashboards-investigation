/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useState, useCallback, useRef, useEffect } from 'react';
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
  getMLCommonsAgentDetail,
  getMLCommonsConfig,
} from '../utils/ml_commons_apis';
import { extractParentInteractionId } from '../../common/utils/task';
import { AgenticMemeory, PERAgentInvestigationResponse } from '../../common/types/notebooks';
import { isValidPERAgentInvestigationResponse } from '../../common/utils/per_agent';
import { useNotebook } from './use_notebook';
import { generateContextPromptFromParagraphs } from '../services/helpers/per_agent';
import { DEFAULT_INVESTIGATION_NAME, NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { getFinalMessage } from '../components/notebooks/components/hypothesis/investigation/utils';

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
    services: { http, notifications, paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { updateHypotheses, updateNotebookContext } = useNotebook();
  const {
    createParagraph,
    batchCreateParagraphs,
    batchRunParagraphs,
    runParagraph,
    batchDeleteParagraphs,
  } = useContext(NotebookReactContext).paragraphHooks;
  const contextStateValue = useObservable(context.state.getValue$());
  const paragraphStates = useObservable(context.state.getParagraphStates$());
  const paragraphLengthRef = useRef(0);
  paragraphLengthRef.current = paragraphStates?.length ?? 0;
  const hypothesesRef = useRef(contextStateValue?.hypotheses);
  hypothesesRef.current = contextStateValue?.hypotheses;

  const [isInvestigating, setIsInvestigating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const storeInvestigationResponse = useCallback(
    async ({ payload }: { payload: PERAgentInvestigationResponse }) => {
      const findingId2ParagraphId: { [key: string]: string } = {};
      const startParagraphIndex = paragraphLengthRef.current;
      const sortedFindings = payload.findings.slice().sort((a, b) => {
        const aHasTypology =
          a.description.toLowerCase().includes('topology') ||
          a.evidence.toLowerCase().includes('topology');
        const bHasTypology =
          b.description.toLowerCase().includes('topology') ||
          b.evidence.toLowerCase().includes('topology');
        if (aHasTypology && !bHasTypology) {
          return -1;
        }
        if (!aHasTypology && bHasTypology) {
          return 1;
        }
        return b.importance - a.importance;
      });

      const paragraphsToCreate = sortedFindings.map((finding) => ({
        input: {
          inputText: `%md
Importance: ${finding.importance}

Description:
${finding.description}

Evidence:
${finding.evidence}

          `.trim(),
          inputType: 'MARKDOWN',
        },
        aiGenerated: true,
      }));

      try {
        const batchResult = await batchCreateParagraphs({
          startIndex: startParagraphIndex,
          paragraphs: paragraphsToCreate,
        });

        if (batchResult?.paragraphs) {
          batchResult.paragraphs.forEach((paragraph: any, index: number) => {
            findingId2ParagraphId[sortedFindings[index].id] = paragraph.id;
          });

          // Run the created paragraphs
          const paragraphIds = batchResult.paragraphs.map((p: any) => p.id);
          await batchRunParagraphs({ paragraphIds });
        }
      } catch (e) {
        console.error('Failed to create or run batch paragraphs:', e);
        return;
      }
      const newHypotheses = payload.hypotheses
        .map((hypothesis) => ({
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
        }))
        .sort((a, b) => b.likelihood - a.likelihood);
      try {
        await updateHypotheses([...(newHypotheses as any)], true);
      } catch (e) {
        console.error('Failed to update investigation result', e);
      }
    },
    [updateHypotheses, batchCreateParagraphs, batchRunParagraphs]
  );

  /**
   * Update investigation title based on the suggested title from the agent only if investigation use the default value
   */
  const updateInvestigationName = useCallback(
    async (suggestedName: string) => {
      const isDefaultName = contextStateValue?.title === DEFAULT_INVESTIGATION_NAME;
      if (isDefaultName && suggestedName) {
        try {
          const autoGeneratedName = suggestedName.substring(0, 50);
          const { id: openedNoteId } = context.state.value;
          await http.put(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/rename`, {
            body: JSON.stringify({
              name: autoGeneratedName,
              noteId: openedNoteId,
            }),
          });

          // Update local state to reflect invesitgation header
          context.state.updateValue({ title: autoGeneratedName, path: autoGeneratedName });
        } catch (error) {
          // Don't fail the entire investigation if title update fails
          console.error('Failed to update investigation title:', error);
        }
      }
    },
    [contextStateValue?.title, context.state, http]
  );

  /**
   * Poll for investigation completion and process the response
   * @returns Promise that resolves when investigation is complete or rejects on error
   */
  const pollInvestigationCompletion = useCallback(
    ({ runningMemory }: { runningMemory: AgenticMemeory }): Promise<void> => {
      const dataSourceId = context.state.value.context.value.dataSourceId;

      return new Promise((resolve, reject) => {
        const subscription = timer(0, 5000)
          .pipe(
            concatMap(() =>
              getFinalMessage({
                memoryContainerId: runningMemory?.memoryContainerId!,
                messageId: runningMemory?.parentInteractionId!,
                http,
                signal: abortControllerRef.current?.signal,
                dataSourceId,
              })
            ),
            takeWhile((message) => !message, true)
          )
          .subscribe(async (message) => {
            const response = message;
            if (!response) {
              return;
            }

            let errorTitle = 'Failed to complete investigation';

            try {
              // Successful investigation, deleted all old finding paragraphs
              const findingParagraphIds = context.state
                .getParagraphsValue()
                .filter(
                  (paragraph) =>
                    paragraph.input.inputType === 'MARKDOWN' && paragraph.aiGenerated === true
                )
                .map((paragraph) => paragraph.id);

              let responseJson;
              try {
                responseJson = JSON.parse(response);
              } catch (error) {
                errorTitle = 'Failed to execute per agent';
                throw new Error(`Invalid per agent response: ${response}`);
              }

              if (!isValidPERAgentInvestigationResponse(responseJson)) {
                errorTitle = 'Failed to execute per agent';
                throw new Error(`Invalid per agent response: ${responseJson}`);
              }

              if (findingParagraphIds.length > 0) {
                try {
                  // Delete all existing finding paragraphs
                  await batchDeleteParagraphs(findingParagraphIds);
                } catch (error) {
                  errorTitle = 'Failed to clean up old findings';
                  throw error;
                }
              }

              try {
                await storeInvestigationResponse({
                  payload: responseJson,
                });
              } catch (error) {
                errorTitle = 'Failed to save investigation results';
                throw error;
              }

              // Update notebook title if suggested_title is provided and name is default investigation name
              if (responseJson.investigationName) {
                await updateInvestigationName(responseJson.investigationName);
              }

              context.state.updateValue({
                historyMemory: runningMemory,
                investigationError: undefined,
              });
              resolve(undefined);
            } catch (error) {
              const errorMessage = error.message;
              context.state.updateValue({ investigationError: errorMessage });
              await updateHypotheses(hypothesesRef.current || []);
              notifications.toasts.addError(error, {
                title: errorTitle,
                toastMessage: errorMessage,
              });
              reject(error);
            } finally {
              context.state.updateValue({ runningMemory: undefined });
              setIsInvestigating(false);
              subscription.unsubscribe();
            }
          });

        const abortHandler = () => {
          subscription.unsubscribe();
          abortControllerRef.current?.signal.removeEventListener('abort', abortHandler);
          reject(new Error('Investigation aborted'));
        };
        abortControllerRef.current?.signal.addEventListener('abort', abortHandler);
      });
    },
    [
      http,
      notifications,
      context.state,
      storeInvestigationResponse,
      updateInvestigationName,
      updateHypotheses,
      batchDeleteParagraphs,
    ]
  );

  const executeInvestigation = useCallback(
    async ({
      question,
      contextPrompt,
      initialGoal,
      prevContent,
      timeRange,
    }: {
      question: string;
      contextPrompt: string;
      initialGoal?: string;
      prevContent?: boolean;
      timeRange?: { from: string; to: string };
    }) => {
      // Create new AbortController for this investigation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const abortController = abortControllerRef.current;
      const dataSourceId = context.state.value.context.value.dataSourceId;
      setIsInvestigating(true);
      context.state.updateValue({ investigationError: undefined });

      try {
        if (!context.state.value.isNotebookOwner) {
          throw new Error('Only owner of this notebook can start the investigation');
        }

        if (context.state.value.context.value.initialGoal !== question) {
          await updateNotebookContext({ initialGoal: question });
        }

        const agentId = (
          await getMLCommonsConfig({
            http,
            signal: abortController?.signal,
            configName: 'os_deep_research',
            dataSourceId,
          })
        ).configuration.agent_id;

        if (!agentId) {
          throw new Error('agentId is null');
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
          throw new Error('executorMemoryId is null');
        }

        const result = await executeMLCommonsAgent({
          http,
          agentId,
          async: true,
          dataSourceId,
          parameters: {
            question,
            context: contextPrompt,
            executor_agent_memory_id: executorMemoryId,
            initialGoal,
            prevContent,
            timeRange,
          },
        });

        const parentInteractionId = extractParentInteractionId(result);

        if (!parentInteractionId) {
          throw new Error('parentInteractionId id is null');
        }

        const runningMemory: AgenticMemeory = {
          memoryContainerId,
          parentInteractionId,
          executorMemoryId,
        };

        context.state.updateValue({ runningMemory });

        // Immediately save these IDs to backend so they persist across page refreshes
        await updateHypotheses(contextStateValue?.hypotheses || []);

        return pollInvestigationCompletion({
          runningMemory,
        });
      } catch (e) {
        const errorMessage = 'Failed to execute per agent';
        context.state.updateValue({ runningMemory: undefined, investigationError: errorMessage });
        await updateHypotheses(hypothesesRef.current || []);
        notifications.toasts.addError(e.body || e, { title: errorMessage });
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
  const retrieveInvestigationContextPrompt = useCallback(async () => {
    const allParagraphs = context.state.getParagraphsValue();
    const topContext = context.state.value.context.value;

    return await generateContextPromptFromParagraphs({
      paragraphService,
      paragraphs: allParagraphs,
      notebookInfo: topContext,
      ignoreInputTypes: ['MARKDOWN'],
    });
  }, [context, paragraphService]);

  const doInvestigate = useCallback(
    async ({
      investigationQuestion,
      timeRange,
    }: {
      investigationQuestion: string;
      timeRange: { from: string; to: string } | undefined;
    }) => {
      const notebookContextPrompt = await retrieveInvestigationContextPrompt();

      return executeInvestigation({
        question: investigationQuestion,
        contextPrompt: notebookContextPrompt,
        timeRange,
      });
    },
    [executeInvestigation, retrieveInvestigationContextPrompt]
  );

  const doInvestigateRef = useRef(doInvestigate);
  doInvestigateRef.current = doInvestigate;

  const addNewFinding = useCallback(
    async ({ text }: { text: string }) => {
      const paragraph = await createParagraph({
        index: paragraphLengthRef.current,
        input: {
          inputText: text,
          inputType: 'MARKDOWN',
        },
        aiGenerated: false,
      });

      if (paragraph) {
        await runParagraph({ id: paragraph.value.id });
      }
    },
    [createParagraph, runParagraph]
  );

  const rerunInvestigation = useCallback(
    async ({
      investigationQuestion,
      initialGoal,
      timeRange,
    }: {
      investigationQuestion: string;
      initialGoal?: string;
      timeRange: { from: string; to: string } | undefined;
    }) => {
      // Clear old memory IDs before starting new investigation
      context.state.updateValue({ runningMemory: undefined });
      const allParagraphs = context.state.getParagraphsValue();
      const notebookContextPrompt = await retrieveInvestigationContextPrompt();

      const originalHypotheses = contextStateValue?.hypotheses || [];

      const { supportingFindingParagraphs, newAddedFindingParagraphs } = allParagraphs.reduce(
        (acc, paragraph) => {
          if (paragraph.input.inputType === 'MARKDOWN') {
            if (paragraph.aiGenerated === true) {
              acc.supportingFindingParagraphs.push(paragraph);
            } else if (paragraph.aiGenerated === false) {
              acc.newAddedFindingParagraphs.push(paragraph);
            }
          }

          return acc;
        },
        {
          supportingFindingParagraphs: [] as typeof allParagraphs,
          newAddedFindingParagraphs: [] as typeof allParagraphs,
        }
      );

      const currentStatePrompt = `${notebookContextPrompt}

# Current Hypotheses State
${originalHypotheses.reduce((acc, hypothesis, index) => {
  const currentHypothesisFindingParagraphIds = [
    ...hypothesis.supportingFindingParagraphIds,
    ...(hypothesis.newAddedFindingIds ?? []),
  ].join(', ');
  return `${acc}
## Hypothesis ${index + 1}

Title: ${hypothesis.title}

Description: ${hypothesis.description}

Likelihood: ${hypothesis.likelihood}

### Supporting Finding Paragraph Ids
${currentHypothesisFindingParagraphIds}

    `;
}, '')}

# Current Finding Paragraphs

## Supporting Findings
${convertParagraphsToFindings(supportingFindingParagraphs)}

${
  newAddedFindingParagraphs.length
    ? `## Additional Supporting Findings (Manually Added - Pay Special Attention)
${convertParagraphsToFindings(newAddedFindingParagraphs)}`
    : ''
}
`;

      return executeInvestigation({
        question: investigationQuestion,
        contextPrompt: currentStatePrompt,
        initialGoal,
        timeRange,
        prevContent: true,
      });
    },
    [
      context.state,
      retrieveInvestigationContextPrompt,
      contextStateValue?.hypotheses,
      executeInvestigation,
    ]
  );

  const continueInvestigation = useCallback(async () => {
    setIsInvestigating(true);
    const { runningMemory } = context.state.value;

    // Create AbortController if not exists
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }

    try {
      if (!runningMemory?.parentInteractionId) {
        throw new Error('No ongoing investigation to continue');
      }

      return pollInvestigationCompletion({
        runningMemory,
      }).finally(() => {
        setIsInvestigating(false);
      });
    } catch (error) {
      const errorMessage = 'Failed to continue investigation';
      context.state.updateValue({ runningMemory: undefined, investigationError: errorMessage });
      notifications.toasts.addError(error, { title: errorMessage });
      setIsInvestigating(false);
    }
  }, [context.state, notifications, pollInvestigationCompletion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    isInvestigating,
    setIsInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
  };
};
