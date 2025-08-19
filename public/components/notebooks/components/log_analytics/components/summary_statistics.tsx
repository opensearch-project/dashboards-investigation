/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { LogPatternAnalysisResult } from '../../../../../../common/types/log_pattern';

interface SummaryStatisticsProps {
  result: LogPatternAnalysisResult;
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({ result }) => {
  const stats = [
    {
      title: 'Log Insights',
      value: result.logInsights?.length || '--',
      color: 'primary',
    },
    {
      title: 'Pattern Differences',
      value: result.patternMapDifference?.length || '--',
      color: 'accent',
    },
    {
      title: 'Exceptional Sequences',
      value: Object.keys(result.EXCEPTIONAL || {}).length || '--',
      color: 'danger',
    },
  ];

  return (
    <EuiFlexGroup>
      {stats.map((stat) => (
        <EuiFlexItem key={stat.title}>
          <EuiPanel paddingSize="s" hasShadow={false}>
            <EuiText size="s" textAlign="left">
              {stat.title}
              <br />
              <strong> {stat.value} </strong>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
