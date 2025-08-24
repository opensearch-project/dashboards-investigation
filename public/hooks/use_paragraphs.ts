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
    <TInput>(props: {
      index: number;
      input: ParagraphBackendType<unknown, TInput>['input'];
      dataSourceMDSId?: string;
    }) => {
      const addParaObj = {
        noteId: context.state.value.id,
        input: props.input,
        paragraphIndex: props.index,
        dataSourceMDSId: props.dataSourceMDSId,
      };

      return http
        .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          body: JSON.stringify(addParaObj),
        })
        .then((res) => {
          const newParagraphs = [...context.state.value.paragraphs];
          newParagraphs.splice(props.index, 0, new ParagraphState(res));
          context.state.updateValue({
            paragraphs: newParagraphs,
          });
          return context.state.value.paragraphs[props.index];
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
      return createParagraph({
        index,
        input: {
          inputText: para.input.inputText,
          inputType,
        },
        dataSourceMDSId: para.dataSourceMDSId,
      });
    }
  };

  const saveParagraph = useCallback(
    function <T>(props: { paragraphStateValue: ParagraphStateValue<T> }) {
      const { id: paragraphId, input, output, dataSourceMDSId } = props.paragraphStateValue;
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
      const promise = http
        .put<ParagraphBackendType<T>>(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          body: JSON.stringify({
            noteId: context.state.value.id,
            paragraphId,
            input,
            dataSourceMDSId,
            output: outputPayload,
          }),
        })
        .then((res) => {
          if (findUpdateParagraphState) {
            findUpdateParagraphState.updateValue(res);
          }
        });

      promise
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

      return promise;
    },
    [http, context.state.value.id, context.state.value.paragraphs, notifications.toasts]
  );
  const showParagraphRunning = useCallback(
    (param: number | string) => {
      const newParas = context.state.value.paragraphs;
      newParas.forEach((_, index) => {
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
      <TOutput>(props: { index?: number; id?: string }) => {
        const { id: openedNoteId } = context.state.value;
        let index: number = -1;
        if (props.hasOwnProperty('index') && props.index) {
          index = props.index;
        } else {
          index = context.state
            .getParagraphsValue()
            .findIndex((paragraph) => paragraph.id === props.id);
        }

        if (index < 0) {
          notifications.toasts.addDanger('Please provide a valid paragraph index or id to run');
          return;
        }

        const para = context.state.getParagraphsValue()[index];
        const isSavedObjectNotebook = isValidUUID(openedNoteId);
        context.state.value.paragraphs[index].updateUIState({
          isRunning: true,
        });

        const paraUpdateObject = {
          noteId: openedNoteId,
          paragraphId: para.id,
          input: {
            inputType: para.input.inputType,
            inputText: para.input.inputText,
            parameters: para.input.parameters,
          },
          dataSourceMDSId: para.dataSourceMDSId || '',
        };
        const route = isSavedObjectNotebook
          ? `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph/update/run`
          : `${NOTEBOOKS_API_PREFIX}/paragraph/update/run/`;
        return http
          .post<ParagraphBackendType<TOutput>>(route, {
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
          })
          .finally(() => {
            context.state.value.paragraphs[index].updateUIState({
              isRunning: false,
            });
          });
      },
      [context.state, http, notifications.toasts]
    ),
  };
};
