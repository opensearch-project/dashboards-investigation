/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import {
  EuiAccordion,
  EuiText,
  EuiSpacer,
  EuiLoadingContent,
  EuiCodeBlock,
  EuiErrorBoundary,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiMarkdownFormat,
  EuiEmptyPrompt,
  EuiSmallButton,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { timer } from 'rxjs';
import { concatMap, delay, retryWhen, scan, timeout } from 'rxjs/operators';
import type { NoteBookServices } from 'public/types';

import { getTimeGapFromDates } from '../../../../../utils/time';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';

import { getAllTracesMessages, isMarkdownText } from './utils';
import { PERAgentMemoryService } from './services/per_agent_memory_service';
import { PERAgentMessageService } from './services/per_agent_message_service';

const renderTraceString = ({ text, fallback }: { text?: string; fallback: string }) => {
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);
    return (
      <EuiErrorBoundary>
        <EuiCodeBlock {...(text.length < 100000 ? { language: 'json' } : {})} isCopyable>
          {JSON.stringify(json, null, 2)}
        </EuiCodeBlock>
      </EuiErrorBoundary>
    );
  } catch {
    return isMarkdownText(text) ? (
      <EuiMarkdownFormat>{text}</EuiMarkdownFormat>
    ) : (
      <EuiCodeBlock isCopyable>{text}</EuiCodeBlock>
    );
  }
};

export const MessageTraceFlyout = ({
  messageId,
  dataSourceId,
  onClose,
  messageService,
  executorMemoryService,
  currentExecutorMemoryId,
  memoryContainerId,
}: {
  messageId: string;
  dataSourceId?: string;
  onClose: () => void;
  messageService: PERAgentMessageService;
  executorMemoryService: PERAgentMemoryService;
  currentExecutorMemoryId: string;
  memoryContainerId: string;
}) => {
  const {
    services: { http, overlays, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [traces, setTraces] = useState<any[]>([]);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [paddingRight, setPaddingRight] = useState('0px');

  useEffect(() => {
    const subscription = overlays.sidecar.getSidecarConfig$().subscribe((config) => {
      if (config?.dockedMode === 'right') {
        setPaddingRight(`${config.paddingSize}px`);
      } else {
        setPaddingRight('0px');
      }
    });
    return () => subscription.unsubscribe();
  }, [overlays]);

  const message = messageService.getMessageValue();
  const messages = useObservable(executorMemoryService.getMessages$());
  const messageIndex = messages?.findIndex((item) => item.message_id === messageId) ?? -1;

  const traceMessage = messages?.[messageIndex];
  const messageCreateTime = traceMessage?.create_time;
  const isLastMessage = messageIndex !== -1 && messageIndex + 1 === messages?.length;

  const shouldLoad = useMemo(() => {
    if (traces.length === 0) {
      return true;
    } else if (!isLastMessage) {
      return false;
    } else if (!traceMessage?.response) {
      return true;
    }
    return !message;
  }, [isLastMessage, traceMessage?.response, message, traces]);

  const shouldStartPolling = useMemo(() => shouldLoad || retryKey > 0, [shouldLoad, retryKey]);

  const tracesLengthRef = useRef(traces.length);
  tracesLengthRef.current = traces.length;

  useEffect(() => {
    if (!shouldStartPolling) return;

    const abortController = new AbortController();
    const subscription = timer(0, 5000)
      .pipe(
        concatMap(() =>
          getAllTracesMessages({
            http,
            messageId,
            memoryContainerId,
            executorMemoryId: currentExecutorMemoryId,
            signal: abortController.signal,
            dataSourceId,
            nextToken: tracesLengthRef.current,
          })
        ),
        timeout(20 * 1000),
        retryWhen((errors) =>
          errors.pipe(
            delay(5000),
            scan((retryCount, err) => {
              if (retryCount >= 2) {
                throw err;
              }
              return retryCount + 1;
            }, 0)
          )
        )
      )
      .subscribe({
        next: (newTraces) => {
          setTraces((prev) => [...prev, ...newTraces]);
        },
        error: (err) => {
          if (err.name !== 'AbortError') {
            const errorMessage = err.body?.message || err?.message || 'Unknown error occurred';
            setTraceError(errorMessage);
            notifications.toasts.addDanger({
              title: 'Failed to load trace data',
              text: errorMessage,
            });
          }
        },
      });
    return () => {
      abortController.abort('Flyout unmount.');
      subscription.unsubscribe();
    };
  }, [
    messageId,
    shouldLoad,
    http,
    dataSourceId,
    currentExecutorMemoryId,
    memoryContainerId,
    retryKey,
    notifications.toasts,
    shouldStartPolling,
  ]);

  const handleRetry = () => {
    setTraceError(null);
    setTraces([]);
    setRetryKey((k) => k + 1);
  };

  const processedTraces = useMemo(() => {
    return traces.map((trace, index) => {
      const { input, response, origin, create_time: createTime } = trace;
      const isFromLLM = origin?.toLowerCase() === 'llm';

      let durationStr = '';
      const prevTime = traces[index - 1]?.create_time ?? messageCreateTime;

      if (prevTime) {
        durationStr = getTimeGapFromDates(moment(prevTime), moment(createTime));
      }

      let responseJson: any;
      let reason = input;

      if (isFromLLM && typeof response === 'string' && response.trim().startsWith('{')) {
        try {
          responseJson = JSON.parse(response);
          if (
            responseJson?.stopReason === 'tool_use' &&
            responseJson?.output?.message?.content?.[0]?.text
          ) {
            reason = responseJson.output.message.content[0].text;
          }
        } catch (err) {
          console.error(err);
        }
      }

      return {
        ...trace,
        isFromLLM,
        durationStr,
        reason,
        responseJson,
      };
    });
  }, [traces, messageCreateTime]);

  const renderTraces = () => {
    if (traceError) {
      return (
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={<h3>Failed to load trace data</h3>}
          body={<EuiText>{traceError}</EuiText>}
          actions={
            <EuiSmallButton color="primary" fill onClick={handleRetry}>
              Retry
            </EuiSmallButton>
          }
        />
      );
    }

    if (!shouldLoad && traces.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="editorStrike"
          title={<h3>No trace data</h3>}
          body={<EuiText>No trace information available for this step.</EuiText>}
        />
      );
    }

    return processedTraces.map(
      (
        {
          input,
          response,
          trace_number: traceNumber,
          origin,
          isFromLLM,
          reason,
          durationStr,
          responseJson,
        },
        index
      ) => {
        return (
          <React.Fragment key={traceNumber}>
            <EuiAccordion
              id={`trace-${index}`}
              buttonContent={`Step ${index + 1} - ${isFromLLM ? reason : `Execute ${origin}`} ${
                durationStr ? `Duration (${durationStr})` : ''
              }`}
              paddingSize="l"
            >
              <EuiText className="markdown-output-text" size="s">
                {isFromLLM ? (
                  renderTraceString({
                    text: responseJson?.output?.message?.content
                      ? JSON.stringify(responseJson.output.message.content)
                      : response,
                    fallback: 'No response',
                  })
                ) : (
                  <>
                    <EuiAccordion
                      id={`trace-step-${index}-input`}
                      buttonContent={`${origin} input`}
                      initialIsOpen
                    >
                      {renderTraceString({ text: input, fallback: 'No input' })}
                    </EuiAccordion>
                    <EuiAccordion
                      id={`trace-step-${index}-response`}
                      buttonContent={`${origin} response`}
                      initialIsOpen={!response}
                    >
                      {renderTraceString({ text: response, fallback: 'No response' })}
                    </EuiAccordion>
                  </>
                )}
              </EuiText>
            </EuiAccordion>
            <EuiSpacer />
          </React.Fragment>
        );
      }
    );
  };

  return (
    <EuiFlyout onClose={onClose} style={{ marginRight: paddingRight }}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Step trace</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {renderTraces()}
        {shouldLoad && !traceError && <EuiLoadingContent />}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
