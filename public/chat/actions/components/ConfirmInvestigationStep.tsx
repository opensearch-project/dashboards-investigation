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
  data: CreateInvestigationRequest | string;
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
  const [isActionTaken, setIsActionTaken] = React.useState(false);
  const { uiSettings } = services;
  const dateFormat = uiSettings?.get('dateFormat');

  // Parse data if it's a string (streaming JSON)
  const parsedData: Partial<CreateInvestigationRequest> = React.useMemo(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (_e) {
        // If JSON is incomplete/invalid, return empty object
        return {};
      }
    }
    return data || {};
  }, [data]);

  // Check if data is still streaming (incomplete)
  const isStreaming =
    !isComplete &&
    (typeof data === 'string' ||
      !parsedData.initialGoal ||
      !parsedData.symptom ||
      !parsedData.index);

  // Format time range for display
  const formatTimeRange = (timeRange?: { from: string; to: string }) => {
    if (!timeRange) return null;

    try {
      const fromMoment = dateMath.parse(timeRange.from);
      const toMoment = dateMath.parse(timeRange.to, { roundUp: true });

      if (fromMoment && toMoment && fromMoment.isValid() && toMoment.isValid()) {
        return `${fromMoment.format(dateFormat)} to ${toMoment.format(dateFormat)}`;
      }
    } catch (_e) {
      // Fallback to raw values if parsing fails
      return `${timeRange.from} to ${timeRange.to}`;
    }
    return `${timeRange.from} to ${timeRange.to}`;
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={true}>
        {/* Investigation Details Panel */}
        <EuiSplitPanel.Outer>
          <EuiSplitPanel.Inner paddingSize="s">
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {(isComplete || isStreaming) && (
                <EuiFlexItem grow={false}>
                  {isComplete && <EuiIcon type="checkInCircleEmpty" color="success" />}
                  {isStreaming && <EuiLoadingSpinner size="m" />}
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {isStreaming ? 'Preparing investigation...' : 'Confirm investigation details'}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          <EuiSplitPanel.Inner paddingSize="s">
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Goal</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {parsedData.initialGoal || '—'}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Symptom</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {parsedData.symptom || '—'}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Index</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {parsedData.index || '—'}
                </EuiText>
              </EuiFlexItem>

              {parsedData.timeRange && (
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>Time range</strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    {formatTimeRange(parsedData.timeRange)}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          {!isComplete && !isStreaming && (
            <EuiSplitPanel.Inner color="subdued" paddingSize="s">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>Confirm investigation details</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" responsive={false}>
                    {onEdit && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="pencil"
                          aria-label="Edit investigation details"
                          onClick={() => {
                            setIsActionTaken(true);
                            onEdit!();
                          }}
                          color="text"
                          isDisabled={isActionTaken}
                        />
                      </EuiFlexItem>
                    )}
                    {onCancel && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="crossInCircleEmpty"
                          aria-label="Cancel investigation"
                          onClick={() => {
                            setIsActionTaken(true);
                            onCancel!();
                          }}
                          color="danger"
                          isDisabled={isActionTaken}
                        />
                      </EuiFlexItem>
                    )}
                    {onConfirm && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="checkInCircleEmpty"
                          aria-label="Confirm investigation"
                          onClick={() => {
                            setIsActionTaken(true);
                            onConfirm!();
                          }}
                          color="success"
                          isDisabled={isActionTaken}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
          )}
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
