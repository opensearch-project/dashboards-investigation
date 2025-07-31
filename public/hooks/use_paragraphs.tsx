/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { ParagraphState, ParagraphStateValue } from '../state/paragraph_state';
import { getCoreStart } from '../services';

export const useParagraphs = () => {
  const context = useContext(NotebookReactContext);
  const { http } = context;
  const { id } = context.state.value;

  const createParagraph = useCallback(
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
          context.state.updateParagraphs(newParagraphs);
        })
        .catch((err) => {
          getCoreStart().notifications.toasts.addDanger(
            'Error adding paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        });
    },
    [context]
  );

  // Function to move a paragraph
  const moveParagraph = (index: number, targetIndex: number) => {
    const newParagraphs = [...context.state.getParagraphsBackendValue()];
    newParagraphs.splice(targetIndex, 0, newParagraphs.splice(index, 1)[0]);

    const moveParaObj = {
      noteId: id,
      paragraphs: newParagraphs,
    };

    return http
      .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/set_paragraphs`, {
        body: JSON.stringify(moveParaObj),
      })
      .then((_res) => {
        context.state.updateParagraphs(newParagraphs);
      })
      .catch((err) => {
        getCoreStart().notifications.toasts.addDanger(
          'Error moving paragraphs, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  // Function to clone a paragraph
  const cloneParagraph = (currentIndex: number, index: number) => {
    const para = context.state.getParagraphsBackendValue()[currentIndex];
    let inputType = 'CODE';
    if (para.output?.[0].outputType === 'VISUALIZATION') {
      inputType = 'VISUALIZATION';
    }
    if (para.output?.[0].outputType === 'OBSERVABILITY_VISUALIZATION') {
      inputType = 'OBSERVABILITY_VISUALIZATION';
    }
    if (index !== -1) {
      return createParagraph(index, para.input.inputText, inputType);
    }
  };

  return {
    createParagraph,
    deleteParagraph: (index: number) => {
      if (index < 0) {
        return Promise.reject('Please provide a valid paragraph index');
      }
      const paragraph = context.state.getParagraphsBackendValue()[index];

      return http
        .delete(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          query: {
            noteId: id,
            paragraphId: paragraph.id,
          },
        })
        .then((_res) => {
          const currentParagraphs = context.state.value.paragraphs.map((value) => value.value);
          const newParagraphs = [...currentParagraphs];
          newParagraphs.splice(index, 1);
          context.state.updateParagraphs(newParagraphs);
          return _res;
        })
        .catch((err) => {
          getCoreStart().notifications.toasts.addDanger(
            'Error deleting paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        });
    },
    // Assigns Loading, Running & inQueue for paragraphs in current notebook
    showParagraphRunning: useCallback(
      (param: number | string) => {
        const newParas = context.state.value.paragraphs;
        newParas.forEach((_: ParagraphState, index: number) => {
          const payload: Partial<ParagraphStateValue['uiState']> = {};
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
            context.state.value.paragraphs[updateIndex].updateUIState(payload);
          }
        });
      },
      [context.state]
    ),
    moveParagraph,
    cloneParagraph,
  };
};
