/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookContext } from 'common/types/notebooks';
import { ObservableState } from './observable_state';

export class TopContextState extends ObservableState<NotebookContext> {
  public updateValue(value: Partial<NotebookContext>) {
    return super.updateValue(value);
  }
}
