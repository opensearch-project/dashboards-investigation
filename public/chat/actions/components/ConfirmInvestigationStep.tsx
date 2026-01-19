/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiSplitPanel,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';
import dateMath from '@elastic/datemath';
import { CoreStart } from '../../../../../../src/core/public';
import { CreateInvestigationRequest } from '../create_investigation_action';

interface Props {
  data: CreateInvestigationRequest;
  services: CoreStart;
  isComplete?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}

export const ConfirmInvestigationStep: React.FC<Props> = ({
  data,
  services,
  isComplete = false,
  onEdit,
  onCancel,
  onConfirm,
}) => {
  const { uiSettings } = services;
  const dateFormat = uiSettings?.get('dateFormat');

  // Format time range for display
  const formatTimeRange = (timeRange?: { from: string; to: string }) => {
    if (!timeRange) return null;

    try {
      const fromMoment = dateMath.parse(timeRange.from);
      const toMoment = dateMath.parse(timeRange.to, { roundUp: true });

      if (fromMoment && toMoment && fromMoment.isValid() && toMoment.isValid()) {
        return `${fromMoment.format(dateFormat)} to ${toMoment.format(dateFormat)}`;
      }
    } catch (e) {
      // Fallback to raw values if parsing fails
      return `${timeRange.from} to ${timeRange.to}`;
    }
    return `${timeRange.from} to ${timeRange.to}`;
  };

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
            <strong>Confirm investigation details</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Investigation Details Panel */}
      <EuiSplitPanel.Outer hasBorder={false} hasShadow={false}>
        <EuiSplitPanel.Inner paddingSize="s">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>Goal</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {data.initialGoal}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiText size="s">
                <strong>Symptom</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {data.symptom}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiText size="s">
                <strong>Index</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {data.index}
              </EuiText>
            </EuiFlexItem>

            {data.timeRange && (
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Time range</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {formatTimeRange(data.timeRange)}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>

        {!isComplete && (
          <EuiSplitPanel.Inner color="subdued" paddingSize="s">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Investigation details</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  {onEdit && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="pencil"
                        aria-label="Edit investigation details"
                        onClick={onEdit}
                        color="text"
                      />
                    </EuiFlexItem>
                  )}
                  {onCancel && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="crossInCircleEmpty"
                        aria-label="Cancel investigation"
                        onClick={onCancel}
                        color="danger"
                      />
                    </EuiFlexItem>
                  )}
                  {onConfirm && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="checkInCircleEmpty"
                        aria-label="Confirm investigation"
                        onClick={onConfirm}
                        color="success"
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
        )}
      </EuiSplitPanel.Outer>
    </>
  );
};
