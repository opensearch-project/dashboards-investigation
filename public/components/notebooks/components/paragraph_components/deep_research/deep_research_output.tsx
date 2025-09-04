/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo } from 'react';
import MarkdownRender from '@nteract/markdown';
import {
  EuiLoadingContent,
  EuiText,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiAvatar,
  EuiTitle,
  EuiIcon,
  EuiSmallButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import moment from 'moment';

import { isMarkdownText } from './utils';
import { PERAgentMemoryService } from './services/per_agent_memory_service';
import { PERAgentMessageService } from './services/per_agent_message_service';

interface Props {
  messageService: PERAgentMessageService;
  executorMemoryService: PERAgentMemoryService;
  showSteps?: boolean;
  onViewDetails: (messageId: string) => void;
  onExplainThisStep: (messageId: string) => void;
}

export const DeepResearchOutput = ({
  messageService,
  executorMemoryService,
  showSteps,
  onViewDetails,
  onExplainThisStep,
}: Props) => {
  const observables = useMemo(
    () => ({
      executorMessages$: executorMemoryService.getMessages$(),
      messagePollingState$: executorMemoryService.getPollingState$(),
      message$: messageService.getMessage$(),
    }),
    [executorMemoryService, messageService]
  );
  const message = useObservable(observables.message$);
  const executorMessages = useObservable(observables.executorMessages$);
  const loadingExecutorMessage = useObservable(observables.messagePollingState$);

  const renderTraces = () => {
    if (!showSteps) {
      return null;
    }
    return (
      <>
        <EuiTitle size="m">
          <h4>Steps performed</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {!!message?.response &&
          !loadingExecutorMessage &&
          (!executorMessages || executorMessages.length === 0) && (
            <EuiText>No steps performed</EuiText>
          )}
        {!!executorMessages &&
          executorMessages.map((executorMessage, index) => {
            const isLastMessageLoading =
              index === executorMessages.length - 1 &&
              !executorMessage.response &&
              !message.response;
            return (
              <>
                <EuiPanel
                  key={executorMessage.message_id}
                  paddingSize="s"
                  borderRadius="l"
                  hasBorder
                >
                  <EuiFlexGroup style={{ overflow: 'hidden' }} alignItems="center">
                    <EuiFlexItem grow={false}>
                      {isLastMessageLoading ? (
                        <EuiLoadingSpinner />
                      ) : (
                        <EuiIcon type="checkInCircleEmpty" color="success" />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiText size="s">{executorMessage.input}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSmallButtonEmpty
                        iconSide="right"
                        onClick={() => {
                          onViewDetails(executorMessage.message_id);
                        }}
                      >
                        View details
                      </EuiSmallButtonEmpty>
                      <EuiSmallButtonEmpty
                        iconSide="right"
                        onClick={() => {
                          onExplainThisStep(executorMessage.message_id);
                        }}
                      >
                        Explain this step
                      </EuiSmallButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="s" />
              </>
            );
          })}
      </>
    );
  };

  useEffect(() => {
    if (!showSteps) {
      return;
    }
    const stopPolling = executorMemoryService.startPolling();
    return () => {
      stopPolling?.();
    };
  }, [executorMemoryService, showSteps]);

  return (
    <>
      {renderTraces()}
      {(loadingExecutorMessage || !message || !message.response) && <EuiLoadingContent />}
      {message?.response && (
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" style={{ overflow: 'hidden' }}>
          <EuiFlexItem grow={false} />
          <EuiFlexItem style={{ overflow: 'hidden' }}>
            <EuiPanel paddingSize="m" hasShadow={false} color="primary">
              <EuiText className="markdown-output-text" size="s">
                {isMarkdownText(message.response) ? (
                  <MarkdownRender source={message.response} />
                ) : (
                  message.response
                )}
              </EuiText>
              {message?.create_time && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    Created at: {moment(message.create_time).format()}
                  </EuiText>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiAvatar name="Agent" size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer />
    </>
  );
};
