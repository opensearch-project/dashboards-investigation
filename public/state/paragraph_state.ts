/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObservableState } from './observable_state';

export interface ParagraphStateValue<TInput = {}, TOutput = {}, TFullfilledOutput = {}> {
  input?: Partial<TInput>;
  output?: Partial<TOutput>; // output only has some meta data like message_id / task_id
  fullfilledOutput?: Partial<TFullfilledOutput>; // this is the fullfilled output, like PPL query result / PER agent response
  paragraphId: string;
  paragraphType: string; // mardown / sql / ppl / visualization / deep_search
  viewMode: 'input_only' | 'output_only' | 'view_both';
  inQueue?: boolean;
  isRunning?: boolean;
}

export class ParagraphState<
  TInput = {},
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
  updateFullfilledOutput(fullfilledOutput: Partial<TFullfilledOutput>) {
    this.updateValue({
      fullfilledOutput: {
        ...this.value.fullfilledOutput,
        ...fullfilledOutput,
      },
    });
  }
}
