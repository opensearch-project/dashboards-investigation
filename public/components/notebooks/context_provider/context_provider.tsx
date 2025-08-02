/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { NotebookState } from '../../../../common/state/notebook_state';
import { TopContextState } from '../../../../common/state/top_context_state';
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
  http: HttpStart;
}>({
  state: defaultState,
  http: {} as HttpStart,
});

export const NotebookContextProvider = (props: {
  children: React.ReactChild;
  notebookId: string;
  http: HttpStart;
  dataSourceEnabled: boolean;
}) => {
  const stateRef = useRef(
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
        state: stateRef.current,
        http: props.http,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
