/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ACTION_TYPES {
  CREATE_PARAGRAPH_REQUEST = 'createNewParagraph',
  CREATE_PARAGRAPH_SUCCESS = 'createNewParagraphSuccess',
  CREATE_PARAGRAPH_FAILURE = 'createNewParagraphFailure',
}

export interface ParagraphState {
  // paragraph: ParaType;
  isLoading: boolean;
  error: string | null;
  paragraphInput: string;
}

export interface CreateParagraphRequestAction {
  actionType: ACTION_TYPES.CREATE_PARAGRAPH_REQUEST;
  payload: {
    paragraphType: string;
  };
}

export interface CreateParagraphSuccessAction {
  actionType: ACTION_TYPES.CREATE_PARAGRAPH_SUCCESS;
  // payload: {
  //     paragraph: ParaType;
  // };
}

export interface CreateParagraphFailureAction {
  actionType: ACTION_TYPES.CREATE_PARAGRAPH_FAILURE;
  payload: {
    error: string;
  };
}

export type Action =
  | CreateParagraphRequestAction
  | CreateParagraphSuccessAction
  | CreateParagraphFailureAction;

export interface ParagraphContextType {
  state: ParagraphState;
  dispatch: React.Dispatch<Action>;
}

export const initialState = {
  isLoading: false,
  error: null,
  paragraphInput: '',
};

export function paragraphReducer(state: ParagraphState, action: Action) {
  switch (action.actionType) {
    case ACTION_TYPES.CREATE_PARAGRAPH_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case ACTION_TYPES.CREATE_PARAGRAPH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        paragraphInput: '',
      };

    case ACTION_TYPES.CREATE_PARAGRAPH_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload?.error,
      };

    default:
      return state;
  }
}
