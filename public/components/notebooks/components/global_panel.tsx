/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiIcon } from '@elastic/eui';
import React, { useContext } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';
import { NotebookReactContext } from '../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

export const GlobalPanel = () => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();

  const { timeRange } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );

  const dateFormat = uiSettings.get('dateFormat');

  if (!timeRange) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">
          <strong>
            {i18n.translate('notebook.global.panel.investigation.period', {
              defaultMessage: 'Investigation Period',
            })}
          </strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          {i18n.translate('notebook.global.panel.investigation.subtitle', {
            defaultMessage: 'The time range of alert',
          })}
        </EuiText>
        <EuiPanel paddingSize="s" hasShadow={false}>
          <EuiText size="s">
            <EuiIcon type="clock" /> {moment(timeRange.selectionFrom).format(dateFormat)} to{' '}
            {moment(timeRange.selectionTo).format(dateFormat)}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>
            {i18n.translate('notebook.global.panel.baseline.period', {
              defaultMessage: 'Baseline Period',
            })}
          </strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          {i18n.translate('notebook.global.panel.baseline.subtitle', {
            defaultMessage: 'Normal period for comparison to identify anomalies',
          })}
        </EuiText>
        <EuiPanel paddingSize="s" hasShadow={false}>
          <EuiText size="s">
            <EuiIcon type="clock" /> {moment(timeRange.baselineFrom).format(dateFormat)} to{' '}
            {moment(timeRange.baselineTo).format(dateFormat)}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
