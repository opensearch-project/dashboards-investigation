/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useObservable } from 'react-use';
import DOMPurify from 'dompurify';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';

export const OtherParagraph = (props: { paragraphState: ParagraphState<string> }) => {
  const paragraphValue = useObservable(props.paragraphState.getValue$());
  const val = ParagraphState.getOutput(paragraphValue)?.result;
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(val || ''), [val]);

  switch (ParagraphState.getOutput(paragraphValue)?.outputType) {
    case 'HTML':
      return (
        <EuiText>
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        </EuiText>
      );
    case 'IMG':
      return <img alt="" src={'data:image/gif;base64,' + val} />;
    case 'TABLE':
    default:
      return <pre>{val}</pre>;
  }
};
