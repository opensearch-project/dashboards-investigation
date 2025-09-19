/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGroup, EuiPanel, EuiFlexItem, EuiText } from '@elastic/eui';
import { HypothesisItem as HypothesisItemProps } from 'common/types/notebooks';
import { HypothesisBadge } from './hypothesis_badge';

export const HypothesisItem: React.FC<{
  index: number;
  hypothesis: HypothesisItemProps;
  onClickHypothesis: (hypothesisId: string) => void;
}> = ({ index, hypothesis, onClickHypothesis }) => {
  const { title, description, likelihood } = hypothesis;
  return (
    <EuiFlexGroup
      gutterSize="none"
      dir="row"
      alignItems="center"
      justifyContent="spaceBetween"
      onClick={() => onClickHypothesis('1')}
      style={{
        cursor: 'pointer',
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel
          style={{
            height: 40,
            width: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginInlineEnd: 12,
          }}
        >
          {index + 1}
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
          <EuiFlexGroup dir="row" alignItems="center" gutterSize="none" style={{ gap: 8 }}>
            <EuiText>
              <strong>{title}</strong>
            </EuiText>
            <HypothesisBadge label={`Strong evidence ${likelihood}%`} color="#DCFCE7" />
            <EuiText size="xs" color="subdued">
              Updated 2 min ago
            </EuiText>
          </EuiFlexGroup>
          <EuiText size="s">{description}</EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
