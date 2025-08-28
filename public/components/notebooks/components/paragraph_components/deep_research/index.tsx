/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useContext, useCallback, useState } from 'react';
import { useObservable } from 'react-use';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';

import type { NoteBookServices } from 'public/types';
import type { DeepResearchInputParameters, DeepResearchOutputResult } from 'common/types/notebooks';

import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  ParagraphState,
  ParagraphStateValue,
} from '../../../../../../common/state/paragraph_state';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import { getLocalInputParameters } from '../../helpers/per_agent_helpers';

import { DeepResearchOutput } from './deep_research_output';
import { NotebookReactContext } from '../../../context_provider/context_provider';
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../../common/constants/notebooks';
import { isStateCompletedOrFailed } from '../../../../../../common/utils/task';

import { StepDetailsModal } from './step_details_modal';
import { PERAgentTaskService } from './services/per_agent_task_service';
import { MessageTraceFlyout } from './message_trace_flyout';
import { PERAgentMemoryService } from './services/per_agent_memory_service';

export const DeepResearchParagraph = ({
  paragraphState,
}: {
  paragraphState: ParagraphState<DeepResearchOutputResult, DeepResearchInputParameters>;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const PERAgentServices = useMemo(() => {
    const taskService = new PERAgentTaskService(http);
    const executorMemoryService = new PERAgentMemoryService(
      http,
      taskService.getExecutorMemoryId$(),
      () => {
        const task = taskService.getTaskValue();
        return !!task && !isStateCompletedOrFailed(task.state);
      }
    );
    return {
      task: taskService,
      executorMemory: executorMemoryService,
    };
  }, [http]);
  const observables = useMemo(
    () => ({
      executorMemoryId$: PERAgentServices.task.getExecutorMemoryId$(),
      task$: PERAgentServices.task.getTask$(),
    }),
    [PERAgentServices.task]
  );
  const executorMemoryId = useObservable(observables.executorMemoryId$);

  const { state } = useContext(NotebookReactContext);
  const [stepDetailMessageId, setStepDetailMessageId] = useState<string>();
  const [showContextModal, setShowContextModal] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();
  const [showSteps, setShowSteps] = useState(false);
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const contextValue = useObservable(state.value.context.getValue$(), state.value.context.value);
  const task = useObservable(observables.task$);
  const input =
    (paragraphValue.input.parameters as DeepResearchInputParameters) || paragraphValue.input;
  const taskLoaded = !!task;
  const taskFinished = task && isStateCompletedOrFailed(task.state);

  const { runParagraph } = useParagraphs();
  const rawOutputResult = ParagraphState.getOutput(paragraphValue)?.result;
  // FIXME: Read paragraph out directly once all notebooks store object as output
  const outputResult = useMemo<DeepResearchOutputResult | undefined>(() => {
    if (typeof rawOutputResult !== 'string' || typeof rawOutputResult === 'undefined') {
      return rawOutputResult;
    }
    if (!rawOutputResult) {
      return undefined;
    }
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawOutputResult);
    } catch (e) {
      console.error('Failed to parse output result', e);
    }
    if (typeof parsedResult?.task_id === 'string') {
      return {
        taskId: parsedResult.task_id,
      };
    }
    return undefined;
  }, [rawOutputResult]);

  const runParagraphHandler = useCallback(
    async (inputPayload?: Partial<ParagraphStateValue['input']>) => {
      paragraphState.updateInput({
        ...inputPayload,
        parameters: getLocalInputParameters(),
      });
      await runParagraph({
        id: paragraphValue.id,
      });
    },
    [runParagraph, paragraphState, paragraphValue.id]
  );

  useEffect(() => {
    if (
      !paragraphValue.uiState?.isRunning &&
      !paragraphValue.input.inputText &&
      paragraphValue.input.inputType === DEEP_RESEARCH_PARAGRAPH_TYPE &&
      contextValue.initialGoal &&
      !outputResult?.taskId
    ) {
      // automatically run paragraph if there is initial goal
      runParagraphHandler({
        inputText: contextValue.initialGoal,
      });
    }
  }, [contextValue, paragraphValue, outputResult, runParagraphHandler]);

  useEffect(() => {
    paragraphState.updateUIState({
      actions: [
        ...(executorMemoryId && taskFinished
          ? [
              {
                name: `${showSteps ? 'Hide' : 'Show'} steps`,
                action: () => {
                  setShowSteps((flag) => !flag);
                },
              },
            ]
          : []),
        ...(outputResult?.taskId
          ? [
              {
                name: 'Show agent inputs',
                action: () => {
                  setShowContextModal(true);
                },
              },
            ]
          : []),
        ...(paragraphValue.input.inputType === AI_RESPONSE_TYPE
          ? [
              {
                name: 'Re-Run',
                action: runParagraphHandler,
              },
            ]
          : []),
      ],
    });
  }, [
    paragraphState,
    outputResult?.taskId,
    executorMemoryId,
    showSteps,
    paragraphValue.input.inputType,
    runParagraphHandler,
    taskFinished,
  ]);

  useEffect(() => {
    const taskId = outputResult?.taskId;
    const dataSourceId = paragraphValue.dataSourceMDSId;
    if (!taskId) {
      PERAgentServices.task.reset();
      return;
    }
    PERAgentServices.task.setup({
      taskId,
      dataSourceId,
    });
    return () => {
      PERAgentServices.task.stop('Unmount');
    };
  }, [outputResult?.taskId, paragraphValue.dataSourceMDSId, PERAgentServices.task]);

  useEffect(() => {
    PERAgentServices.executorMemory.setup({
      dataSourceId: paragraphValue.dataSourceMDSId,
    });
    return () => {
      PERAgentServices.executorMemory.stop('Unmount');
    };
  }, [paragraphValue.dataSourceMDSId, http, PERAgentServices.executorMemory]);

  useEffect(() => {
    if (paragraphValue.uiState?.isRunning) {
      PERAgentServices.task.reset();
      setShowSteps(true);
    }
  }, [paragraphValue.uiState?.isRunning, PERAgentServices.task]);

  useEffect(() => {
    if (taskLoaded) {
      setShowSteps(!taskFinished);
    }
  }, [taskLoaded, taskFinished]);

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiAvatar name={state.value.owner ?? 'User'} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
            <EuiText size="s">
              <p>{paragraphValue.input.inputText}</p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false} />
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DeepResearchOutput
        taskService={PERAgentServices.task}
        executorMemoryService={PERAgentServices.executorMemory}
        showSteps={showSteps}
        onViewDetails={setStepDetailMessageId}
        onExplainThisStep={setTraceMessageId}
      />
      <EuiSpacer />
      {stepDetailMessageId && (
        <StepDetailsModal
          onStepExplain={(messageId) => {
            setTraceMessageId(messageId);
            setStepDetailMessageId(undefined);
          }}
          closeModal={() => {
            setStepDetailMessageId(undefined);
          }}
          taskService={PERAgentServices.task}
          executorMemoryService={PERAgentServices.executorMemory}
          defaultExpandMessageId={stepDetailMessageId}
        />
      )}
      {/* FIXME this is used for debug */}
      {showContextModal && (
        <EuiModal onClose={() => setShowContextModal(false)}>
          <EuiModalHeader>Context</EuiModalHeader>
          <EuiModalBody>
            <EuiTabbedContent
              tabs={[
                ...((input as DeepResearchInputParameters)?.PERAgentInput
                  ? [
                      {
                        id: 'agentInput',
                        name: 'Agent input',
                        content: (
                          <>
                            <EuiMarkdownFormat>
                              {`\`\`\`json
${JSON.stringify(
  {
    ...input?.PERAgentInput,
    body: JSON.parse(input?.PERAgentInput.body),
  },
  null,
  2
)}
                      \`\`\`
                      `}
                            </EuiMarkdownFormat>
                          </>
                        ),
                      },
                    ]
                  : []),
                ...(input?.PERAgentContext
                  ? [
                      {
                        id: 'agentContext',
                        name: 'Agent context',
                        content: (
                          <>
                            <EuiMarkdownFormat>
                              {input?.PERAgentContext || 'No context'}
                            </EuiMarkdownFormat>
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </EuiModalBody>
        </EuiModal>
      )}
      {traceMessageId && (
        <MessageTraceFlyout
          messageId={traceMessageId}
          taskService={PERAgentServices.task}
          executorMemoryService={PERAgentServices.executorMemory}
          onClose={() => {
            setTraceMessageId(undefined);
          }}
          dataSourceId={paragraphValue.dataSourceMDSId}
        />
      )}
    </>
  );
};
