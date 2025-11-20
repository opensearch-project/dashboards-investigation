/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useObservable } from 'react-use';
import { useHistory } from 'react-router-dom';

import { NoteBookServices } from 'public/types';
import { BehaviorSubject } from 'rxjs';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
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
  openReinvestigateModal: () => void;
}

export const HypothesesPanel: React.FC<HypothesesPanelProps> = ({
  notebookId,
  question,
  isInvestigating,
  openReinvestigateModal,
}) => {
  const {
    services: { appName, usageCollection, http },
  } = useOpenSearchDashboards<NoteBookServices>();

  const notebookContext = useContext(NotebookReactContext);
  const { hypotheses, context, runningMemory, historyMemory, investigationError } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const history = useHistory();
  const [showSteps, setShowSteps] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();
  const activeMemory = useMemo(() => {
    return isInvestigating ? runningMemory : historyMemory;
  }, [isInvestigating, runningMemory, historyMemory]);

  const PERAgentServices = useMemo(() => {
    if (!activeMemory?.executorMemoryId || !activeMemory?.memoryContainerId) {
      return null;
    }

    const executorMemoryId$ = new BehaviorSubject(activeMemory.executorMemoryId);
    const messageService = new PERAgentMessageService(http, activeMemory.memoryContainerId);

    const executorMemoryService = new PERAgentMemoryService(
      http,
      executorMemoryId$,
      () => {
        if (!isInvestigating && activeMemory) {
          return false;
        }
        return !messageService.getMessageValue()?.hits?.hits?.[0]?._source?.structured_data
          ?.response;
      },
      activeMemory.memoryContainerId
    );

    return {
      message: messageService,
      executorMemory: executorMemoryService,
    };
  }, [http, activeMemory, isInvestigating]);

  useEffect(() => {
    if (isInvestigating) {
      setShowSteps(true);
    } else {
      setShowSteps(false);
    }
  }, [isInvestigating]);

  useEffect(() => {
    if (PERAgentServices) {
      if (!activeMemory?.executorMemoryId || !activeMemory?.parentInteractionId) {
        return;
      }

      PERAgentServices.message.setup({
        messageId: activeMemory.parentInteractionId,
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
  }, [
    PERAgentServices,
    context.value.dataSourceId,
    activeMemory?.executorMemoryId,
    activeMemory?.parentInteractionId,
    isInvestigating,
  ]);

  const statusBadge = useMemo(() => {
    if (investigationError) {
      return (
        <HypothesisBadge
          label="Investigation failed and showing previous hypotheses"
          color={euiThemeVars.euiColorDanger}
          icon="cross"
        />
      );
    }

    if (isInvestigating || !historyMemory) {
      return (
        <HypothesisBadge
          label="Under investigation"
          color={euiThemeVars.euiColorPrimary}
          icon="pulse"
        />
      );
    }

    return (
      <HypothesisBadge
        label={hypotheses && hypotheses.length > 0 ? 'Investigation completed' : 'No hypotheses'}
        color={euiThemeVars.euiColorSuccess}
        icon="check"
      />
    );
  }, [investigationError, isInvestigating, historyMemory, hypotheses]);

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
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

  const renderHypothesesContent = () => {
    if (isInvestigating) {
      return <EuiLoadingContent lines={3} />;
    } else if (!hypotheses?.length) {
      return <EuiText>No hypotheses generated</EuiText>;
    }

    return hypotheses.map((hypothesis, index) => (
      <EuiFlexGroup key={`hypothesis-${hypothesis.id}`} alignItems="center" gutterSize="none">
        <HypothesisItem
          index={index}
          hypothesis={hypothesis}
          onClickHypothesis={handleClickHypothesis}
        />
      </EuiFlexGroup>
    ));
  };

  return (
    <>
      <EuiPanel>
        <EuiAccordion
          id="hypotheses"
          buttonContent={
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>Hypotheses</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
            </EuiFlexGroup>
          }
          arrowDisplay="right"
          initialIsOpen
        >
          <EuiSpacer size="s" />
          {renderHypothesesContent()}
          <EuiSpacer size="s" />
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
      {traceMessageId && PERAgentServices && activeMemory?.executorMemoryId && (
        <MessageTraceFlyout
          messageId={traceMessageId}
          messageService={PERAgentServices.message}
          executorMemoryService={PERAgentServices.executorMemory}
          onClose={() => {
            setTraceMessageId(undefined);
          }}
          dataSourceId={context.value.dataSourceId}
          currentExecutorMemoryId={activeMemory?.executorMemoryId}
          memoryContainerId={activeMemory?.memoryContainerId}
        />
      )}
    </>
  );
};
