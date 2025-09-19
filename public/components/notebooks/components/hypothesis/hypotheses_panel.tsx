/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiPanel,
  EuiText,
  EuiHorizontalRule,
  EuiIcon,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { HypothesisItem } from './hypothesis_item';

export const HypothesesPanel: React.FC<{ notebookId: string }> = ({ notebookId }) => {
  const history = useHistory();

  // Mock
  const hypotheses = [
    {
      id: '1',
      title: 'Cache overload from redundant UserProfile caching',
      description: 'Cache is performing poorly in the last 24 hours - elevated miss rates.',
    },
  ];

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/${notebookId}/hypothesis/${hypothesisId}`);
  };

  return (
    <EuiPanel>
      <EuiAccordion id="hypotheses" buttonContent="Hypotheses" arrowDisplay="right" initialIsOpen>
        {hypotheses.map((hypothesis, index) => {
          return (
            <HypothesisItem
              index={index}
              hypothesis={hypothesis}
              onClickHypothesis={handleClickHypothesis}
            />
          );
        })}
      </EuiAccordion>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup dir="row" alignItems="center" gutterSize="none" style={{ gap: 8 }}>
        <EuiIcon type="" />
        <EuiText size="s" color="subdued">
          AI Agent continuously evaluates and ranks hypotheses based on evidence
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
