/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext } from 'react';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { ACTION_TYPES } from '../components/notebooks/reducers/notebook_reducer';

export const useParagraphs = () => {
  const context = useContext(NotebookReactContext);
  return {
    createParagraph: (index: number, newParaContent: string, inpType: string) => {
      const paragraphs = context.reducer.state.value.paragraphs.map((item) => item.value);
      const addParaObj = {
        noteId: context.reducer.state.value.id,
        paragraphIndex: index,
        paragraphInput: newParaContent,
        inputType: inpType,
      };

      return context.http
        .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          body: JSON.stringify(addParaObj),
        })
        .then((res) => {
          const newParagraphs = [...paragraphs];
          newParagraphs.splice(index, 0, res);
          context.reducer.dispatch({
            actionType: ACTION_TYPES.UPDATE_PARAGRAPHS,
            payload: {
              paragraphs: newParagraphs,
            },
          });
        });
    },
  };
};
