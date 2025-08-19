/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import MarkdownRender from '@nteract/markdown';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiModalHeaderTitle,
  EuiAccordion,
  EuiText,
  EuiSpacer,
  EuiLoadingContent,
  EuiCodeBlock,
  EuiErrorBoundary,
} from '@elastic/eui';
import type { NoteBookServices } from 'public/types';

import { getTimeGapFromDates } from '../../../../../utils/time';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';

import { getAllTracesByMessageId, isMarkdownText } from './utils';

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

export const MessageTraceModal = ({
  messageId,
  messageCreateTime,
  closeModal,
  dataSourceId,
  refresh,
}: {
  messageId: string;
  messageCreateTime: string;
  closeModal: () => void;
  dataSourceId?: string;
  refresh: boolean;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [traces, setTraces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const abortController = new AbortController();
    let canceled = false;
    const fetchAllTraces = async () => {
      try {
        if (!canceled) {
          setIsLoading(true);
        }
        const messageTraces = await getAllTracesByMessageId({
          http,
          messageId,
          signal: abortController.signal,
          dataSourceId,
        });

        if (!canceled) {
          setTraces(messageTraces);
        }
      } finally {
        if (!refresh) {
          setIsLoading(false);
        }
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      if (!canceled && refresh) {
        fetchAllTraces();
      }
    };
    fetchAllTraces();
    return () => {
      abortController.abort();
      canceled = true;
    };
  }, [messageId, refresh, http, dataSourceId]);

  const renderTraces = () => {
    if (!isLoading && traces.length === 0) {
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
        if (isFromLLM) {
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
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>Message trace</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {renderTraces()}
        {isLoading && <EuiLoadingContent />}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
