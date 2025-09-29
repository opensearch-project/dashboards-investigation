/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
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
    dateModified: '',
    isLoading: false,
    path: '',
    vizPrefix: '',
    ...props,
  });
};

export const NotebookReactContext = React.createContext<{
  state: NotebookState;
  getAction: <T = unknown>(actionName: string) => T | undefined;
  attachAction: <T>(actionName: string, action: T) => void;
}>({
  state: getDefaultState(),
  getAction: () => undefined,
  attachAction: () => {},
});

export const NotebookContextProvider = (props: NotebookContextProviderProps) => {
  const actionsRef = useRef<Record<string, unknown>>({});

  return (
    <NotebookReactContext.Provider
      value={{
        state: props.state,
        attachAction: (actionName: string, action: unknown) => {
          actionsRef.current[actionName] = action;
        },
        getAction: (actionName: string) => (actionsRef.current[actionName] as unknown) as any,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
