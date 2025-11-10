/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingContent,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSmallButton,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useObservable } from 'react-use';
import { useHistory } from 'react-router-dom';

import { NoteBookServices } from 'public/types';
import { BehaviorSubject } from 'rxjs';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { HypothesisItem } from './hypothesis_item';
import { HypothesesFeedback } from './hypotheses_feedback';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { PERAgentMessageService } from '../paragraph_components/deep_research/services/per_agent_message_service';
import { PERAgentMemoryService } from '../paragraph_components/deep_research/services/per_agent_memory_service';
import { HypothesesStep } from './hypotheses_step';
import { MessageTraceFlyout } from '../paragraph_components/deep_research/message_trace_flyout';
import { HypothesisBadge } from './hypothesis_badge';

interface HypothesesPanelProps {
  notebookId: string;
  question?: string;
  isInvestigating: boolean;
  addNewFinding: (newFinding: { hypothesisIndex: number; text: string }) => Promise<void>;
  openReinvestigateModal: () => void;
}

export const HypothesesPanel: React.FC<HypothesesPanelProps> = ({
  notebookId,
  question,
  isInvestigating,
  addNewFinding,
  openReinvestigateModal,
}) => {
  const {
    services: { appName, usageCollection, http },
  } = useOpenSearchDashboards<NoteBookServices>();

  const notebookContext = useContext(NotebookReactContext);
  const {
    hypotheses,
    context,
    memoryContainerId,
    currentExecutorMemoryId,
    currentParentInteractionId,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);
  const history = useHistory();
  const [showSteps, setShowSteps] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();

  const PERAgentServices = useMemo(() => {
    if (!currentExecutorMemoryId || !memoryContainerId) {
      return null;
    }

    const executorMemoryId$ = new BehaviorSubject(currentExecutorMemoryId);
    const messageService = new PERAgentMessageService(http, memoryContainerId);

    const executorMemoryService = new PERAgentMemoryService(
      http,
      executorMemoryId$,
      () => {
        return !messageService.getMessageValue()?.hits?.hits?.[0]?._source?.structured_data
          ?.response;
      },
      memoryContainerId
    );

    return {
      message: messageService,
      executorMemory: executorMemoryService,
    };
  }, [http, memoryContainerId, currentExecutorMemoryId]);

  useEffect(() => {
    if (isInvestigating) {
      setShowSteps(true);
    } else {
      setShowSteps(false);
    }
  }, [isInvestigating]);

  useEffect(() => {
    if (PERAgentServices && currentParentInteractionId) {
      PERAgentServices.message.setup({
        messageId: currentParentInteractionId,
        dataSourceId: context.value.dataSourceId,
      });

      PERAgentServices.executorMemory.setup({
        dataSourceId: context.value.dataSourceId,
      });

      return () => {
        PERAgentServices.message.stop('Component cleanup');
        PERAgentServices.executorMemory.stop('Component unmount');
      };
    }
  }, [PERAgentServices, context.value.dataSourceId, currentParentInteractionId]);

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  // State for the Add Finding modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [findingText, setFindingText] = useState('%md Please add your finding here');
  const [currentHypothesisIndex, setCurrentHypothesisIndex] = useState<number | null>(null);

  const closeModal = () => {
    setIsModalVisible(false);
    setFindingText('%md Please add your finding here');
    setCurrentHypothesisIndex(null);
  };

  const showModal = (index: number) => {
    setCurrentHypothesisIndex(index);
    setIsModalVisible(true);
  };

  const handleAddFinding = async () => {
    if (currentHypothesisIndex === null || !hypotheses) return;

    await addNewFinding({ hypothesisIndex: currentHypothesisIndex, text: findingText });

    closeModal();
  };

  if (!question) {
    return null;
  }

  const investigationSteps = PERAgentServices && (
    <EuiAccordion
      id="investigation-steps"
      buttonContent="Investigation Steps"
      forceState={showSteps ? 'open' : 'closed'}
      onToggle={(isOpen) => {
        setShowSteps(isOpen);
      }}
    >
      <HypothesesStep
        messageService={PERAgentServices.message}
        executorMemoryService={PERAgentServices.executorMemory}
        onExplainThisStep={setTraceMessageId}
      />
    </EuiAccordion>
  );

  return (
    <>
      <EuiPanel>
        <EuiAccordion
          id="hypotheses"
          buttonContent={
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>Hypotheses</EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isInvestigating ? (
                  <HypothesisBadge label="Under investigation" color="hollow" icon="pulse" />
                ) : (
                  <HypothesisBadge label="Investigation completed" color="hollow" icon="check" />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          arrowDisplay="right"
          initialIsOpen
        >
          {isInvestigating ? (
            <>
              <EuiLoadingContent />
            </>
          ) : (
            hypotheses?.map((hypothesis, index) => {
              return (
                <EuiFlexGroup alignItems="center" gutterSize="none">
                  <HypothesisItem
                    index={index}
                    hypothesis={hypothesis}
                    onClickHypothesis={handleClickHypothesis}
                  />
                  <EuiFlexGroup justifyContent="flexEnd" direction="row">
                    <EuiFlexItem grow={false}>
                      <EuiSmallButton disabled={isInvestigating} onClick={() => showModal(index)}>
                        Add Finding
                      </EuiSmallButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexGroup>
              );
            })
          )}
          {investigationSteps}
        </EuiAccordion>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexGroup dir="row" alignItems="center" gutterSize="none" style={{ gap: 8 }}>
            <EuiIcon type="" />
            <EuiText size="s" color="subdued">
              AI Agent continuously evaluates and ranks hypotheses based on evidence
            </EuiText>
          </EuiFlexGroup>
          {hypotheses?.length && !isInvestigating ? (
            <HypothesesFeedback
              appName={appName}
              usageCollection={usageCollection}
              openReinvestigateModal={openReinvestigateModal}
            />
          ) : null}
        </EuiFlexGroup>
      </EuiPanel>
      {/* Add Finding Modal */}
      {isModalVisible && (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Add Finding</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiTextArea
              fullWidth
              placeholder="Enter your finding here"
              value={findingText}
              onChange={(e) => setFindingText(e.target.value)}
              rows={5}
              aria-label="Add finding text area"
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>
            <EuiButton fill onClick={handleAddFinding}>
              Add
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      {traceMessageId && PERAgentServices && currentExecutorMemoryId && memoryContainerId && (
        <MessageTraceFlyout
          messageId={traceMessageId}
          messageService={PERAgentServices.message}
          executorMemoryService={PERAgentServices.executorMemory}
          onClose={() => {
            setTraceMessageId(undefined);
          }}
          dataSourceId={context.value.dataSourceId}
          currentExecutorMemoryId={currentExecutorMemoryId}
          memoryContainerId={memoryContainerId}
        />
      )}
    </>
  );
};
