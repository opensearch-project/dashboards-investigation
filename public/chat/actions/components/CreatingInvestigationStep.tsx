/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiLoadingSpinner,
  EuiLoadingContent,
} from '@elastic/eui';
import React from 'react';
import { InvestigationLinkPanel } from './InvestigationLinkPanel';
import { CoreStart } from '../../../../../../src/core/public';
import { CreateInvestigationResponse } from '../create_investigation_action';

interface CreateInvestigationStepProps {
  result?: CreateInvestigationResponse;
  services: CoreStart;
  isComplete?: boolean;
}

export const CreatingInvestigationStep: React.FC<CreateInvestigationStepProps> = ({
  services,
  result,
  isComplete = false,
}) => {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {isComplete ? (
            <EuiIcon type="checkInCircleEmpty" color="success" />
          ) : (
            <EuiLoadingSpinner size="m" />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{!isComplete ? 'Creating investigation' : 'Create investigation'}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Investigation Creation Details (shown when requested) */}
      {isComplete && result && <InvestigationLinkPanel result={result} services={services} />}
      {!isComplete && <EuiLoadingContent lines={2} />}
    </>
  );
};
