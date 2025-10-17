/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NotebookState, NotebookStateValue } from '../../../../common/state/notebook_state';
import { TopContextState } from '../../../../common/state/top_context_state';
import { useParagraphs } from '../../../hooks/use_paragraphs';

export interface NotebookContextProviderProps {
  children: React.ReactChild;
  state: NotebookState;
}

export const getDefaultState = (props?: Partial<NotebookStateValue>) => {
  return new NotebookState({
    paragraphs: [],
    id: '',
    title: '',
    context: new TopContextState({}),
    dataSourceEnabled: false,
    dateCreated: '',
    dateModified: '',
    isLoading: false,
    path: '',
    vizPrefix: '',
    ...props,
  });
};

export const NotebookReactContext = React.createContext<{
  state: NotebookState;
  paragraphHooks: ReturnType<typeof useParagraphs>;
}>({
  state: getDefaultState(),
  paragraphHooks: {} as ReturnType<typeof useParagraphs>,
});

export const NotebookContextProvider = (props: NotebookContextProviderProps) => {
  const context = {
    state: props.state,
  };
  const paragraphHooks = useParagraphs(context);
  return (
    <NotebookReactContext.Provider
      value={{
        ...context,
        paragraphHooks,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
