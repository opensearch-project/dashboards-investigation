/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback, useRef, useEffect } from 'react';
import { useObservable } from 'react-use';

import type { NoteBookServices } from 'public/types';
import type { ParagraphStateValue } from 'common/state/paragraph_state';
import { firstValueFrom } from '@osd/std';
import { concatMap, filter } from 'rxjs/operators';
import { EMPTY, fromEvent, race, throwError } from 'rxjs';
import { i18n } from '@osd/i18n';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { InvestigationPhase, isInvestigationActive } from '../../common/state/notebook_state';

import {
  createAgenticExecutionMemory,
  executeMLCommonsAgent,
  getMLCommonsAgentDetail,
  getMLCommonsConfig,
} from '../utils/ml_commons_apis';
import { extractParentInteractionId } from '../../common/utils/task';
import {
  AgenticMemeory,
  InvestigationTimeRange,
  FindingParagraphParameters,
  PERAgentInvestigationResponse,
  HypothesisStatus,
} from '../../common/types/notebooks';
import { isValidPERAgentInvestigationResponse } from '../../common/utils/per_agent';
import { useNotebook } from './use_notebook';
import { generateContextPromptFromParagraphs } from '../services/helpers/per_agent';
import {
  DEFAULT_INVESTIGATION_NAME,
  DEFAULT_VISUALIZATION_NAME,
  NOTEBOOKS_API_PREFIX,
} from '../../common/constants/notebooks';
import { useToast } from './use_toast';
import { SharedMessagePollingService } from '../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service';
import { INTERVAL_TIME } from '../../common/constants/investigation';
import { NotebookBackendType } from '../../common/types/notebooks';

/**
 * Wraps an async operation with a custom error title for display purposes.
 */
const withErrorTitle = async <T>(title: string, operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    error.errorTitle = title;
    throw error;
  }
};

const getErrorTitle = (error: any, defaultTitle: string): string =>
  error?.errorTitle || defaultTitle;

const getFindingFromParagraph = (paragraph: ParagraphStateValue<unknown>) => {
  const feedback = (paragraph.input.parameters as FindingParagraphParameters)?.finding?.feedback;
  let feedbackText = '';

  if (feedback === 'CONFIRMED') {
    feedbackText = ' **[USER CONFIRMED]**';
  } else if (feedback === 'REJECTED') {
    feedbackText = ' **[USER REJECTED]**';
  } else {
    feedbackText = ' **[NO USER FEEDBACK YET]**';
  }

  return `
### Finding (ID: ${paragraph.id})${feedbackText}
${paragraph.input.inputText}
    `;
};

const convertParagraphsToFindings = (paragraphs: Array<ParagraphStateValue<unknown>>) => {
  return paragraphs.map(getFindingFromParagraph).join(
    `

`.trim()
  );
};

const isValidJSON = (message: string) => {
  try {
    return JSON.parse(message);
  } catch (jsonError) {
    jsonError.cause = message;
    // Clean up "Max Steps Limit [xx] Reached" to "Max Steps Limit Reached"
    if (/Max Steps Limit \[\d+\] Reached/i.test(message)) {
      jsonError.message = 'Max Steps Limit Reached';
    } else {
      jsonError.message = '';
    }
    throw jsonError;
  }
};

const isValidHypothesesResponse = (parsed: unknown) => {
  if (!isValidPERAgentInvestigationResponse(parsed)) {
    const validationError = new Error('Invalid per agent response');
    validationError.cause = i18n.translate('investigation.response.invalidFormat', {
      defaultMessage:
        'The investigation response format is invalid. Please try running the investigation again.',
    });
    throw validationError;
  }
};

export const useInvestigation = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { http, paragraphService, notifications, application },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { addError } = useToast();
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

  // Derive isInvestigating from investigationPhase
  const isInvestigating = isInvestigationActive(contextStateValue?.investigationPhase);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if there's an ongoing investigation by another user
   * Fetches the latest notebook data from backend to ensure accuracy across multiple tabs
   * @returns true if there's an ongoing investigation by another user, false otherwise
   */
  const checkOngoingInvestigation = useCallback(async (): Promise<boolean> => {
    const { id: notebookId } = context.state.value;

    try {
      // Fetch the latest notebook data from backend
      const latestNotebook = await http.get<NotebookBackendType>(
        `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${notebookId}`
      );

      const runningMemory = latestNotebook.runningMemory;

      // Check if there's an ongoing investigation by another user
      if (runningMemory?.parentInteractionId) {
        const investigationOwner = runningMemory.owner;
        notifications.toasts.addWarning({
          title: 'Investigation in progress',
          text: application.capabilities.investigation?.ownerSupported
            ? `User (${investigationOwner}) is currently running an investigation. Please wait for it to complete before starting a new one.`
            : `Another user is currently running an investigation. Please wait for it to complete before starting a new one.`,
        });

        return true;
      }

      return false;
    } catch (error) {
      addError({
        error,
        title: 'Failed to check ongoing investigation',
      });
      return true;
    }
  }, [
    context.state,
    http,
    notifications.toasts,
    addError,
    application.capabilities.investigation?.ownerSupported,
  ]);

  const storeInvestigationResponse = useCallback(
    async ({ payload }: { payload: PERAgentInvestigationResponse }) => {
      const findingId2ParagraphId: { [key: string]: string } = {};
      const startParagraphIndex = paragraphLengthRef.current;
      const sortedFindings = payload.findings.slice().sort((a, b) => b.importance - a.importance);

      // Delete old finding paragraphs
      const findingParagraphIds = context.state
        .getParagraphsValue()
        .filter(
          (paragraph) => paragraph.input.inputType === 'MARKDOWN' && paragraph.aiGenerated === true
        )
        .map((paragraph) => paragraph.id);

      if (findingParagraphIds.length > 0) {
        await withErrorTitle('Failed to clean up old findings', () =>
          batchDeleteParagraphs(findingParagraphIds)
        );
      }

      // Create new finding paragraphs
      const paragraphsToCreate = sortedFindings.map(
        ({ importance, description, evidence, type }) => ({
          input: {
            inputText: `%md ${evidence}`.trim(),
            inputType: 'MARKDOWN',
            parameters: {
              finding: {
                importance: +importance,
                description,
                type,
              },
            } as FindingParagraphParameters,
          },
          aiGenerated: true,
        })
      );

      const batchResult = await withErrorTitle('Failed to batch create new findings', () =>
        batchCreateParagraphs({
          startIndex: startParagraphIndex,
          paragraphs: paragraphsToCreate,
        })
      );

      if (batchResult?.paragraphs) {
        batchResult.paragraphs.forEach((paragraph: any, index: number) => {
          findingId2ParagraphId[sortedFindings[index].id] = paragraph.id;
        });

        const paragraphIds = batchResult.paragraphs.map((p: any) => p.id);
        await withErrorTitle('Failed to load the new findings', () =>
          batchRunParagraphs({ paragraphIds })
        );
      }

      // Update hypotheses
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
          ] as string[],
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        }))
        .sort((a, b) => b.likelihood - a.likelihood);

      await withErrorTitle('Failed to update investigation hypotheses', () =>
        updateHypotheses([...newHypotheses], payload.topologies || [], true)
      );
    },
    [
      updateHypotheses,
      batchCreateParagraphs,
      batchRunParagraphs,
      batchDeleteParagraphs,
      context.state,
    ]
  );

  /**
   * Update investigation title based on the suggested title from the agent only if investigation use the default value
   */
  const updateInvestigationName = useCallback(
    async (suggestedName: string) => {
      const isDefaultName = [DEFAULT_INVESTIGATION_NAME, DEFAULT_VISUALIZATION_NAME].includes(
        contextStateValue?.title || ''
      );
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
          addError({
            title: 'Failed to update investigation title',
            error,
          });
        }
      }
    },
    [contextStateValue?.title, context.state, http, addError]
  );

  const handlePollingSuccess = useCallback(
    async (message: string, runningMemory: AgenticMemeory) => {
      try {
        const responseJson = await withErrorTitle('Failed to parse response', async () => {
          const parsed = isValidJSON(message);

          isValidHypothesesResponse(parsed);
          return parsed;
        });

        await storeInvestigationResponse({ payload: responseJson });

        if (responseJson.investigationName) {
          await updateInvestigationName(responseJson.investigationName);
        }

        context.state.updateValue({
          historyMemory: runningMemory,
          investigationError: undefined,
          investigationPhase: InvestigationPhase.COMPLETED,
        });
      } catch (error: any) {
        context.state.updateValue({
          investigationError: error.message,
          runningMemory: undefined,
        });
        await updateHypotheses(hypothesesRef.current || []);
        addError({
          error,
          title: getErrorTitle(error, 'Failed to complete investigation'),
        });
      } finally {
        context.state.updateValue({
          runningMemory: undefined,
          investigationPhase: InvestigationPhase.COMPLETED,
        });
      }
    },
    [context.state, storeInvestigationResponse, updateInvestigationName, updateHypotheses, addError]
  );

  const handlePollingFailure = useCallback(
    async (error: any) => {
      if (error.message === 'ABORTED') {
        return;
      }
      const errorMessage = 'Failed to poll investigation message';
      addError({
        error,
        title: errorMessage,
      });
      context.state.updateValue({
        runningMemory: undefined,
        investigationError: errorMessage,
        investigationPhase: InvestigationPhase.COMPLETED,
      });
      await updateHypotheses(hypothesesRef.current || []);
    },
    [context.state, updateHypotheses, addError]
  );

  /**
   * Poll for investigation completion and process the response
   * @returns Promise that resolves when investigation is complete or rejects on error
   */
  const pollInvestigationCompletion = useCallback(
    async ({ runningMemory }: { runningMemory: AgenticMemeory }): Promise<void> => {
      const dataSourceId = context.state.value.context.value.dataSourceId;
      const sharedPollingService = SharedMessagePollingService.getInstance(http);
      const abortSignal = abortControllerRef.current?.signal;

      try {
        const message = await firstValueFrom(
          race(
            sharedPollingService
              .poll({
                memoryContainerId: runningMemory.memoryContainerId!,
                messageId: runningMemory.parentInteractionId!,
                dataSourceId,
                pollInterval: INTERVAL_TIME,
              })
              .pipe(filter(Boolean)),
            abortSignal
              ? fromEvent(abortSignal, 'abort').pipe(
                  concatMap(() => throwError(new Error('ABORTED')))
                )
              : EMPTY
          )
        );
        await handlePollingSuccess(message as string, runningMemory);
      } catch (error) {
        await handlePollingFailure(error);
      }
    },
    [http, context.state, handlePollingSuccess, handlePollingFailure]
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
      timeRange?: InvestigationTimeRange;
      initialGoal?: string;
      prevContent?: boolean;
    }) => {
      context.state.updateValue({
        investigationError: undefined,
        investigationPhase: InvestigationPhase.PLANNING,
      });

      // Create new AbortController for this investigation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const abortController = abortControllerRef.current;
      const dataSourceId = context.state.value.context.value.dataSourceId;

      try {
        if (context.state.value.isNotebookReadonly) {
          throw new Error(
            'Only user with write permission of this notebook can start the investigation'
          );
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

        // If `executorMemoryId` starts with `-` or `_`, it will be regenerated and retry up to 3 times.
        let executorMemoryId: string | undefined;
        for (let i = 0; i < 3; i++) {
          executorMemoryId = (
            await createAgenticExecutionMemory({ http, dataSourceId, memoryContainerId })
          )?.session_id;
          if (executorMemoryId && !/^[-_]/.test(executorMemoryId)) break;
        }

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
          owner: context.state.value.currentUser || undefined,
        };

        context.state.updateValue({
          runningMemory,
        });

        // Immediately save these IDs to backend so they persist across page refreshes
        await updateHypotheses(contextStateValue?.hypotheses || []);

        return pollInvestigationCompletion({
          runningMemory,
        });
      } catch (e) {
        const errorMessage = 'Failed to execute per agent';
        context.state.updateValue({
          runningMemory: undefined,
          investigationError: errorMessage,
          investigationPhase: InvestigationPhase.COMPLETED,
        });
        await updateHypotheses(hypothesesRef.current || []);
        addError({
          title: errorMessage,
          error: e,
        });
      }
    },
    [
      context.state,
      http,
      updateNotebookContext,
      updateHypotheses,
      contextStateValue?.hypotheses,
      pollInvestigationCompletion,
      addError,
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
      timeRange?: InvestigationTimeRange;
    }) => {
      context.state.updateValue({ investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT });
      const notebookContextPrompt = await retrieveInvestigationContextPrompt();

      return executeInvestigation({
        question: investigationQuestion,
        contextPrompt: notebookContextPrompt,
        timeRange,
      });
    },
    [context.state, executeInvestigation, retrieveInvestigationContextPrompt]
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
          parameters: {
            finding: {},
          },
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
      timeRange?: InvestigationTimeRange;
    }) => {
      // Clear old memory IDs before starting new investigation
      context.state.updateValue({
        runningMemory: undefined,
        investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT,
      });
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

      const {
        confirmedFindings,
        rejectedFindings,
        noFeedbackFindings,
      } = supportingFindingParagraphs.reduce(
        (acc, p) => {
          const feedback = (p.input.parameters as FindingParagraphParameters)?.finding?.feedback;
          if (feedback === 'CONFIRMED') {
            acc.confirmedFindings.push(p);
          } else if (feedback === 'REJECTED') {
            acc.rejectedFindings.push(p);
          } else {
            acc.noFeedbackFindings.push(p);
          }
          return acc;
        },
        {
          confirmedFindings: [] as typeof allParagraphs,
          rejectedFindings: [] as typeof allParagraphs,
          noFeedbackFindings: [] as typeof allParagraphs,
        }
      );

      const activeHypotheses = originalHypotheses.filter(
        (h) => h.status !== HypothesisStatus.RULED_OUT
      );
      const ruledOutHypotheses = originalHypotheses.filter(
        (h) => h.status === HypothesisStatus.RULED_OUT
      );

      const currentStatePrompt = `${notebookContextPrompt}

# User Feedback Summary
The user has reviewed your previous investigation and provided the following feedback:
- Confirmed Findings: ${confirmedFindings.length}
- Rejected Findings: ${rejectedFindings.length}
- User Added Findings: ${newAddedFindingParagraphs.length}
- Ruled Out Hypotheses: ${ruledOutHypotheses.length}
- Active Hypotheses: ${activeHypotheses.length}

# Current Hypotheses State
${
  activeHypotheses.length
    ? activeHypotheses.reduce((acc, hypothesis, index) => {
        const supportingFindingIds = [
          ...hypothesis.supportingFindingParagraphIds,
          ...(hypothesis.newAddedFindingIds ?? []),
        ].join(', ');
        const selectedFindingIds = (hypothesis.userSelectedFindingParagraphIds ?? []).join(', ');
        const irrelevantFindingIds = (hypothesis.irrelevantFindingParagraphIds ?? []).join(', ');
        return `${acc}
## Active Hypothesis ${index + 1}

Title: ${hypothesis.title}

Description: ${hypothesis.description}

Likelihood: ${hypothesis.likelihood}

Supporting Finding IDs: ${supportingFindingIds || 'None'}

User Selected Finding IDs (High Priority): ${selectedFindingIds || 'None'}

Irrelevant Finding IDs (User Marked): ${irrelevantFindingIds || 'None'}

    `;
      }, '')
    : 'No active hypotheses.'
}
${
  ruledOutHypotheses.length
    ? `## Ruled Out Hypotheses (DO NOT PURSUE)

${ruledOutHypotheses
  .map(
    (h, i) => `
### Ruled Out Hypothesis ${i + 1}

Title: ${h.title}

Description: ${h.description}

Reason: User determined this hypothesis is not viable

`
  )
  .join('')}`
    : ''
}

# Current Finding Paragraphs
${
  confirmedFindings.length
    ? `
## User Confirmed Findings (HIGH CONFIDENCE - Use These)
${convertParagraphsToFindings(confirmedFindings)}`
    : ''
}
${
  rejectedFindings.length
    ? `
## User Rejected Findings (DO NOT USE - Incorrect/Unreliable)
${convertParagraphsToFindings(rejectedFindings)}`
    : ''
}
${
  noFeedbackFindings.length
    ? `
## Findings Without User Feedback (ACCEPTABLE - Not Rejected by User)
${convertParagraphsToFindings(noFeedbackFindings)}`
    : ''
}
${
  newAddedFindingParagraphs.length
    ? `
## User Added Findings (CRITICAL - User Provided Evidence)
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
    const { runningMemory } = context.state.value;
    context.state.updateValue({
      investigationPhase: InvestigationPhase.PLANNING,
    });

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
        context.state.updateValue({
          investigationPhase: InvestigationPhase.COMPLETED,
        });
      });
    } catch (error) {
      const errorMessage = 'Failed to continue investigation';
      context.state.updateValue({
        runningMemory: undefined,
        investigationError: errorMessage,
        investigationPhase: InvestigationPhase.COMPLETED,
      });
      addError({
        error,
        title: errorMessage,
      });
    }
  }, [context.state, pollInvestigationCompletion, addError]);

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
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
    checkOngoingInvestigation,
  };
};
