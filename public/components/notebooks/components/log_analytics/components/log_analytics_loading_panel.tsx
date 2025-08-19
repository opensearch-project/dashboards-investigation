/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';

interface LogAnalyticsLoadingPanelProps {
  isLoading: boolean;
  title: string;
  initialIsOpen: boolean;
  renderSection: () => React.JSX.Element;
}

export const LogAnalyticsLoadingPanel: React.FC<LogAnalyticsLoadingPanelProps> = ({
  isLoading,
  title,
  initialIsOpen,
  renderSection,
}) => {
  return (
    <EuiPanel hasShadow={false} borderRadius="l" paddingSize="s">
      <EuiAccordion
        id="logInsights"
        arrowDisplay="right"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                <EuiIcon color="success" type="checkInCircleEmpty" />
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText size="m">{title}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen={initialIsOpen}
      >
        <EuiSpacer size="s" />
        {renderSection()}
      </EuiAccordion>
    </EuiPanel>
  );
};
