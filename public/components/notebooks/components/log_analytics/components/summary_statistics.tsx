/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiBadge } from '@elastic/eui';
import { LogPatternAnalysisResult } from '../../../../../../common/types/log_pattern';

interface SummaryStatisticsProps {
  result: LogPatternAnalysisResult;
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({ result }) => {
  const stats = [
    {
      title: 'Log Insights',
      value: result.logInsights?.length || 0,
      color: 'primary',
    },
    {
      title: 'Pattern Differences',
      value: result.patternMapDifference?.length || 0,
      color: 'accent',
    },
    {
      title: 'Exceptional Sequences',
      value: Object.keys(result.EXCEPTIONAL || {}).length,
      color: 'danger',
    },
    {
      title: 'Baseline Sequences',
      value: Object.keys(result.BASE || {}).length,
      color: 'hollow',
    },
  ];

  return (
    <EuiFlexGroup>
      {stats.map((stat) => (
        <EuiFlexItem key={stat.title}>
          <EuiPanel color="subdued" paddingSize="s">
            <EuiText size="s" textAlign="center">
              <strong>{stat.title}</strong>
              <br />
              <EuiBadge color={stat.color}>{stat.value}</EuiBadge>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
