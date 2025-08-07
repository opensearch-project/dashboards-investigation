/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { ParagraphBackendType } from 'common/types/notebooks';
import { NoteBookServices } from 'public/types';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { ParagraphState, ParagraphStateValue } from '../../common/state/paragraph_state';
import { isValidUUID } from '../components/notebooks/components/helpers/notebooks_parser';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';

export const useParagraphs = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { notifications, http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { id } = context.state.value;

  const createParagraph = useCallback(
    (index: number, newParaContent: string, inpType: string) => {
      const addParaObj = {
        noteId: context.state.value.id,
        paragraphIndex: index,
        paragraphInput: newParaContent,
        inputType: inpType,
      };

      return http
        .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          body: JSON.stringify(addParaObj),
        })
        .then((res) => {
          const newParagraphs = [...context.state.value.paragraphs];
          newParagraphs.splice(index, 0, new ParagraphState(res));
          context.state.updateValue({
            paragraphs: newParagraphs,
          });
          return context.state.value.paragraphs[index];
        })
        .catch((err) => {
          notifications.toasts.addDanger(
            'Error adding paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        });
    },
    [context, notifications.toasts, http]
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
        const paragraphStates = [...context.state.value.paragraphs];
        paragraphStates.splice(targetIndex, 0, paragraphStates.splice(index, 1)[0]);
        context.state.updateValue({
          paragraphs: paragraphStates,
        });
      })
      .catch((err) => {
        notifications.toasts.addDanger(
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

  const saveParagraph = useCallback(
    function <T>(props: { paragraphStateValue: ParagraphStateValue<T> }) {
      const { id: paragraphId, input, output } = props.paragraphStateValue;
      const findUpdateParagraphState = context.state.value.paragraphs.find(
        (paragraph) => paragraph.value.id === paragraphId
      );
      if (!findUpdateParagraphState) {
        return notifications.toasts.addDanger('The paragraph you want to save can not be found');
      }

      findUpdateParagraphState.updateUIState({
        isRunning: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const outputPayload = output?.map(({ execution_time: executionTime, ...others }) => others);
      return http
        .put<ParagraphBackendType<T>>(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          body: JSON.stringify({
            noteId: context.state.value.id,
            paragraphId,
            paragraphInput: input.inputText,
            paragraphOutput: outputPayload,
          }),
        })
        .then((res) => {
          if (findUpdateParagraphState) {
            findUpdateParagraphState.updateValue(res);
          }
        })
        .catch((err) => {
          notifications.toasts.addDanger(
            'Error updating paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        })
        .finally(() => {
          findUpdateParagraphState.updateUIState({
            isRunning: false,
          });
        });
    },
    [http, context.state.value.id, context.state.value.paragraphs, notifications.toasts]
  );
  const showParagraphRunning = useCallback(
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
  );

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
          const newParagraphs = [...context.state.value.paragraphs];
          newParagraphs.splice(index, 1);
          context.state.updateValue({
            paragraphs: newParagraphs,
          });
          return _res;
        })
        .catch((err) => {
          notifications.toasts.addDanger(
            'Error deleting paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        });
    },
    // Assigns Loading, Running & inQueue for paragraphs in current notebook
    showParagraphRunning,
    moveParagraph,
    cloneParagraph,
    saveParagraph,
    runParagraph: useCallback(
      (index: number) => {
        const { id: openedNoteId } = context.state.value;
        const para = context.state.getParagraphsValue()[index];
        const isSavedObjectNotebook = isValidUUID(openedNoteId);
        showParagraphRunning(index);

        const paraUpdateObject = {
          noteId: openedNoteId,
          paragraphId: para.id,
          paragraphInput: para.input.inputText,
          paragraphType: para.input.inputType || '',
          dataSourceMDSId: para.dataSourceMDSId || '',
        };
        const route = isSavedObjectNotebook
          ? `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph/update/run`
          : `${NOTEBOOKS_API_PREFIX}/paragraph/update/run/`;
        return http
          .post<ParagraphBackendType>(route, {
            body: JSON.stringify(paraUpdateObject),
          })
          .then(async (res) => {
            const paragraphState = context.state.value.paragraphs[index];
            paragraphState.updateValue(res);
          })
          .catch((err) => {
            if (err?.body?.statusCode === 413)
              notifications.toasts.addDanger(`Error running paragraph: ${err.body.message}`);
            else
              notifications.toasts.addDanger(
                'Error running paragraph, please make sure you have the correct permission.'
              );
          });
      },
      [context.state, http, showParagraphRunning, notifications.toasts]
    ),
  };
};
