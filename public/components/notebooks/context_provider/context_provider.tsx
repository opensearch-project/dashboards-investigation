/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useReducer, useState } from 'react';
import { NotebookContext } from '../../../../common/types/notebooks';
import { initialState, paragraphReducer } from '../reducers/paragraphReducer';

export const NotebookReactContext = React.createContext<NotebookContext | undefined>(undefined);

export const NotebookContextProvider = (props: {
  children: React.ReactChild;
  contextInput?: NotebookContext;
}) => {
  const [specs, setSpecs] = useState<Array<Record<string, unknown>>>(
    props.contextInput?.specs || []
  );
  const [state, dispatch] = useReducer(paragraphReducer, initialState);
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
    <NotebookReactContext.Provider value={{ ...props.contextInput, updateSpecs, specs, reducer }}>
      {props.children}
    </NotebookReactContext.Provider>
  );
};
