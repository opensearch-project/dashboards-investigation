/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useReducer, useState } from 'react';
import { NotebookContext } from '../../../../common/types/notebooks';
import { NotebookState } from '../../../state/notebook_state';
import { TopContextState } from '../../../state/top_context_state';
import { notebookReducer, Action } from '../reducers/notebook_reducer';
import { HttpStart } from '../../../../../../src/core/public';

const defaultState = new NotebookState({
  paragraphs: [],
  id: '',
  context: new TopContextState({}),
});

export const NotebookReactContext = React.createContext<
  (NotebookContext | undefined) & {
    reducer: {
      state: NotebookState;
      dispatch: React.Dispatch<Action>;
    };
    http: HttpStart;
  }
>({
  reducer: {
    state: defaultState,
    dispatch: () => {},
  },
  http: {} as HttpStart,
});

export const NotebookContextProvider = (props: {
  children: React.ReactChild;
  contextInput?: NotebookContext;
  notebookId: string;
  http: HttpStart;
}) => {
  const [specs, setSpecs] = useState<Array<Record<string, unknown>>>(
    props.contextInput?.specs || []
  );
  const [state, dispatch] = useReducer(
    notebookReducer,
    new NotebookState({
      paragraphs: [],
      id: props.notebookId,
      context: new TopContextState({}),
    })
  );

  const reducer = { state, dispatch };

  useEffect(() => {
    if (props.contextInput?.specs) {
      setSpecs(props.contextInput.specs);
    }
  }, [props.contextInput?.specs]);

  const updateSpecs = (newSpecs: Array<Record<string, unknown>>) => {
    setSpecs(newSpecs);
  };
  return (
    <NotebookReactContext.Provider
      value={{
        ...props.contextInput,
        updateSpecs,
        specs,
        reducer,
        http: props.http,
      }}
    >
      {props.children}
    </NotebookReactContext.Provider>
  );
};
