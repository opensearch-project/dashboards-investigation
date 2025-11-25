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
  EuiIcon,
  EuiSmallButtonEmpty,
  EuiLoadingSpinner,
  EuiAccordion,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { isMarkdownText } from './investigation/utils';
import { PERAgentMessageService } from './investigation/services/per_agent_message_service';
import { PERAgentMemoryService } from './investigation/services/per_agent_memory_service';

interface Props {
  messageService: PERAgentMessageService;
  executorMemoryService: PERAgentMemoryService;
  onExplainThisStep: (messageId: string) => void;
}

export const HypothesesStep = ({
  messageService,
  executorMemoryService,
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
    return (
      <>
        <EuiSpacer size="s" />
        {!!message?.hits?.hits?.[0]?._source?.structured_data?.response &&
          !loadingExecutorMessage &&
          (!executorMessages || executorMessages.length === 0) && (
            <EuiText>No steps performed</EuiText>
          )}
        {!!executorMessages &&
          executorMessages.map((executorMessage, index) => {
            const isLastMessageLoading =
              index === executorMessages.length - 1 &&
              !executorMessage.response &&
              !message?.hits?.hits?.[0]?._source?.structured_data?.response;
            return (
              <>
                <EuiPanel
                  key={executorMessage.message_id}
                  paddingSize="s"
                  borderRadius="l"
                  hasBorder
                >
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
                            <MarkdownRender source={executorMessage.response} />
                          ) : (
                            executorMessage.response
                          )}
                        </EuiText>
                      </EuiPanel>
                    )}
                  </EuiAccordion>
                </EuiPanel>
                <EuiSpacer size="s" />
              </>
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
      {/* {(loadingExecutorMessage || !message || !message.response) && <EuiLoadingContent />} */}
    </>
  );
};
