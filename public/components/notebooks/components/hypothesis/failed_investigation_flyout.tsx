/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiAccordion,
  EuiMarkdownFormat,
  EuiSplitPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiFlexGroup,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { useObservable } from 'react-use';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import type { NoteBookServices } from '../../../../../public/types';
import type { FailedInvestigationInfo } from '../../../../../common/types/notebooks';
import { HypothesesStep } from './hypotheses_step';
import { MessageTraceFlyout } from './investigation/message_trace_flyout';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useSidecarPadding } from '../../../../hooks/use_sidecar_padding';
import { usePERAgentServices } from '../../../../hooks/use_per_agent_services';

interface FailedInvestigationFlyoutProps {
  failedInvestigation: FailedInvestigationInfo;
  dataSourceId?: string;
  onClose: () => void;
}

export const FailedInvestigationFlyout: React.FC<FailedInvestigationFlyoutProps> = ({
  failedInvestigation,
  dataSourceId,
  onClose,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const { currentUser } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const {
    services: { http, overlays, uiSettings, application },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [traceMessageId, setTraceMessageId] = useState<string>();
  const [showSteps, setShowSteps] = useState(true);
  const paddingRight = useSidecarPadding(overlays);

  const { memory, error, timestamp } = failedInvestigation;
  const isOwner = application.capabilities.investigation?.ownerSupported
    ? !!currentUser && !!memory?.owner && currentUser === memory?.owner
    : true;
  const isDarkMode = uiSettings.get('theme:darkMode');

  const failedPERAgentServices = usePERAgentServices({
    http,
    isInvestigating: false,
    memory,
    dataSourceId,
  });

  const formattedTimestamp = useMemo(() => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }, [timestamp]);

  // Check if cause has meaningful content (not empty string or empty object)
  const hasMeaningfulCause = useMemo(() => {
    if (!error.cause) return false;
    if (typeof error.cause === 'string') return error.cause.trim().length > 0;
    if (typeof error.cause === 'object') return Object.keys(error.cause as object).length > 0;
    return true;
  }, [error.cause]);

  return (
    <>
      <EuiFlyout onClose={onClose} style={{ marginRight: paddingRight }}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('notebook.failedInvestigation.flyout.title', {
                defaultMessage: 'Failure Investigation Details',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiSplitPanel.Outer>
            <EuiSplitPanel.Inner style={{ backgroundColor: isDarkMode ? '#4a2526' : '#fee0e1' }}>
              <EuiFlexGroup
                gutterSize="none"
                direction="row"
                alignItems="center"
                style={{ gap: 16 }}
              >
                <EuiIcon type="alert" size="xl" color="danger" />
                <div>
                  <EuiTitle size="s">
                    <h5 style={{ color: euiThemeVars.ouiColorDanger }}>
                      {i18n.translate('notebook.failedInvestigation.flyout.errorTitle', {
                        defaultMessage: 'Failure Investigation',
                      })}
                    </h5>
                  </EuiTitle>
                  <EuiText color="danger">{error.message}</EuiText>
                </div>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner color="danger">
              <EuiText size="s">
                <p>
                  <strong>
                    {i18n.translate('notebook.failedInvestigation.flyout.time', {
                      defaultMessage: 'Investigation Time',
                    })}
                  </strong>
                  : {formattedTimestamp}
                </p>
                {memory?.owner && (
                  <p>
                    <strong>
                      {i18n.translate('notebook.failedInvestigation.flyout.owner', {
                        defaultMessage: 'Investigation Owner',
                      })}
                    </strong>
                    : {memory.owner}
                  </p>
                )}
              </EuiText>
            </EuiSplitPanel.Inner>
            {hasMeaningfulCause && (
              <>
                <EuiHorizontalRule margin="none" />
                <EuiSplitPanel.Inner color="danger">
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('notebook.failedInvestigation.flyout.cause', {
                        defaultMessage: 'Failure Cause',
                      })}
                    </strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
                    <EuiMarkdownFormat>
                      {typeof error.cause === 'string'
                        ? error.cause
                        : JSON.stringify(error.cause, null, 2)}
                    </EuiMarkdownFormat>
                  </EuiPanel>
                </EuiSplitPanel.Inner>
              </>
            )}
          </EuiSplitPanel.Outer>

          <EuiSpacer size="l" />

          {failedPERAgentServices && isOwner ? (
            <EuiAccordion
              id="failed-investigation-steps"
              buttonContent={i18n.translate(
                'notebook.failedInvestigation.flyout.investigationSteps',
                {
                  defaultMessage: 'Investigation Steps Before Failure',
                }
              )}
              initialIsOpen={showSteps}
              onToggle={setShowSteps}
            >
              <EuiSpacer size="s" />
              <HypothesesStep
                isInvestigating={false}
                messageService={failedPERAgentServices.message}
                executorMemoryService={failedPERAgentServices.executorMemory}
                onExplainThisStep={setTraceMessageId}
              />
            </EuiAccordion>
          ) : (
            <EuiText color="subdued">
              {i18n.translate('notebook.failedInvestigation.flyout.noSteps', {
                defaultMessage: 'No step information available for this failed investigation.',
              })}
            </EuiText>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>

      {traceMessageId && failedPERAgentServices && memory?.executorMemoryId && (
        <MessageTraceFlyout
          messageId={traceMessageId}
          messageService={failedPERAgentServices.message}
          executorMemoryService={failedPERAgentServices.executorMemory}
          onClose={() => setTraceMessageId(undefined)}
          dataSourceId={dataSourceId}
          currentExecutorMemoryId={memory.executorMemoryId}
          memoryContainerId={memory.memoryContainerId as string}
          isInvestigating={false}
        />
      )}
    </>
  );
};
