/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

interface SequenceItemProps {
  item: string;
  index: number;
}

export const errorKeywords = /\b(error|exception|failed|failure|panic|crash|fatal|abort|timeout|unavailable|denied|rejected|invalid|corrupt|broken|dead|kill)\b/gi;

export const SequenceItem: React.FC<SequenceItemProps> = ({ item, index }) => {
  const hasErrorKeywords = (text: string): boolean => {
    return errorKeywords.test(text);
  };

  const isError = hasErrorKeywords(item);

  return (
    <li>
      <EuiText color={isError ? 'danger' : 'default'}>
        {index + 1}. {item}
      </EuiText>
    </li>
  );
};
