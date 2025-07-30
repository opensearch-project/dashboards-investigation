/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer } from 'react';
import { NotebookState } from '../../../state/notebook_state';
import { TopContextState } from '../../../state/top_context_state';
import { notebookReducer, Action } from '../reducers/notebook_reducer';
import { HttpStart } from '../../../../../../src/core/public';

const defaultState = new NotebookState({
  paragraphs: [],
  id: '',
  context: new TopContextState({}),
  dataSourceEnabled: false,
  dateCreated: '',
  isLoading: false,
  path: '',
});

export const NotebookReactContext = React.createContext<{
  state: NotebookState;
  dispatch: React.Dispatch<Action>;
  http: HttpStart;
}>({
  state: defaultState,
  dispatch: () => {},
  http: {} as HttpStart,
});

export const NotebookContextProvider = (props: {
  children: React.ReactChild;
  notebookId: string;
  http: HttpStart;
  dataSourceEnabled: boolean;
}) => {
  const [state, dispatch] = useReducer(
    notebookReducer,
    new NotebookState({
      paragraphs: [],
      id: props.notebookId,
      context: new TopContextState({}),
      dataSourceEnabled: props.dataSourceEnabled,
      isLoading: true,
      dateCreated: '',
      path: '',
    })
  );

  return (
    <NotebookReactContext.Provider
      value={{
        state,
        dispatch,
        http: props.http,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
