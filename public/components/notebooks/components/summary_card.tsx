/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import React, { useContext } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';
import { NotebookReactContext } from '../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookSource } from '../../../../common/types/notebooks';

interface ContextData {
  variables: {
    pplQuery?: string;
    pplFilters?: any;
  };
  dataSourceId: string;
  index: string;
  timeRange?: any;
  source: NoteBookSource;
  timeField: string;
  currentTime: number | undefined;
  initialGoal?: string;
}

export const SummaryCard = () => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { uiSettings, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notifications.toasts.add({
        title: `${label} copied to clipboard`,
        color: 'success',
        iconType: 'check',
      });
    });
  };

  const {
    dataSourceId = '',
    index = '',
    timeRange,
    source,
    timeField,
    initialGoal,
  } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  ) as ContextData;

  const dateFormat = uiSettings.get('dateFormat');

  return (
    <EuiPanel borderRadius="l">
      <EuiFlexGroup alignItems="center" justifyContent="spaceEvenly">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.summary.card.dataSource', {
                defaultMessage: 'Data Source',
              })}
            </strong>
            <div>
              <EuiLink onClick={() => copyToClipboard(dataSourceId, 'Data Source')}>
                {dataSourceId || 'Not specified'}
                {dataSourceId && (
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
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="xs">
                    <strong>
                      {i18n.translate('notebook.summary.card.initialGoal', {
                        defaultMessage: 'Initial Goal',
                      })}
                    </strong>
                  </EuiText>
                  <EuiPanel paddingSize="s" color="primary" style={{ marginTop: '2px' }}>
                    <EuiText size="xs">{initialGoal}</EuiText>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
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

      <EuiSpacer size="s" />
    </EuiPanel>
  );
};
