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

  const { isNotebookOwner } = useObservable(
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
    <EuiSplitPanel.Outer borderRadius="l">
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
        <EuiTitle>
          <h2 style={{ paddingLeft: '20px' }}>Issue summary and impact</h2>
        </EuiTitle>
        {isNotebookOwner ? (
          <EuiButton
            style={{ marginRight: '20px' }}
            onClick={() => openReinvestigateModal()}
            disabled={isInvestigating}
          >
            {isInvestigating ? (
              <>
                <EuiLoadingSpinner /> Investigating
              </>
            ) : (
              'Reinvestigate'
            )}
          </EuiButton>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        style={{ paddingLeft: '50px', paddingRight: '50px' }}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('notebook.summary.card.dataSource', {
                  defaultMessage: 'Data Source',
                })}
              </strong>
              <div>
                <EuiLink onClick={() => copyToClipboard(dataSourceTitle, 'Data Source')}>
                  {dataSourceTitle || 'Not specified'}
                  {dataSourceTitle && (
                    <EuiIcon
                      type="copy"
                      size="s"
                      style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                    />
                  )}
                </EuiLink>
              </div>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('notebook.summary.card.index', {
                  defaultMessage: 'Index',
                })}
              </strong>
              <div>
                <EuiLink onClick={() => copyToClipboard(index, 'Index')}>
                  {index || 'Not specified'}
                  {index && (
                    <EuiIcon
                      type="copy"
                      size="s"
                      style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                    />
                  )}
                </EuiLink>
              </div>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('notebook.summary.card.source', {
                  defaultMessage: 'Source',
                })}
              </strong>
              <p>{source}</p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>
                {i18n.translate('notebook.summary.card.timeField', {
                  defaultMessage: 'Time Field',
                })}
              </strong>
              <p>{timeField || 'Not specified'}</p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {initialGoal && (
              <EuiText size="xs">
                <strong>
                  {i18n.translate('notebook.summary.card.initialGoal', {
                    defaultMessage: 'Initial Goal',
                  })}
                </strong>
                <div>
                  <EuiLink onClick={() => copyToClipboard(initialGoal, 'Initial Goal')}>
                    <EuiCode language="plaintext">{initialGoal}</EuiCode>
                    <EuiIcon
                      size="s"
                      type="copy"
                      style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                    />
                  </EuiLink>
                </div>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner grow={false} style={{ paddingLeft: '50px', paddingRight: '50px' }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {variables?.pplQuery && (
              <EuiText size="xs">
                <strong>
                  {i18n.translate('notebook.summary.card.query', {
                    defaultMessage: 'Query',
                  })}
                </strong>
                <div>
                  <EuiLink onClick={() => copyToClipboard(variables.pplQuery || '', 'Query')}>
                    <EuiCode language="sql">{variables.pplQuery || 'Not specified'}</EuiCode>
                    {variables.pplQuery && (
                      <EuiIcon
                        type="copy"
                        size="s"
                        style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                      />
                    )}
                  </EuiLink>
                </div>
              </EuiText>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {timeRange && (
              <>
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('notebook.global.panel.investigation.subtitle', {
                      defaultMessage: 'Time Range',
                    })}
                  </strong>
                </EuiText>
                <EuiText size="xs">
                  <EuiIcon type="clock" />{' '}
                  {timeRange.selectionFrom
                    ? moment(timeRange.selectionFrom).format(dateFormat)
                    : 'Not specified'}{' '}
                  to{' '}
                  {timeRange.selectionTo
                    ? moment(timeRange.selectionTo).format(dateFormat)
                    : 'Not specified'}
                </EuiText>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        {log && (
          <>
            <EuiText size="xs">
              <strong>Selected log</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiCodeBlock language="json" isCopyable={true} overflowHeight={160}>
              {JSON.stringify(log, null, 2)}
            </EuiCodeBlock>
          </>
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
