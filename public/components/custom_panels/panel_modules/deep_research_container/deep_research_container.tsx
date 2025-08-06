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
import { interval, Observable, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import { ParagraphStateValue } from 'common/state/paragraph_state';
import { useObservable, useUpdateEffect } from 'react-use';
import { CoreStart } from '../../../../../../../src/core/public';
import { ParaType } from '../../../../../common/types/notebooks';

import { getAllMessagesByMemoryId, getAllTracesByMessageId, isMarkdownText } from './utils';
import { MessageTraceModal } from './message_trace_modal';
import { parseParagraphOut } from '../../../../utils/paragraph';
import {
  extractCompletedResponse,
  extractFailedErrorMessage,
  extractExecutorMemoryId,
  extractParentInteractionId,
  isStateCompletedOrFailed,
} from '../../../../utils/task';
import { getMLCommonsTask } from '../../../../utils/ml_commons_apis';

interface Props {
  http: CoreStart['http'];
  para: ParaType;
  paragraph$: Observable<ParagraphStateValue>;
}

export const DeepResearchContainer = ({ para, http, paragraph$ }: Props) => {
  const [traces, setTraces] = useState([]);
  // FIXME: Read paragraph out directly once all notebooks store object as output
  const parsedParagraphOut = useMemo(() => parseParagraphOut(para)[0], [para]);
  // FIXME: Remove legacy task_id support here
  const taskId = parsedParagraphOut.taskId ?? parsedParagraphOut.task_id;
  const [tracesVisible, setTracesVisible] = useState(false);
  const [executorMessages, setExecutorMessages] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [traceModalData, setTraceModalData] = useState<{
    messageId: string;
    refresh: boolean;
  }>();
  const [task, setTask] = useState();
  const initialFinalResponseVisible = useRef(false);
  const dataSourceIdRef = useRef(para.dataSourceMDSId);
  dataSourceIdRef.current = para.dataSourceMDSId;
  const paragraph = useObservable(paragraph$);
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
    const subscription = timer(0, 5000)
      .pipe(
        switchMap(() => {
          return getMLCommonsTask({
            http,
            taskId,
            dataSourceId: para.dataSourceMDSId,
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
  }, [taskId, para.dataSourceMDSId, http]);

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
                  dataSourceId: dataSourceIdRef.current,
                })
              : Promise.resolve([]),
            executorMemoryId
              ? getAllMessagesByMemoryId({
                  memoryId: executorMemoryId,
                  http,
                  signal: abortController.signal,
                  dataSourceId: dataSourceIdRef.current,
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
  }, [taskLoaded, taskFinished, http]);

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
    return (
      <>
        {[...traces, ...executorMessages.slice(traces.length)].map(
          ({ input, response, message_id: messageId }, index) => (
            <React.Fragment key={messageId}>
              <EuiAccordion
                id={`trace-${index}`}
                buttonContent={`Step ${index + 1}${!response ? '(No response)' : ''} - ${input}`}
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
                      });
                    }}
                  >
                    Explain this step
                  </EuiButton>
                )}
              </EuiAccordion>
              <EuiSpacer />
            </React.Fragment>
          )
        )}
      </>
    );
  };

  const shouldTracesModalRefresh = () => {
    if (!traceModalData || !traceModalData.refresh) {
      return false;
    }
    if (isStateCompletedOrFailed(parsedParagraphOut.state)) {
      return false;
    }
    const traceMessage = executorMessages.find(
      ({ message_id: messageId }) => messageId === traceModalData.messageId
    );
    return !traceMessage?.response;
  };

  return (
    <div>
      {tracesVisible && renderTraces()}
      {finalMessage && (
        <>
          <EuiAccordion
            id="final-response"
            buttonContent={<h3>Final response</h3>}
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
      {paragraph?.output && (
        <EuiButton style={{ marginRight: '10px' }} onClick={() => setShowContextModal(true)}>
          Show agent request details
        </EuiButton>
      )}
      {taskId && (!taskLoaded || !taskFinished) ? (
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
                      dataSourceId: dataSourceIdRef.current,
                    })
                  : Promise.resolve([]),
                executorMemoryId
                  ? getAllMessagesByMemoryId({
                      memoryId: executorMemoryId,
                      http,
                      dataSourceId: dataSourceIdRef.current,
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
      {traceModalData && (
        <MessageTraceModal
          messageId={traceModalData.messageId}
          refresh={shouldTracesModalRefresh()}
          http={http}
          closeModal={() => {
            setTraceModalData(undefined);
          }}
          dataSourceId={para.dataSourceMDSId}
        />
      )}
      {/* FIXME this is used for debug */}
      {showContextModal && (
        <EuiModal onClose={() => setShowContextModal(false)}>
          <EuiModalHeader>Context</EuiModalHeader>
          <EuiModalBody>
            <EuiTabbedContent
              tabs={[
                {
                  id: 'agentInput',
                  name: 'Agent input',
                  content: (
                    <>
                      <EuiMarkdownFormat>
                        {`\`\`\`json
${JSON.stringify(
  {
    ...paragraph?.input.PERAgentInput,
    body: JSON.parse(paragraph?.input.PERAgentInput.body),
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
                {
                  id: 'agentContext',
                  name: 'Agent context',
                  content: (
                    <>
                      <EuiMarkdownFormat>
                        {paragraph?.input.PERAgentContext || 'No context'}
                      </EuiMarkdownFormat>
                    </>
                  ),
                },
              ]}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </div>
  );
};
