/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiLink,
  EuiCode,
  EuiSplitPanel,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiLoadingSpinner,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useContext, useEffect, useState } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';
import { NotebookReactContext } from '../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getDataSourceById } from '../../../utils/data_source_utils';
import { NoteBookSource } from '../../../../common/types/notebooks';

interface SummaryCardProps {
  isInvestigating: boolean;
  openReinvestigateModal: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  isInvestigating,
  openReinvestigateModal,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { uiSettings, notifications, savedObjects },
  } = useOpenSearchDashboards<NoteBookServices>();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notifications.toasts.addSuccess(`${label} copied to clipboard`);
    });
  };

  const { isNotebookReadonly } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const {
    dataSourceId = '',
    index = '',
    timeRange,
    source,
    timeField,
    initialGoal,
    variables,
    log,
    symptom,
  } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );

  const [dataSourceTitle, setDataSourceTitle] = useState(dataSourceId);

  useEffect(() => {
    const fetchDataSourceDetailsByID = async () => {
      if (!dataSourceId) {
        return;
      }
      try {
        const response = await getDataSourceById(dataSourceId, savedObjects.client);
        setDataSourceTitle(response?.title || dataSourceId);
      } catch (e) {
        // Fallback to ID if fetch fails
        setDataSourceTitle(dataSourceId);
      }
    };

    fetchDataSourceDetailsByID();
  }, [dataSourceId, savedObjects.client]);

  const dateFormat = uiSettings.get('dateFormat');

  return (
    <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} style={{ border: '1px solid #D3DAE6' }}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="l">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>Issue summary and impact</h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isNotebookReadonly && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={() => openReinvestigateModal()}
                disabled={isInvestigating}
                iconType={isInvestigating ? undefined : 'refresh'}
              >
                {isInvestigating ? (
                  <>
                    <EuiLoadingSpinner size="s" style={{ marginRight: '8px' }} />
                    Investigating
                  </>
                ) : (
                  'Reinvestigate'
                )}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner paddingSize="l">
        <EuiFlexGroup gutterSize="xl" wrap responsive={false}>
          <EuiFlexItem grow={1} style={{ minWidth: '180px' }}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('notebook.summary.card.dataSource', {
                  defaultMessage: 'Data Source',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <EuiLink onClick={() => copyToClipboard(dataSourceTitle, 'Data Source')}>
                {dataSourceTitle || 'Not specified'}
                {dataSourceTitle && (
                  <EuiIcon
                    type="copy"
                    size="s"
                    style={{ marginLeft: '6px', verticalAlign: 'middle' }}
                  />
                )}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: '180px' }}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('notebook.summary.card.index', {
                  defaultMessage: 'Index',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <EuiLink onClick={() => copyToClipboard(index, 'Index')}>
                {index || 'Not specified'}
                {index && (
                  <EuiIcon
                    type="copy"
                    size="s"
                    style={{ marginLeft: '6px', verticalAlign: 'middle' }}
                  />
                )}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: '120px' }}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('notebook.summary.card.source', {
                  defaultMessage: 'Source',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">{source}</EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={1} style={{ minWidth: '120px' }}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('notebook.summary.card.timeField', {
                  defaultMessage: 'Time Field',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">{timeField || 'Not specified'}</EuiText>
          </EuiFlexItem>

          {timeRange && (
            <EuiFlexItem grow={2} style={{ minWidth: '280px' }}>
              <EuiText size="xs" color="subdued">
                <strong>
                  {i18n.translate('notebook.global.panel.investigation.subtitle', {
                    defaultMessage: 'Time Range',
                  })}
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="clock" size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    {timeRange.selectionFrom
                      ? moment(timeRange.selectionFrom).format(dateFormat)
                      : 'Not specified'}{' '}
                    to{' '}
                    {timeRange.selectionTo
                      ? moment(timeRange.selectionTo).format(dateFormat)
                      : 'Not specified'}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      {(initialGoal || variables?.pplQuery || log) && (
        <EuiSplitPanel.Inner paddingSize="l" color="plain">
          {initialGoal && (
            <>
              <EuiText size="xs" color="subdued">
                <strong>
                  {i18n.translate('notebook.summary.card.initialGoal', {
                    defaultMessage: 'Initial Goal',
                  })}
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiLink onClick={() => copyToClipboard(initialGoal, 'Initial Goal')}>
                <EuiCode
                  language="plaintext"
                  style={{
                    padding: '8px 12px',
                    display: 'inline-block',
                    maxWidth: '100%',
                  }}
                >
                  {initialGoal}
                </EuiCode>
                <EuiIcon
                  size="s"
                  type="copy"
                  style={{ marginLeft: '6px', verticalAlign: 'middle' }}
                />
              </EuiLink>
              {(variables?.pplQuery || log) && <EuiSpacer size="m" />}
            </>
          )}

          {variables?.pplQuery && (
            <>
              <EuiText size="xs" color="subdued">
                <strong>
                  {i18n.translate('notebook.summary.card.query', {
                    defaultMessage: 'Query',
                  })}
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiLink onClick={() => copyToClipboard(variables.pplQuery || '', 'Query')}>
                <EuiCode
                  language="sql"
                  style={{
                    padding: '8px 12px',
                    display: 'inline-block',
                    maxWidth: '100%',
                  }}
                >
                  {variables.pplQuery || 'Not specified'}
                </EuiCode>
                {variables.pplQuery && (
                  <EuiIcon
                    type="copy"
                    size="s"
                    style={{ marginLeft: '6px', verticalAlign: 'middle' }}
                  />
                )}
              </EuiLink>
              {log && <EuiSpacer size="m" />}
            </>
          )}

          {log && (
            <>
              <EuiText size="xs" color="subdued">
                <strong>Selected log</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiCodeBlock language="json" isCopyable={true} overflowHeight={160} paddingSize="m">
                {JSON.stringify(log, null, 2)}
              </EuiCodeBlock>
            </>
          )}
        </EuiSplitPanel.Inner>
      )}

      {source === NoteBookSource.CHAT && symptom && (
        <EuiSplitPanel.Inner paddingSize="l">
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('notebook.summary.card.symptom', {
                defaultMessage: 'Symptom',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">{symptom}</EuiText>
        </EuiSplitPanel.Inner>
      )}
    </EuiSplitPanel.Outer>
  );
};
