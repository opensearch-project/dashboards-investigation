/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObservableState } from './observable_state';

interface ParagraphStateValue<TInput extends { type: string }, TOutput, TFullfilledOutput> {
  input: TInput;
  output: TOutput; // output only has some meta data like message_id / task_id
  fullfilledOutput: TFullfilledOutput; // this is the fullfilled output, like PPL query result /
  paragraphId: string;
  paragraphType: string; // mardown / sql / ppl / visualization / deep_search
  viewMode: 'inputOnly' | 'outputOnly' | 'both';
}

export class ParagraphState<
  TInput extends { type: string },
  TOutput = {},
  TFullfilledOutput = {}
> extends ObservableState<ParagraphStateValue<TInput, TOutput, TFullfilledOutput>> {
  updateInput(input: Partial<TInput>) {
    const value = this.getValue();
    this.updateValue({
      input: {
        ...value.input,
        ...input,
      },
    });
    return this;
  }
  updateOutput(output: Partial<TOutput>) {
    const value = this.getValue();
    this.updateValue({
      output: {
        ...value.output,
        ...output,
      },
    });
  }
  updateFullfilledOutput(fullfilledOutput: Partial<TOutput>) {
    const value = this.getValue();
    this.updateValue({
      fullfilledOutput: {
        ...value.fullfilledOutput,
        ...fullfilledOutput,
      },
    });
  }
}
