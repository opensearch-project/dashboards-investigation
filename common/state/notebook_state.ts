/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { distinctUntilChanged, map } from 'rxjs/operators';
import { NotebookContext } from 'common/types/notebooks';
import { ObservableState } from './observable_state';
import { ParagraphState, ParagraphStateValue } from './paragraph_state';
import { TopContextState } from './top_context_state';

interface NotebookStateValue {
  paragraphs: Array<ParagraphState<unknown>>;
  id: string;
  context: TopContextState;
  dataSourceEnabled: boolean;
  dateCreated: string;
  isLoading: boolean;
  path: string;
}

export class NotebookState extends ObservableState<NotebookStateValue> {
  createParagraph(paragraphIndex: number, paragraph: ParagraphState<unknown>) {
    const newParagraph = this.value.paragraphs;
    newParagraph.splice(paragraphIndex, 0, paragraph);
    this.updateValue({
      paragraphs: newParagraph,
    });
    return this;
  }
  updateContext(context: Partial<NotebookContext>) {
    this.value.context.updateValue(context);
    return this;
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
  updateParagraphs(paragraphs: Array<ParagraphStateValue<unknown>>) {
    this.updateValue({
      paragraphs: paragraphs.map((paragraph) => new ParagraphState<unknown>(paragraph)),
    });
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
    return this.value.paragraphs.map((paragraph) => paragraph.getBackgroundValue());
  }
}
