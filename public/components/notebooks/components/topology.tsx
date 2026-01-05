/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBadge, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FindingParagraphParameters, PERAgentTopology } from 'common/types/notebooks';
import { ParagraphStateValue } from 'common/state/paragraph_state';
import { renderTopologyGraph } from '../../../utils/visualization';

export const Topology: React.FC<{
  topologyItem?: PERAgentTopology;
  legacyTopology?: ParagraphStateValue<string, FindingParagraphParameters>;
}> = ({ topologyItem, legacyTopology }) => {
  if (topologyItem) {
    return (
      <>
        <EuiSpacer size="s" />
        <EuiPanel>
          <EuiTitle size="xs">
            <span>Topology: {topologyItem.description}</span>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBadge>AI Generated</EuiBadge>
          <EuiSpacer size="xs" />
          <pre>{renderTopologyGraph(topologyItem)}</pre>
        </EuiPanel>
      </>
    );
  }

  if (legacyTopology) {
    return (
      <>
        <EuiTitle size="xs">
          <span>
            Topology:{' '}
            {(legacyTopology.input.parameters as FindingParagraphParameters)?.finding?.description}
          </span>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBadge>AI Generated</EuiBadge>
        <EuiSpacer size="xs" />
        <pre>{legacyTopology.input.inputText.replace('%md ', '')}</pre>
      </>
    );
  }

  return null;
};
