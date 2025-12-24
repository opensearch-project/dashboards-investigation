/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useObservable } from 'react-use';
import { EuiTitle } from '@elastic/eui';

import { PERAgentTopology } from 'common/types/notebooks';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';

export const TopologyParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);

  return (
    <>
      <EuiTitle size="xs">
        <span>
          TOPOLOGY:{' '}
          {(paragraphValue.input.parameters as Omit<PERAgentTopology, 'body'>)?.description}
        </span>
      </EuiTitle>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{paragraphValue.input.inputText}</pre>
    </>
  );
};
