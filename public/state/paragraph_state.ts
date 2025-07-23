/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObservableState } from './observable_state';

interface ParagraphStateValue<TInput extends { type: string }, TOutput, TFullfilledOutput> {
  input: TInput;
  output: TOutput; // output only has some meta data like message_id / task_id
  fullfilledOutput: TFullfilledOutput; // this is the fullfilled output, like PPL query result / PER agent response
  paragraphId: string;
  paragraphType: string; // mardown / sql / ppl / visualization / deep_search
  viewMode: 'inputOnly' | 'outputOnly' | 'both';
}

export class ParagraphState<
  TInput extends { type: string } = { type: string },
  TOutput = {},
  TFullfilledOutput = {}
> extends ObservableState<ParagraphStateValue<TInput, TOutput, TFullfilledOutput>> {
  updateInput(input: Partial<TInput>) {
    this.updateValue({
      input: {
        ...this.value.input,
        ...input,
      },
    });
    return this;
  }
  updateOutput(output: Partial<TOutput>) {
    this.updateValue({
      output: {
        ...this.value.output,
        ...output,
      },
    });
  }
  updateFullfilledOutput(fullfilledOutput: Partial<TOutput>) {
    this.updateValue({
      fullfilledOutput: {
        ...this.value.fullfilledOutput,
        ...fullfilledOutput,
      },
    });
  }
}
