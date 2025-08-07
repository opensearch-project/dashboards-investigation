/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NoteBookServices } from 'public/types';
import { NotebookState, NotebookStateValue } from '../../../../common/state/notebook_state';
import { TopContextState } from '../../../../common/state/top_context_state';
import { HttpStart } from '../../../../../../src/core/public';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

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
  http: HttpStart;
}>({
  state: getDefaultState(),
  http: {} as HttpStart,
});

export const NotebookContextProvider = (props: NotebookContextProviderProps) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  return (
    <NotebookReactContext.Provider
      value={{
        state: props.state,
        http,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
