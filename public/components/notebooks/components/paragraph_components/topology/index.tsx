/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useObservable } from 'react-use';

import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import { renderTopologyGraph } from '../../../../../utils/visualization';
import { PERAgentTopology } from '../../../../../../common/types/notebooks';

export const TopologyParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);

  const content = useMemo(() => {
    try {
      const topology: PERAgentTopology = JSON.parse(paragraphValue.input.inputText);
      return renderTopologyGraph(topology);
    } catch (e) {
      return paragraphValue.input.inputText;
    }
  }, [paragraphValue.input.inputText]);

  return <pre style={{ whiteSpace: 'pre-wrap' }}>{content}</pre>;
};
