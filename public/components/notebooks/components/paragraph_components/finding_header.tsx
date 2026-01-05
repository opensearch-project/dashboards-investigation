/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import moment from 'moment';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FindingParagraphParameters } from '../../../../../common/types/notebooks';

interface FindingHeaderProps {
  parameters: FindingParagraphParameters;
  dateModified: string;
  isAIGenerated: boolean;
  supportingHypothesesCount: number;
}

export const FindingHeader: React.FC<FindingHeaderProps> = ({
  parameters,
  dateModified,
  isAIGenerated,
  supportingHypothesesCount,
}) => {
  const description = parameters?.finding?.description;
  const importance = parameters?.finding?.importance;
  const feedback = parameters?.finding?.feedback;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {isAIGenerated
                ? `Finding: ${description || 'AI generated finding'} ${
                    importance ? `| Importance: ${importance}` : ''
                  } `
                : 'User Finding'}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            style={{ whiteSpace: 'nowrap', ...(!isAIGenerated && { marginInlineEnd: 32 }) }}
          >
            {isAIGenerated ? 'Updated' : 'Created'}&nbsp;
            {moment(dateModified).fromNow()}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isAIGenerated && (
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiBadge>AI Generated</EuiBadge>
          <span>
            {feedback === 'CONFIRMED' && <EuiBadge color="warning">Confirmed</EuiBadge>}
            {feedback === 'REJECTED' && <EuiBadge color="warning">Rejected</EuiBadge>}
            {supportingHypothesesCount > 0 && (
              <EuiBadge color="primary">
                Supports {supportingHypothesesCount}{' '}
                {supportingHypothesesCount === 1 ? 'Hypothesis' : 'Hypotheses'}
              </EuiBadge>
            )}
          </span>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
    </>
  );
};
