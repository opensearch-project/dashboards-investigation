/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphStateValue } from '../../../state/paragraph_state';
import { NotebookState } from '../../../state/notebook_state';

export enum ACTION_TYPES {
  UPDATE_PARAGRAPHS = 'updateParagraphs',
}

export interface UpdateParagraphsAction {
  actionType: ACTION_TYPES.UPDATE_PARAGRAPHS;
  payload: {
    paragraphs: ParagraphStateValue[];
  };
}

export type Action = UpdateParagraphsAction;

export interface ParagraphContextType {
  state: NotebookState;
  dispatch: React.Dispatch<Action>;
}

export function notebookReducer(state: NotebookState, action: Action) {
  switch (action.actionType) {
    case ACTION_TYPES.UPDATE_PARAGRAPHS:
      state.updateParagraphs(action.payload.paragraphs);
      return state;
    default:
      return state;
  }
}
