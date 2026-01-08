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
import { i18n } from '@osd/i18n';

interface FindingFooterProps {
  feedback?: 'CONFIRMED' | 'REJECTED';
  isMarkedIrrelevant: boolean;
  isMarkedSelected: boolean;
  isSaving: boolean;
  onFeedback: (feedbackType: 'CONFIRMED' | 'REJECTED') => void;
  onMarkFinding: (listType: 'irrelevant' | 'selected') => void;
}

export const FindingFooter: React.FC<FindingFooterProps> = ({
  feedback,
  isMarkedIrrelevant,
  isMarkedSelected,
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
            {i18n.translate('notebook.finding.footer.confirm', {
              defaultMessage: 'Confirm',
            })}
          </EuiSmallButton>
          <EuiSmallButton
            fill={feedback === 'REJECTED'}
            onClick={() => onFeedback('REJECTED')}
            disabled={isSaving}
          >
            {i18n.translate('notebook.finding.footer.reject', {
              defaultMessage: 'Reject',
            })}
          </EuiSmallButton>
        </EuiFlexGroup>

        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexEnd"
          style={{ gap: 4 }}
        >
          {!isMarkedIrrelevant && !isMarkedSelected && (
            <EuiText color="subdued">
              {i18n.translate('notebook.finding.footer.isFindingRelevant', {
                defaultMessage: 'This is finding relevant?',
              })}
            </EuiText>
          )}

          {!isMarkedIrrelevant && (
            <EuiButtonIcon
              size="xs"
              color={isMarkedSelected ? 'success' : 'text'}
              iconType="thumbsUp"
              aria-label={i18n.translate('notebook.finding.footer.thumbsUp', {
                defaultMessage: 'thumbsUp',
              })}
              onClick={() => onMarkFinding('selected')}
              disabled={isSaving}
            />
          )}
          {!isMarkedSelected && (
            <EuiButtonIcon
              size="xs"
              color={isMarkedIrrelevant ? 'danger' : 'text'}
              iconType="thumbsDown"
              aria-label={i18n.translate('notebook.finding.footer.thumbsDown', {
                defaultMessage: 'ThumbsDown',
              })}
              onClick={() => onMarkFinding('irrelevant')}
              disabled={isSaving}
            />
          )}

          {(isMarkedSelected || isMarkedIrrelevant) && (
            <>
              <EuiText color="subdued">
                {isMarkedSelected
                  ? i18n.translate('notebook.finding.footer.markedAsRelevant', {
                      defaultMessage: 'Marked as relevant',
                    })
                  : i18n.translate('notebook.finding.footer.markedAsIrrelevant', {
                      defaultMessage: 'Marked as irrelevant',
                    })}
              </EuiText>
              <EuiButtonEmpty
                style={{ marginInline: -8 }}
                onClick={() => onMarkFinding(isMarkedSelected ? 'selected' : 'irrelevant')}
                disabled={isSaving}
                size="xs"
              >
                {i18n.translate('notebook.finding.footer.undo', {
                  defaultMessage: 'Undo',
                })}
              </EuiButtonEmpty>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};
