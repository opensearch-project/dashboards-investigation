/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { distinctUntilChanged, map } from 'rxjs/operators';
import { NotebookContext } from 'common/types/notebooks';
import { ObservableState } from './observable_state';
import { ParagraphState } from './paragraph_state';
import { TopContextState } from './top_context_state';

export interface NotebookStateValue {
  paragraphs: Array<ParagraphState<unknown>>;
  id: string;
  context: TopContextState;
  dataSourceEnabled: boolean;
  dateCreated: string;
  dateModified: string;
  isLoading: boolean;
  path: string;
  vizPrefix: string;
  owner?: string;
}

export class NotebookState extends ObservableState<NotebookStateValue> {
  updateContext(context: Partial<NotebookContext>) {
    this.value.context.updateValue(context);
    return this;
  }

  getContext(): NotebookContext {
    return this.value.context.value;
  }

  deleteParagraph(paragraphId: string) {
    const newParagraph = this.value.paragraphs;
    const findIndex = newParagraph.findIndex((paragraph) => paragraph.value.id === paragraphId);
    if (findIndex > -1) {
      newParagraph.splice(findIndex, 1);
    }

    this.updateValue({
      paragraphs: newParagraph,
    });

    return this;
  }
  getParagraphStates$() {
    return this.getValue$().pipe(
      map((state) => state.paragraphs),
      distinctUntilChanged((a, b) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a !== b) return false;
        }
        return true;
      })
    );
  }
  getParagraphsValue() {
    return this.value.paragraphs.map((paragraph) => paragraph.value);
  }
  // this is used for get pure backend values that needs to be persist into backend
  getParagraphsBackendValue() {
    return this.value.paragraphs.map((paragraph) => paragraph.getBackendValue());
  }
}
