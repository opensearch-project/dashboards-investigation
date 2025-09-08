/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ParagraphState, ParagraphStateValue } from '../../common/state/paragraph_state';
import { OTHER_PARAGRAPH_TYPE } from '../../common/constants/notebooks';
import { Toast } from '../../../../src/core/public';
import { NotebookStateValue } from '../../common/state/notebook_state';

interface RunParagraphParams<TOutputResult, TInputParameters, TFullfilledOutput> {
  paragraphState: ParagraphState<TOutputResult, TInputParameters, TFullfilledOutput>;
  saveParagraph: <T>(props: {
    paragraphStateValue: ParagraphStateValue<T, unknown, {}>;
  }) => Promise<void> | Toast;
  notebookStateValue: NotebookStateValue;
}

export interface ParagraphRegistryItem<
  TOutputResult = any,
  TInputParameters = any,
  TFullfilledOutput = any
> {
  ParagraphComponent: React.FC<{
    paragraphState: ParagraphState<TOutputResult, TInputParameters, TFullfilledOutput>;
  }>;
  getContext?: (
    paragraphState: ParagraphStateValue<TOutputResult, TInputParameters, TFullfilledOutput>
  ) => Promise<string>;
  runParagraph: (
    runParagraphParams: RunParagraphParams<TOutputResult, TInputParameters, TFullfilledOutput>
  ) => Promise<void>;
}

export interface ParagraphServiceSetup {
  register: <TOutputResult, TInputParameters, TFullfilledOutput>(
    type: string | string[],
    paragraph: ParagraphRegistryItem<TOutputResult, TInputParameters, TFullfilledOutput>
  ) => void;
  getParagraphRegistry: (type: string) => ParagraphRegistryItem | undefined;
}

export class ParagraphService {
  private paragraphMap: Map<string, ParagraphRegistryItem> = new Map<
    string,
    ParagraphRegistryItem
  >();

  setup = (): ParagraphServiceSetup => {
    const register = <TOutputResult, TInputParameters, TFullfilledOutput>(
      type: string | string[],
      paragraph: ParagraphRegistryItem<TOutputResult, TInputParameters, TFullfilledOutput>
    ) => {
      const types = Array.isArray(type) ? type : [type];
      types.forEach((t) => {
        if (this.paragraphMap.get(t)) {
          console.error(`paragraph type ${type} has already been registered.`);
          return;
        }
        this.paragraphMap.set(t, paragraph);
      });
    };

    const getParagraphRegistry = (type: string) =>
      this.paragraphMap.get(type) || this.paragraphMap.get(OTHER_PARAGRAPH_TYPE);

    return {
      register,
      getParagraphRegistry,
    };
  };
}
