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
}

export const FindingHeader = ({ parameters, dateModified, isAIGenerated }: FindingHeaderProps) => {
  const description = parameters?.finding?.description;
  const importance = parameters?.finding?.importance;
  const feedback = parameters?.finding?.feedback;
  const isTopology = parameters?.finding?.type === 'TOPOLOGY';

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" style={{ marginInlineEnd: 20 }}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {isAIGenerated && description && importance !== undefined
                ? `Finding: ${description} ${isTopology ? '' : `| Importance: ${importance}`}`
                : 'User Finding'}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap' }}>
            {isAIGenerated ? 'Updated' : 'Created'}&nbsp;
            {moment(dateModified).fromNow()}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isAIGenerated && (
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiBadge>AI Generated</EuiBadge>
          {feedback === 'CONFIRMED' && <EuiBadge color="warning">Confirmed</EuiBadge>}
          {feedback === 'REJECTED' && <EuiBadge color="warning">Rejected</EuiBadge>}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
    </>
  );
};
