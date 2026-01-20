/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { UsageCollectionStart } from '../../../../../../../src/plugins/usage_collection/public';

export const HypothesesFeedback: React.FC<{
  appName: string;
  usageCollection: UsageCollectionStart | undefined;
  openReinvestigateModal: () => void;
}> = ({ usageCollection, appName, openReinvestigateModal }) => {
  const [feedback, setFeedback] = useState<'thumbup' | 'thumbdown' | undefined>();

  const onFeedback = useCallback(
    (eventName: 'thumbup' | 'thumbdown') => {
      if (usageCollection && !feedback) {
        usageCollection.reportUiStats(
          appName,
          usageCollection.METRIC_TYPE.CLICK,
          `hypothesis-${eventName}-${uuidv4()}`
        );
        setFeedback(eventName);
      }

      if (eventName === 'thumbdown') {
        openReinvestigateModal();
      }
    },
    [usageCollection, feedback, appName, openReinvestigateModal]
  );

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" alignItems="center">
      <EuiText color="subdued" size="s">
        {i18n.translate('investigate.hypothesis.feedback.question', {
          defaultMessage: 'How helpful were these hypotheses?',
        })}
      </EuiText>
      {(!feedback || feedback === 'thumbup') && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="xs"
            color={feedback === 'thumbup' ? 'primary' : 'text'}
            iconType="thumbsUp"
            aria-label="ThumbsUp"
            onClick={() => onFeedback('thumbup')}
          />
        </EuiFlexItem>
      )}
      {(!feedback || feedback === 'thumbdown') && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="xs"
            color={feedback === 'thumbdown' ? 'primary' : 'text'}
            iconType="thumbsDown"
            aria-label="ThumbsDown"
            onClick={() => onFeedback('thumbdown')}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
