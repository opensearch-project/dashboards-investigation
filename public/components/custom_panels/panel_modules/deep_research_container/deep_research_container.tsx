/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownRender from '@nteract/markdown';
import { EuiButton, EuiLoadingContent, EuiText, EuiAccordion, EuiSpacer, EuiModal, EuiModalHeader, EuiModalBody } from '@elastic/eui';
import { interval, Observable } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import { CoreStart } from '../../../../../../../src/core/public';
import { ParaType } from '../../../../../common/types/notebooks';

import { getAllMessagesByMemoryId, getAllTracesByMessageId, isMarkdownText } from './utils';
import { MessageTraceModal } from './message_trace_modal';
import { parseParagraphOut } from '../../../../utils/paragraph';
import { isStateCompletedOrFailed } from '../../../../utils/task';
import { ParagraphStateValue } from 'common/state/paragraph_state';
import { useObservable } from 'react-use';

interface Props {
  http: CoreStart['http'];
  para: ParaType;
  paragraph$: Observable<ParagraphStateValue>
}

export const DeepResearchContainer = ({ para, http, paragraph$ }: Props) => {
  const [traces, setTraces] = useState([]);
  const parsedParagraphOut = useMemo(() => parseParagraphOut(para)[0], [para]);
  const [isLoading, setIsLoading] = useState(isStateCompletedOrFailed(parsedParagraphOut.state));
  const [tracesVisible, setTracesVisible] = useState(!isStateCompletedOrFailed(parseParagraphOut));
  const [executorMessages, setExecutorMessages] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [traceModalData, setTraceModalData] = useState<{
    messageId: string;
    refresh: boolean;
  }>();
  const initialFinalResponseVisible = useRef(false);
  const parsedParagraphOutRef = useRef(parsedParagraphOut);
  parsedParagraphOutRef.current = parsedParagraphOut;
  const dataSourceIdRef = useRef(para.dataSourceMDSId);
  dataSourceIdRef.current = para.dataSourceMDSId;
  const paragraph = useObservable(paragraph$);

  const finalMessage = useMemo(() => {
    if (!parsedParagraphOut) {
      return '';
    }
    const { state, text_response: textResponse } = parsedParagraphOut;
    if (state === 'COMPLETED') {
      return textResponse ?? 'Task was completed, but failed to load inference result.';
    }

    if (state === 'FAILED') {
      return `Failed to execute task, reason: ${textResponse}`.trim();
    }
    return '';
  }, [parsedParagraphOut]);

  useEffect(() => {
    setIsLoading(!isStateCompletedOrFailed(parsedParagraphOut.state));
  }, [parsedParagraphOut]);

  useEffect(() => {
    if (isStateCompletedOrFailed(parsedParagraphOut.state)) {
      setTracesVisible(false);
      return;
    }
    const abortController = new AbortController();
    const subscription = interval(5000)
      .pipe(
        switchMap(() => {
          const {
            parent_interaction_id: parentInteractionId,
            executor_memory_id: executorMemoryId,
          } = parsedParagraphOut;

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
      .pipe(
        takeWhile(() => {
          return !isStateCompletedOrFailed(parsedParagraphOut.state);
        }, true)
      )
      .subscribe(([{ value: loadedTraces }, { value: loadedExecutorMessages }]) => {
        setTraces(loadedTraces);
        setExecutorMessages(loadedExecutorMessages);
      });

    return () => {
      subscription.unsubscribe();
      abortController.abort('DeepResearchContainer unmount.');
    };
  }, [parsedParagraphOut.state, http]);

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
      {paragraph?.output && <EuiButton onClick={() => setShowContextModal(true)}>Show context</EuiButton>}
      {isLoading ? (
        <EuiLoadingContent />
      ) : (
        <EuiButton
          isLoading={loadingSteps}
          onClick={async () => {
            if (!parsedParagraphOut) {
              return;
            }
            if (traces.length > 0) {
              setTracesVisible((flag) => !flag);
              return;
            }
            setLoadingSteps(true);
            try {
              const {
                parent_interaction_id: parentInteractionId,
                executor_memory_id: executorMemoryId,
              } = parsedParagraphOut;
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
      {
        showContextModal && (
          <EuiModal onClose={() => setShowContextModal(false)}>
            <EuiModalHeader>Context</EuiModalHeader>
            <EuiModalBody>
              {paragraph?.input.PERAgentContext || 'No context'}
            </EuiModalBody>
          </EuiModal>
        )
      }
    </div>
  );
};
