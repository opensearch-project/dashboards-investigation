/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useObservable } from 'react-use';

import { ParagraphState } from '../../../../../../common/state/paragraph_state';

export const TopologyParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);

  return <pre style={{ whiteSpace: 'pre-wrap' }}>{paragraphValue.input.inputText}</pre>;
};
