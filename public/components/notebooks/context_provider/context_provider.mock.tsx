/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  NotebookContextProvider,
  NotebookContextProviderProps,
  getDefaultState,
} from './context_provider';
import { ParagraphState, ParagraphStateValue } from '../../../../common/state/paragraph_state';

export const MockContextProvider = (
  props: Omit<NotebookContextProviderProps, 'state'> & {
    paragraphValues: ParagraphStateValue[];
  }
) => {
  const defaultStateRef = useRef(
    getDefaultState({
      paragraphs: props.paragraphValues.map((paragraph) => new ParagraphState<unknown>(paragraph)),
    })
  );
  return <NotebookContextProvider {...props} state={defaultStateRef.current} />;
};
