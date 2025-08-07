/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NotebookState, NotebookStateValue } from '../../../../common/state/notebook_state';
import { TopContextState } from '../../../../common/state/top_context_state';

export interface NotebookContextProviderProps {
  children: React.ReactChild;
  state: NotebookState;
}

export const getDefaultState = (props?: Partial<NotebookStateValue>) => {
  return new NotebookState({
    paragraphs: [],
    id: '',
    context: new TopContextState({}),
    dataSourceEnabled: false,
    dateCreated: '',
    isLoading: false,
    path: '',
    ...props,
  });
};

export const NotebookReactContext = React.createContext<{
  state: NotebookState;
}>({
  state: getDefaultState(),
});

export const NotebookContextProvider = (props: NotebookContextProviderProps) => {
  return (
    <NotebookReactContext.Provider
      value={{
        state: props.state,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
