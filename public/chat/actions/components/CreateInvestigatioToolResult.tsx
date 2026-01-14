/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
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

export const CreateInvestigatioToolResult: React.FC<Props> = ({
  status,
  args,
  result,
  services,
  onApprove,
  onReject,
}) => {
  // State must be declared at the top level
  const [isExpanded, setIsExpanded] = useState(false);

  // log args and result
  console.log('CreateInvestigationRenderer - status:', status);
  console.log('CreateInvestigationRenderer - args:', args);
  console.log('CreateInvestigationRenderer - result:', result);

  // Return null if we have neither args nor result
  if (!args && !result) {
    return null;
  }

  if (args && status === 'executing') {
    const confirmed = !!args.confirmed;
    return (
      <EuiPanel paddingSize="m">
        <ConfirmInvestigationStep
          onConfirm={onApprove}
          onCancel={onReject}
          data={args}
          services={services}
          isComplete={confirmed}
        />
        <EuiSpacer size="s" />
        {confirmed && <CreatingInvestigationStep services={services} />}
      </EuiPanel>
    );
  }

  if (status === 'complete' && result?.success) {
    return (
      <EuiPanel paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleEmpty" color="success" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">2 tasks performed summary</EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIcon
              onClick={() => setIsExpanded(!isExpanded)}
              type={isExpanded ? 'arrowDown' : 'arrowRight'}
              color="subdued"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Expanded view - Show steps 1 and 2 */}
        {isExpanded && (
          <>
            <ConfirmInvestigationStep data={args!} services={services} isComplete={true} />
            <EuiSpacer size="s" />
            <CreatingInvestigationStep services={services} result={result} isComplete={true} />
          </>
        )}

        {/* Final result description */}
        <EuiText size="s">
          A new Investigation is created based on our conversation history. Click the link below to
          view it.
        </EuiText>

        <EuiSpacer size="xs" />

        {/* Investigation Link Panel */}
        <InvestigationLinkPanel result={result} services={services} />
      </EuiPanel>
    );
  }

  // Error state
  if (status === 'failed') {
    return (
      <EuiPanel paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="cross" color="danger" />
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
