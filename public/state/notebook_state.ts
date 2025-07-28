/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookContext } from 'common/types/notebooks';
import { ObservableState } from './observable_state';
import { ParagraphState, ParagraphStateValue } from './paragraph_state';
import { TopContextState } from './top_context_state';

interface NotebookStateValue {
  paragraphs: ParagraphState[];
  id: string;
  context: TopContextState;
  dataSourceEnabled: boolean;
  dateCreated: string;
  isLoading: boolean;
  path: string;
}

export class NotebookState extends ObservableState<NotebookStateValue> {
  createParagraph(paragraphIndex: number, paragraph: ParagraphState) {
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
  getParagraph(paragraphId: string) {
    return this.value.paragraphs.find((paragraph) => paragraph.value.paragraphId === paragraphId);
  }
  deleteParagraph(paragraphId: string) {
    const newParagraph = this.value.paragraphs;
    const findIndex = newParagraph.findIndex(
      (paragraph) => paragraph.value.paragraphId === paragraphId
    );
    if (findIndex > -1) {
      newParagraph.splice(findIndex, 1);
    }

    this.updateValue({
      paragraphs: newParagraph,
    });

    return this;
  }
  updateParagraphs(paragraphs: ParagraphStateValue[]) {
    this.updateValue({
      paragraphs: paragraphs.map((paragraph) => new ParagraphState(paragraph)),
    });
  }
  getValue$() {
    return super.getValue$();
  }
}
