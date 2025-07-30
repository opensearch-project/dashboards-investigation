/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { ACTION_TYPES } from '../components/notebooks/reducers/notebook_reducer';
import { ParagraphState, ParagraphStateValue } from '../state/paragraph_state';
import { ParaType } from '../../common/types/notebooks';

export const useParagraphs = () => {
  const context = useContext(NotebookReactContext);
  const { http } = context;
  const { id } = context.state.value;
  return {
    createParagraph: useCallback(
      (index: number, newParaContent: string, inpType: string) => {
        const paragraphs = context.state.value.paragraphs.map((item) => item.value);
        const addParaObj = {
          noteId: context.state.value.id,
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
            context.dispatch({
              actionType: ACTION_TYPES.UPDATE_PARAGRAPHS,
              payload: {
                paragraphs: newParagraphs,
              },
            });
          });
      },
      [context]
    ),
    deleteParagraph: (para: ParaType, index: number) => {
      if (index < 0) {
        return Promise.reject('Please provide a valid paragraph index');
      }

      return http
        .delete(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          query: {
            noteId: id,
            paragraphId: para.uniqueId,
          },
        })
        .then((_res) => {
          const currentParagraphs = context.state.value.paragraphs.map((value) => value.value);
          const newParagraphs = [...currentParagraphs];
          newParagraphs.splice(index, 1);
          context.state.updateParagraphs(newParagraphs);
          return _res;
        });
    },
    // Assigns Loading, Running & inQueue for paragraphs in current notebook
    showParagraphRunning: useCallback(
      (param: number | string) => {
        const newParas = context.state.value.paragraphs;
        newParas.forEach((_: ParagraphState, index: number) => {
          const payload: Partial<ParagraphStateValue> = {};
          let updateIndex = -1;
          if (param === 'queue') {
            updateIndex = index;
            payload.inQueue = true;
          } else if (param === 'loading') {
            updateIndex = index;
            payload.isRunning = true;
          } else if (param === index) {
            updateIndex = index;
            payload.isRunning = true;
          }
          if (updateIndex > -1) {
            context.state.value.paragraphs[updateIndex].updateValue(payload);
          }
        });
      },
      [context.state]
    ),
  };
};
