/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphBackendType } from '../types/notebooks';
import { ObservableState } from './observable_state';

export interface ParagraphStateValue<TOutputResult = string, TFullfilledOutput = {}>
  extends ParagraphBackendType<TOutputResult> {
  fullfilledOutput?: Partial<TFullfilledOutput>; // this is the fullfilled output, like PPL query result / PER agent response
  uiState?: Partial<{
    viewMode: 'input_only' | 'output_only' | 'view_both';
    inQueue?: boolean;
    isRunning?: boolean;
    isOutputStale?: boolean;
  }>;
}

export class ParagraphState<TOutputResult = string, TFullfilledOutput = {}> extends ObservableState<
  ParagraphStateValue<TOutputResult, TFullfilledOutput>
> {
  static getOutput<T>(value?: ParagraphStateValue<T>) {
    if (!value) {
      return undefined;
    }

    return value.output?.[0];
  }
  static updateOutputResult<T>(value: ParagraphStateValue<T>, newResult: T) {
    if (!value || !value.output?.[0]) {
      return value;
    }

    if (typeof newResult === 'string') {
      value.output[0].result = newResult;
    } else {
      value.output[0].result = {
        ...value.output[0].result,
        ...newResult,
      };
    }
    return value;
  }
  protected formatValue(
    value: ParagraphStateValue<TOutputResult, TFullfilledOutput>
  ): ParagraphStateValue<TOutputResult, TFullfilledOutput> {
    return {
      ...value,
      uiState: {
        viewMode: 'view_both',
        ...(value.uiState as Partial<ParagraphStateValue['uiState']>),
      },
    };
  }
  getParagraphType() {
    return this.value.input.inputType;
  }
  getBackgroundValue() {
    const { input, output, id, dateModified, dateCreated } = this.value;
    return {
      input,
      output,
      id,
      dateModified,
      dateCreated,
    };
  }
  updateInput(input: Partial<ParagraphStateValue['input']>) {
    this.updateValue({
      input: {
        ...this.value.input,
        ...input,
      },
    });
    return this;
  }
  updateOutput(
    output: Partial<Required<ParagraphStateValue<TOutputResult, TFullfilledOutput>>['output'][0]>
  ) {
    this.updateValue({
      output: [
        {
          ...(this.value.output?.[0] || {}),
          ...output,
        } as Required<ParagraphStateValue<TOutputResult, TFullfilledOutput>>['output'][0],
      ],
    });
  }
  updateFullfilledOutput(fullfilledOutput: Partial<TFullfilledOutput>) {
    this.updateValue({
      fullfilledOutput: {
        ...this.value.fullfilledOutput,
        ...fullfilledOutput,
      },
    });
  }
  updateUIState(uiState: Partial<ParagraphStateValue['uiState']>) {
    this.updateValue({
      uiState: {
        ...this.value.uiState,
        ...uiState,
      },
    });
  }
}
