/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { errorKeywords } from '../../../../../../common/constants/notebooks';

interface SequenceItemProps {
  item: string;
  index: number;
}

export const SequenceItem: React.FC<SequenceItemProps> = ({ item, index }) => {
  const hasErrorKeywords = (text: string): boolean => {
    return errorKeywords.test(text);
  };

  const isError = hasErrorKeywords(item);

  return (
    <li>
      <EuiText color={isError ? 'danger' : 'default'} size="s">
        {index + 1}. {item}
      </EuiText>
    </li>
  );
};
