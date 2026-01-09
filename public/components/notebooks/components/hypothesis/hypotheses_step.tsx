/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiLoadingContent,
  EuiText,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiIcon,
  EuiSmallButtonEmpty,
  EuiLoadingSpinner,
  EuiAccordion,
  EuiMarkdownFormat,
  EuiEmptyPrompt,
  EuiSmallButton,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { isMarkdownText } from './investigation/utils';
import { PERAgentMessageService } from './investigation/services/per_agent_message_service';
import { PERAgentMemoryService } from './investigation/services/per_agent_memory_service';

interface Props {
  isInvestigating: boolean;
  messageService: PERAgentMessageService;
  executorMemoryService: PERAgentMemoryService;
  onExplainThisStep: (messageId: string) => void;
}

export const HypothesesStep = ({
  messageService,
  executorMemoryService,
  onExplainThisStep,
  isInvestigating,
}: Props) => {
  const observables = useMemo(
    () => ({
      executorMessages$: executorMemoryService.getMessages$(),
      executorError$: executorMemoryService.getError$(),
      messagePollingState$: executorMemoryService.getPollingState$(),
    }),
    [executorMemoryService]
  );
  const message = messageService.getMessageValue();
  const executorError = useObservable(observables.executorError$);
  const executorMessages = useObservable(observables.executorMessages$);
  const loadingExecutorMessage = useObservable(observables.messagePollingState$);

  const renderTraces = () => {
    if (executorError) {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h3>Failed to load investigation steps</h3>}
            body={<EuiText size="s">{executorError}</EuiText>}
            actions={
              <EuiSmallButton color="primary" fill onClick={() => executorMemoryService.retry()}>
                Retry
              </EuiSmallButton>
            }
          />
        </>
      );
    }
    return (
      <>
        <EuiSpacer size="s" />
        {(isInvestigating ? !!message : true) &&
          !loadingExecutorMessage &&
          (!executorMessages || executorMessages.length === 0) && (
            <EuiText>No steps performed</EuiText>
          )}
        {!!executorMessages &&
          executorMessages.map((executorMessage, index) => {
            const isLastMessageLoading =
              index === executorMessages.length - 1 &&
              !executorMessage.response &&
              (isInvestigating ? !message : false);
            return (
              <React.Fragment key={executorMessage.message_id}>
                <EuiPanel paddingSize="s" borderRadius="l" hasBorder>
                  <EuiAccordion
                    id={executorMessage.message_id}
                    arrowDisplay="right"
                    extraAction={
                      <EuiSmallButtonEmpty
                        iconSide="right"
                        onClick={() => {
                          onExplainThisStep(executorMessage.message_id);
                        }}
                      >
                        Explain this step
                      </EuiSmallButtonEmpty>
                    }
                    buttonContent={
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        style={{ overflow: 'hidden' }}
                      >
                        <EuiFlexItem grow={false}>
                          {isLastMessageLoading ? (
                            <EuiLoadingSpinner size="m" />
                          ) : (
                            <EuiIcon color="success" type="checkInCircleEmpty" />
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">{executorMessage.input}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                    paddingSize={isLastMessageLoading ? 'l' : 'none'}
                  >
                    {isLastMessageLoading ? (
                      <EuiLoadingContent />
                    ) : (
                      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
                        <EuiText className="markdown-output-text" size="s">
                          {isMarkdownText(executorMessage.response) ? (
                            <EuiMarkdownFormat>{executorMessage.response}</EuiMarkdownFormat>
                          ) : (
                            executorMessage.response
                          )}
                        </EuiText>
                      </EuiPanel>
                    )}
                  </EuiAccordion>
                </EuiPanel>
                <EuiSpacer size="s" />
              </React.Fragment>
            );
          })}
        {!!executorMessages && executorMessages.length > 0 && <EuiSpacer size="s" />}
      </>
    );
  };

  useEffect(() => {
    const stopPolling = executorMemoryService.startPolling();
    return () => {
      stopPolling?.();
    };
  }, [executorMemoryService]);

  return (
    <>
      {renderTraces()}
      {(loadingExecutorMessage || (isInvestigating && !message)) && !executorError && (
        <EuiLoadingContent />
      )}
    </>
  );
};
