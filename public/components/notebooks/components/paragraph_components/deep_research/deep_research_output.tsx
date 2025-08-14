/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownRender from '@nteract/markdown';
import {
  EuiButton,
  EuiLoadingContent,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiMarkdownFormat,
  EuiTabbedContent,
} from '@elastic/eui';
import { interval, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import moment from 'moment';
import { useUpdateEffect } from 'react-use';

import { DeepResearchOutputResult } from '../../../../../../common/types/notebooks';
import {
  extractCompletedResponse,
  extractFailedErrorMessage,
  extractExecutorMemoryId,
  extractParentInteractionId,
  isStateCompletedOrFailed,
} from '../../../../../../common/utils/task';
import { getMLCommonsTask } from '../../../../../utils/ml_commons_apis';
import { formatTimeGap, getTimeGapFromDates } from '../../../../../utils/time';
import { CoreStart } from '../../../../../../../../src/core/public';

import { getAllMessagesByMemoryId, getAllTracesByMessageId, isMarkdownText } from './utils';
import { MessageTraceModal } from './message_trace_modal';

interface Props {
  http: CoreStart['http'];
  dataSourceId: string | undefined;
  outputResult: DeepResearchOutputResult;
  input?: {
    PERAgentInput?: any;
    PERAgentContext?: any;
  };
}

export const DeepResearchOutput = ({ http, dataSourceId, outputResult, input }: Props) => {
  const [traces, setTraces] = useState([]);
  const taskId = outputResult.taskId;
  const [tracesVisible, setTracesVisible] = useState(false);
  const [executorMessages, setExecutorMessages] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [traceModalData, setTraceModalData] = useState<{
    messageId: string;
    messageCreateTime: string;
    refresh: boolean;
  }>();
  const [task, setTask] = useState();
  const initialFinalResponseVisible = useRef(false);
  const taskLoaded = !!task;
  const taskFinished = taskLoaded && isStateCompletedOrFailed(task.state);
  const taskRef = useRef(task);
  taskRef.current = task;

  const finalMessage = useMemo(() => {
    if (!task) {
      return '';
    }
    if (task.state === 'COMPLETED') {
      return (
        extractCompletedResponse(task) ?? 'Task was completed, but failed to load inference result.'
      );
    }

    if (task.state === 'FAILED') {
      return `Failed to execute task, reason: ${extractFailedErrorMessage(task)}`.trim();
    }
    return '';
  }, [task]);

  useEffect(() => {
    const abortController = new AbortController();
    if (!taskId) {
      return;
    }
    const subscription = timer(0, 5000)
      .pipe(
        switchMap(() => {
          return getMLCommonsTask({
            http,
            taskId,
            dataSourceId,
            signal: abortController.signal,
          });
        })
      )
      .pipe(takeWhile((res) => !isStateCompletedOrFailed(res.state), true))
      .subscribe((newTask) => {
        setTask((previousTask) => {
          if (JSON.stringify(previousTask) === JSON.stringify(newTask)) {
            return previousTask;
          }
          return { taskId, ...newTask };
        });
      });
    return () => {
      subscription.unsubscribe();
      abortController.abort('unmount...');
    };
  }, [taskId, dataSourceId, http]);

  useEffect(() => {
    if (!taskLoaded || taskFinished) {
      return;
    }
    const abortController = new AbortController();
    const subscription = interval(5000)
      .pipe(
        switchMap(() => {
          const parentInteractionId = taskRef.current
            ? extractParentInteractionId(taskRef.current)
            : undefined;
          const executorMemoryId = taskRef.current
            ? extractExecutorMemoryId(taskRef.current)
            : undefined;

          return Promise.allSettled([
            parentInteractionId
              ? getAllTracesByMessageId({
                  messageId: parentInteractionId,
                  http,
                  signal: abortController.signal,
                  dataSourceId,
                })
              : Promise.resolve([]),
            executorMemoryId
              ? getAllMessagesByMemoryId({
                  memoryId: executorMemoryId,
                  http,
                  signal: abortController.signal,
                  dataSourceId,
                })
              : Promise.resolve([]),
          ]);
        })
      )
      .subscribe(([{ value: loadedTraces }, { value: loadedExecutorMessages }]) => {
        setTraces(loadedTraces);
        setExecutorMessages(loadedExecutorMessages);
      });

    return () => {
      subscription.unsubscribe();
      abortController.abort('unmount...');
    };
  }, [taskLoaded, taskFinished, http, dataSourceId]);

  useUpdateEffect(() => {
    setTracesVisible(taskLoaded && !taskFinished);
    if (taskLoaded && taskFinished) {
      setExecutorMessages([]);
      setTraces([]);
    }
  }, [taskLoaded, taskFinished]);

  useUpdateEffect(() => {
    setTask(undefined);
    setTraces([]);
    setExecutorMessages([]);
  }, [taskId]);

  const renderTraces = () => {
    const allSteps = [...traces, ...executorMessages.slice(traces.length)];
    return (
      <>
        {allSteps.map(
          (
            { input: stepInput, response, message_id: messageId, create_time: createTime },
            index
          ) => {
            let durationStr = '';
            if (allSteps[index - 1]) {
              durationStr = getTimeGapFromDates(
                moment(allSteps[index - 1].create_time),
                moment(createTime)
              );
            } else if (task?.create_time) {
              durationStr = getTimeGapFromDates(moment(task.create_time), moment(createTime));
            }

            return (
              <React.Fragment key={messageId}>
                <EuiAccordion
                  id={`trace-${index}`}
                  buttonContent={`Step ${index + 1}${
                    !response ? '(No response)' : ''
                  } - ${stepInput} ${durationStr ? `(Duration: ${durationStr})` : ''}`}
                  paddingSize="l"
                >
                  {response && (
                    <EuiText className="wrapAll markdown-output-text" size="s">
                      <MarkdownRender source={response} />
                    </EuiText>
                  )}
                  {executorMessages?.[index] && (
                    <EuiButton
                      onClick={() => {
                        setTraceModalData({
                          messageId: executorMessages[index].message_id,
                          refresh: !response,
                          messageCreateTime: executorMessages[index].create_time,
                        });
                      }}
                    >
                      Explain this step
                    </EuiButton>
                  )}
                </EuiAccordion>
                <EuiSpacer />
              </React.Fragment>
            );
          }
        )}
      </>
    );
  };

  const shouldTracesModalRefresh = () => {
    if (!traceModalData || !traceModalData.refresh) {
      return false;
    }
    if (isStateCompletedOrFailed(task.state)) {
      return false;
    }
    const traceMessageIndex = executorMessages.findIndex(
      ({ message_id: messageId }) => messageId === traceModalData.messageId
    );
    if (traceMessageIndex + 1 < executorMessages.length) {
      return false;
    }
    return !executorMessages[traceMessageIndex]?.response;
  };

  return (
    <div>
      {tracesVisible && renderTraces()}
      {finalMessage && (
        <>
          <EuiAccordion
            id="final-response"
            buttonContent={
              <h3>
                Final response{' '}
                {task && task.last_update_time && task.create_time
                  ? `(Total Duration: ${formatTimeGap(task.last_update_time - task.create_time)})`
                  : ''}
              </h3>
            }
            initialIsOpen={initialFinalResponseVisible.current}
          >
            <EuiText className="wrapAll markdown-output-text" size="s">
              {isMarkdownText(finalMessage) ? (
                <MarkdownRender source={finalMessage} />
              ) : (
                finalMessage
              )}
            </EuiText>
          </EuiAccordion>
          <EuiSpacer />
        </>
      )}
      {taskId && (
        <>
          {(input?.PERAgentInput || input?.PERAgentContext) && (
            <EuiButton style={{ marginRight: '10px' }} onClick={() => setShowContextModal(true)}>
              Show agent request details
            </EuiButton>
          )}
          {!taskLoaded || !taskFinished ? (
            <EuiLoadingContent />
          ) : (
            <EuiButton
              isLoading={loadingSteps}
              onClick={async () => {
                if (!task) {
                  return;
                }
                if (traces.length > 0) {
                  setTracesVisible((flag) => !flag);
                  return;
                }
                setLoadingSteps(true);
                try {
                  const parentInteractionId = extractParentInteractionId(task);
                  const executorMemoryId = extractExecutorMemoryId(task);
                  await Promise.allSettled([
                    parentInteractionId
                      ? getAllTracesByMessageId({
                          messageId: parentInteractionId,
                          http,
                          dataSourceId,
                        })
                      : Promise.resolve([]),
                    executorMemoryId
                      ? getAllMessagesByMemoryId({
                          memoryId: executorMemoryId,
                          http,
                          dataSourceId,
                        })
                      : Promise.resolve([]),
                  ]).then(([{ value: loadedTraces }, { value: loadedExecutorMessages }]) => {
                    setTraces(loadedTraces);
                    setExecutorMessages(loadedExecutorMessages);
                  });
                } finally {
                  setLoadingSteps(false);
                }
                setTracesVisible((flag) => !flag);
              }}
            >
              {tracesVisible ? 'Hide traces' : 'Show traces'}
            </EuiButton>
          )}
        </>
      )}
      {traceModalData && (
        <MessageTraceModal
          messageId={traceModalData.messageId}
          messageCreateTime={traceModalData.messageCreateTime}
          refresh={shouldTracesModalRefresh()}
          closeModal={() => {
            setTraceModalData(undefined);
          }}
          dataSourceId={dataSourceId}
        />
      )}
      {/* FIXME this is used for debug */}
      {showContextModal && (
        <EuiModal onClose={() => setShowContextModal(false)}>
          <EuiModalHeader>Context</EuiModalHeader>
          <EuiModalBody>
            <EuiTabbedContent
              tabs={[
                ...(input?.PERAgentInput
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
    </div>
  );
};
