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
import _ from 'lodash';
import { NotebookReactContext } from '../context_provider/context_provider';
import { SEVERITY_OPTIONS } from '../../../../common/constants/alert';
import { getApplication } from '../../../services';

export const AlertPanel = () => {
  const notebookContext = useContext(NotebookReactContext);
  const application = getApplication();

  const { alert, dataSourceId, index } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  console.log(dataSourceId);

  const severityColor = getSeverityColor(alert?.severity);

  if (!alert) {
    return null;
  }

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
            <strong>Trigger name</strong>
            <p>{alert.trigger_name}</p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs">
            <strong>Trigger start time</strong>
            <p>{getTime(alert.start_time)}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>Monitor</strong>
            <p>
              <EuiLink onClick={() => application.navigateToApp('alerts', { path: monitorUrl })}>
                {alert.monitor_name}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs">
            <strong>Trigger last updated</strong>
            <p>{getTime(alert.last_notification_time)}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>Monitor data sources</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{index}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function getTime(time: number) {
  const momentTime = moment.tz(time, moment.tz.guess());
  if (time && momentTime.isValid()) return momentTime.format('MM/DD/YY h:mm a z');
  return '-';
}

function getSeverityColor(severity: number) {
  return _.get(_.find(SEVERITY_OPTIONS, { value: severity }), 'color');
}

function getSeverityBadgeText(severity: number) {
  return _.get(_.find(SEVERITY_OPTIONS, { value: severity }), 'badgeText');
}
