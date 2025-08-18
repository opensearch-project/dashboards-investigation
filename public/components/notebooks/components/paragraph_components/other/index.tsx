/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { Media } from '@nteract/outputs';
import { useObservable } from 'react-use';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';

export const OtherParagraph = (props: { paragraphState: ParagraphState<string> }) => {
  const paragraphValue = useObservable(props.paragraphState.getValue$());
  const val = ParagraphState.getOutput(paragraphValue)?.result;

  switch (ParagraphState.getOutput(paragraphValue)?.outputType) {
    case 'HTML':
      return (
        <EuiText>
          {/* eslint-disable-next-line react/jsx-pascal-case */}
          <Media.HTML data={val} />
        </EuiText>
      );
    case 'IMG':
      return <img alt="" src={'data:image/gif;base64,' + val} />;
    case 'TABLE':
    default:
      return <pre>{val}</pre>;
  }
};
