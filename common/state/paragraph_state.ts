/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphBackendType } from '../types/notebooks';
import { ObservableState } from './observable_state';

export interface ParagraphAction {
  name: string;
  action: () => void;
}

export interface ParagraphStateValue<
  TOutputResult = string,
  TInputParameters = unknown,
  TFullfilledOutput = {}
> extends ParagraphBackendType<TOutputResult, TInputParameters> {
  fullfilledOutput?: TFullfilledOutput; // this is the fullfilled output, like PPL query result / PER agent response
  uiState?: Partial<{
    viewMode: 'input_only' | 'output_only' | 'view_both';
    inQueue?: boolean;
    isRunning?: boolean;
    isOutputStale?: boolean;
    actions: ParagraphAction[];
    dataDistribution?: {
      fetchDataLoading?: boolean;
      distributionLoading?: boolean;
      error?: string;
    };
    ppl?: { isWaitingForPPLResult?: boolean; error?: string };
  }>;
}

export class ParagraphState<
  TOutputResult = string,
  TInputParameters = unknown,
  TFullfilledOutput = {}
> extends ObservableState<ParagraphStateValue<TOutputResult, TInputParameters, TFullfilledOutput>> {
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

    const newValue = JSON.parse(JSON.stringify({ ...value }));

    if (typeof newResult === 'string') {
      newValue.output[0].result = newResult;
    } else {
      newValue.output[0].result = {
        ...newValue.output[0].result,
        ...newResult,
      };
    }
    return newValue;
  }
  protected formatValue(
    value: ParagraphStateValue<TOutputResult, TInputParameters, TFullfilledOutput>
  ): ParagraphStateValue<TOutputResult, TInputParameters, TFullfilledOutput> {
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
  getBackendValue() {
    const { input, output, id, dateModified, dateCreated, dataSourceMDSId } = this.value;
    return {
      input,
      output,
      id,
      dateModified,
      dateCreated,
      dataSourceMDSId,
    };
  }
  updateInput(
    input: Partial<ParagraphStateValue<TOutputResult, TInputParameters, TFullfilledOutput>['input']>
  ) {
    const { parameters, ...others } = this.value.input ?? {};
    const { parameters: inputParameters, ...inputOthers } = input ?? {};
    let payload: ParagraphStateValue<
      TOutputResult,
      TInputParameters,
      TFullfilledOutput
    >['input'] = {
      ...others,
      ...inputOthers,
    };
    if (parameters || inputParameters) {
      payload = {
        ...payload,
        parameters: {
          ...parameters,
          ...inputParameters,
        } as TInputParameters,
      };
    }
    this.updateValue({
      input: payload,
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
        ...(this.value.fullfilledOutput as TFullfilledOutput),
        ...fullfilledOutput,
      },
    });
  }
  resetFullfilledOutput() {
    this.updateValue({
      fullfilledOutput: {} as TFullfilledOutput,
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
