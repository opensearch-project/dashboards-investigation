/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  EuiSmallButton,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';

interface FindingFooterProps {
  feedback?: 'CONFIRMED' | 'REJECTED';
  isMarkedIrrelevant: boolean;
  isMarkedSelected: boolean;
  showHypothesisActions: boolean;
  isSaving: boolean;
  onFeedback: (feedbackType: 'CONFIRMED' | 'REJECTED') => void;
  onMarkFinding: (listType: 'irrelevant' | 'selected') => void;
}

export const FindingFooter: React.FC<FindingFooterProps> = ({
  feedback,
  isMarkedIrrelevant,
  isMarkedSelected,
  showHypothesisActions,
  isSaving,
  onFeedback,
  onMarkFinding,
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ gap: 8 }}>
          <EuiSmallButton
            fill={feedback === 'CONFIRMED'}
            onClick={() => onFeedback('CONFIRMED')}
            disabled={isSaving}
          >
            Confirm
          </EuiSmallButton>
          <EuiSmallButton
            fill={feedback === 'REJECTED'}
            onClick={() => onFeedback('REJECTED')}
            disabled={isSaving}
          >
            Reject
          </EuiSmallButton>
        </EuiFlexGroup>
        {showHypothesisActions && (
          <EuiFlexGroup
            gutterSize="none"
            alignItems="center"
            justifyContent="flexEnd"
            style={{ gap: 4 }}
          >
            {!isMarkedIrrelevant && !isMarkedSelected && (
              <EuiText color="subdued">This is finding relevant?</EuiText>
            )}

            {!isMarkedIrrelevant && (
              <EuiButtonIcon
                size="xs"
                color={isMarkedSelected ? 'success' : 'text'}
                iconType="thumbsUp"
                aria-label="thumbsUp"
                onClick={() => onMarkFinding('selected')}
                disabled={isSaving}
              />
            )}
            {!isMarkedSelected && (
              <EuiButtonIcon
                size="xs"
                color={isMarkedIrrelevant ? 'danger' : 'text'}
                iconType="thumbsDown"
                aria-label="ThumbsDown"
                onClick={() => onMarkFinding('irrelevant')}
                disabled={isSaving}
              />
            )}

            {isMarkedSelected && (
              <>
                <EuiText color="subdued">Marked as relevant</EuiText>
                <EuiButtonEmpty
                  style={{ marginInline: -8 }}
                  onClick={() => onMarkFinding('selected')}
                  disabled={isSaving}
                >
                  Undo
                </EuiButtonEmpty>
              </>
            )}
            {isMarkedIrrelevant && (
              <>
                <EuiText color="subdued">Marked as irrelevant</EuiText>
                <EuiButtonEmpty
                  style={{ marginInline: -8 }}
                  onClick={() => onMarkFinding('irrelevant')}
                  disabled={isSaving}
                >
                  Undo
                </EuiButtonEmpty>
              </>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </>
  );
};
