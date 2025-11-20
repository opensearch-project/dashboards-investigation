/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import MarkdownRender from '@nteract/markdown';
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
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { timer } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type { NoteBookServices } from 'public/types';

import { getTimeGapFromDates } from '../../../../../utils/time';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';

import { getAllTracesMessages, isMarkdownText } from './utils';
import { PERAgentMemoryService } from './services/per_agent_memory_service';
import { PERAgentMessageService } from './services/per_agent_message_service';

const renderTraceString = ({ text, fallback }: { text: string | undefined; fallback: string }) => {
  if (!text) {
    return fallback;
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  if (json) {
    return (
      <EuiErrorBoundary>
        <EuiCodeBlock {...(text.length < 100000 ? { language: 'json' } : {})} isCopyable>
          {JSON.stringify(json, null, 2)}
        </EuiCodeBlock>
      </EuiErrorBoundary>
    );
  }

  return isMarkdownText(text) ? (
    <MarkdownRender source={text} />
  ) : (
    <EuiCodeBlock isCopyable>{text}</EuiCodeBlock>
  );
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
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [traces, setTraces] = useState([]);
  const tracesLengthRef = useRef(traces.length);
  tracesLengthRef.current = traces.length;
  const observables = useMemo(
    () => ({
      message$: messageService.getMessage$(),
      executorMessages$: executorMemoryService.getMessages$(),
    }),
    [messageService, executorMemoryService]
  );
  const message = useObservable(observables.message$);
  const messages = useObservable(observables.executorMessages$);
  const messageIndex = messages?.findIndex((item) => item.message_id === messageId) ?? -1;
  const traceMessage = messages?.[messageIndex];
  const messageCreateTime = traceMessage?.create_time;
  const isLastMessage = messageIndex !== -1 && messageIndex + 1 === messages?.length;

  const shouldLoad = useMemo(() => {
    if (traces.length === 0) {
      return true;
    }

    if (!isLastMessage) {
      return false;
    }

    if (!traceMessage?.response) {
      return true;
    }
    return !message?.hits?.hits?.[0]?._source?.structured_data?.response;
  }, [isLastMessage, traceMessage?.response, message, traces]);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

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
        )
      )
      .subscribe((messageTraces) => {
        setTraces((prevTraces) => [...prevTraces, ...messageTraces]);
      });
    return () => {
      abortController.abort('Flyout unmount.');
      subscription.unsubscribe();
    };
  }, [messageId, shouldLoad, http, dataSourceId, currentExecutorMemoryId, memoryContainerId]);

  const renderTraces = () => {
    if (!shouldLoad && traces.length === 0) {
      return (
        <EuiText className="markdown-output-text" size="s">
          No traces data.
        </EuiText>
      );
    }
    return traces.map(
      (
        { input, response, message_id: traceMessageId, origin, create_time: traceCreateTime },
        index
      ) => {
        const isFromLLM = origin?.toLowerCase() === 'llm';
        let durationStr = '';
        if (traces[index - 1]) {
          durationStr = getTimeGapFromDates(
            moment(traces[index - 1].create_time),
            moment(traceCreateTime)
          );
        } else if (messageCreateTime) {
          durationStr = getTimeGapFromDates(moment(messageCreateTime), moment(traceCreateTime));
        }
        let reason: string = input;
        let responseJson;
        if (isFromLLM && /^\s*\{/.test(response)) {
          try {
            responseJson = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse json', e);
          }
          if (
            responseJson?.stopReason === 'tool_use' &&
            responseJson?.output?.message?.content?.[0].text
          ) {
            reason = responseJson.output.message.content[0].text;
          }
        }
        return (
          <React.Fragment key={traceMessageId}>
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
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Step trace</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {renderTraces()}
        {shouldLoad && <EuiLoadingContent />}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
