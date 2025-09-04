/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiLoadingContent,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import moment from 'moment';
import MarkdownRender from '@nteract/markdown';
import { useObservable } from 'react-use';

import { getTimeGapFromDates } from '../../../../../utils/time';
import { PERAgentMemoryService } from './services/per_agent_memory_service';
import { PERAgentMessageService } from './services/per_agent_message_service';

export const StepDetailsModal = ({
  closeModal,
  messageService,
  onStepExplain,
  defaultExpandMessageId,
  executorMemoryService,
}: {
  onStepExplain: (messageId: string) => void;
  closeModal: () => void;
  defaultExpandMessageId?: string;
  messageService: PERAgentMessageService;
  executorMemoryService: PERAgentMemoryService;
}) => {
  const titleRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const scrollLock = useRef(false);
  const observables = useMemo(
    () => ({
      executorMessage$: executorMemoryService.getMessages$(),
      messagePollingState$: executorMemoryService.getPollingState$(),
      message$: messageService.getMessage$(),
    }),
    [executorMemoryService, messageService]
  );
  const steps = useObservable(observables.executorMessage$);
  const loadingSteps = useObservable(observables.messagePollingState$);
  const message = useObservable(observables.message$);
  const messageCreateTime = message?.create_time;

  useEffect(() => {
    const stopPolling = executorMemoryService.startPolling();
    return () => {
      stopPolling?.();
    };
  }, [executorMemoryService]);

  useEffect(() => {
    if (!defaultExpandMessageId || scrollLock.current) {
      return;
    }
    if (steps?.find((step) => step.message_id === defaultExpandMessageId)) {
      titleRefs.current[defaultExpandMessageId]?.scrollIntoView();
      scrollLock.current = true;
    }
  }, [defaultExpandMessageId, steps]);

  const renderSteps = () => {
    if (!loadingSteps && steps?.length === 0) {
      return <>No steps</>;
    }
    return steps.map(
      ({ input: stepInput, response, message_id: messageId, create_time: createTime }, index) => {
        let durationStr = '';
        if (steps[index - 1]) {
          durationStr = getTimeGapFromDates(
            moment(steps[index - 1].create_time),
            moment(createTime)
          );
        } else if (messageCreateTime) {
          durationStr = getTimeGapFromDates(moment(messageCreateTime), moment(createTime));
        }

        return (
          <React.Fragment key={messageId}>
            <EuiPanel paddingSize="s" borderRadius="m" hasBorder>
              <EuiAccordion
                id={`trace-${index}`}
                buttonContent={
                  <div
                    ref={(element) => {
                      titleRefs.current = { ...titleRefs.current, [messageId]: element };
                    }}
                  >
                    Step {index + 1}
                    {!response ? '(No response)' : ''} - {stepInput}
                    {durationStr ? `(Duration: ${durationStr})` : ''}
                  </div>
                }
                paddingSize="l"
                initialIsOpen={defaultExpandMessageId === messageId}
              >
                {response && (
                  <EuiText className="markdown-output-text" size="s">
                    <MarkdownRender source={response} />
                  </EuiText>
                )}
                <EuiButton
                  onClick={() => {
                    onStepExplain(messageId);
                  }}
                >
                  Explain this step
                </EuiButton>
              </EuiAccordion>
            </EuiPanel>
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
          <h1>Investigation steps</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {message && renderSteps()}
        {(!message || loadingSteps) && <EuiLoadingContent />}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
