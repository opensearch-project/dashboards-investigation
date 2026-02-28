/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { CoreStart } from '../../../../../../src/core/public';
import { ConfirmInvestigationStep } from './ConfirmInvestigationStep';
import { ToolStatus } from '../../../../../../src/plugins/context_provider/public';
import { CreatingInvestigationStep } from './CreatingInvestigationStep';
import { InvestigationLinkPanel } from './InvestigationLinkPanel';
import {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
} from '../create_investigation_action';

interface Props {
  status: ToolStatus;
  args?: CreateInvestigationRequest;
  result?: CreateInvestigationResponse;
  services: CoreStart;
  onApprove?: () => void;
  onReject?: () => void;
}

export const CreateInvestigationToolResult: React.FC<Props> = ({
  status,
  args,
  result,
  services,
  onApprove,
  onReject,
}) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Return null if we have neither args nor result
  if (!args && !result) {
    return null;
  }

  if (args && status === 'executing') {
    const confirmed = !!args.confirmed;
    return (
      <>
        <ConfirmInvestigationStep
          onConfirm={onApprove}
          onCancel={onReject}
          data={args}
          services={services}
          isComplete={confirmed}
        />
        <EuiSpacer size="s" />
        {confirmed && <CreatingInvestigationStep services={services} />}
      </>
    );
  }

  if (status === 'complete' && result?.success) {
    return (
      <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
        <EuiAccordion
          id="investigation-summary"
          buttonContent={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleEmpty" color="success" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">2 tasks performed summary</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          arrowDisplay="right"
          paddingSize="none"
          onToggle={(isOpen) => setIsAccordionOpen(isOpen)}
        >
          <EuiSpacer size="s" />
          <ConfirmInvestigationStep data={args!} services={services} isComplete={true} />
          <EuiSpacer size="s" />
          <CreatingInvestigationStep services={services} isComplete={true} />
        </EuiAccordion>

        {/* Investigation Link Panel - Only show when accordion is collapsed */}
        {!isAccordionOpen && (
          <>
            <EuiSpacer size="xs" />
            <InvestigationLinkPanel result={result} services={services} />
          </>
        )}
      </EuiPanel>
    );
  }

  // Error state
  if (status === 'failed') {
    return (
      <EuiPanel paddingSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="crossInCircleEmpty" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Failed to create investigation</strong>
            </EuiText>
            {result?.error && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="danger">
                  {result.error}
                </EuiText>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return null;
};
