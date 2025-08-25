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
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import React, { useContext } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { i18n } from '@osd/i18n';
import { NotebookReactContext } from '../context_provider/context_provider';
import { SEVERITY_OPTIONS } from '../../../../common/constants/alert';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

export const AlertPanel = () => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { application, uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();

  const { variables, dataSourceId, index } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );

  if (!variables?.alert) {
    return null;
  }

  const alert = variables.alert;
  const dateFormat = uiSettings.get('dateFormat');
  const startTime = alert?.start_time ? moment(alert?.start_time).format(dateFormat) : '-';
  const lastNotificationTime = alert?.last_notification_time
    ? moment(alert?.last_notification_time).format(dateFormat)
    : '-';
  const severityColor = getSeverityColor(alert?.severity);
  const monitorUrl = `#/monitors/${alert.monitor_id}?dataSourceId=${dataSourceId}`;
  const alertNumber = alert.alertNumber;

  return (
    <EuiPanel borderRadius="l">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>{alertNumber > 1 ? `${alertNumber} alerts` : `${alertNumber} alert`}</EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBadge color={severityColor?.background} style={{ color: severityColor?.text }}>
            {getSeverityBadgeText(alert?.severity)}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.alert.panel.triggerName', {
                defaultMessage: 'Trigger name',
              })}
            </strong>
            <p>{alert.trigger_name}</p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.alert.panel.triggerStartTime', {
                defaultMessage: 'Trigger start time',
              })}
            </strong>
            <p>{startTime}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.alert.panel.monitor', {
                defaultMessage: 'Monitor',
              })}
            </strong>
            <p>
              <EuiLink onClick={() => application.navigateToApp('alerts', { path: monitorUrl })}>
                {alert.monitor_name}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.alert.panel.triggerLastUpdated', {
                defaultMessage: 'Trigger last updated',
              })}
            </strong>
            <p>{lastNotificationTime}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('notebook.alert.panel.monitorDataSources', {
                defaultMessage: 'Monitor data sources',
              })}
            </strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{index}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function getSeverityColor(severity: string) {
  return SEVERITY_OPTIONS.find((option) => option.value === severity)?.color;
}

function getSeverityBadgeText(severity: string) {
  return SEVERITY_OPTIONS.find((option) => option.value === severity)?.badgeText;
}
