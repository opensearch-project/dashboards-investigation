/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext } from 'react';
import { NotebookContext } from 'common/types/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useParagraphs } from './use_paragraphs';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { isValidUUID } from '../components/notebooks/components/helpers/notebooks_parser';

export const useNotebook = () => {
  const context = useContext(NotebookReactContext);
  const { showParagraphRunning } = useParagraphs();
  const { http } = context;

  return {
    loadNotebook() {
      showParagraphRunning('queue');
      const { id } = context.state.value;
      const isSavedObjectNotebook = isValidUUID(id);
      const route = isSavedObjectNotebook
        ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${id}`
        : `${NOTEBOOKS_API_PREFIX}/note/${id}`;
      context.state.updateValue({
        isLoading: true,
      });

      const promise = http.get(route).then(async (res) => {
        context.state.updateParagraphs(res.paragraphs);
        context.state.updateValue({
          dateCreated: res.dateCreated,
          path: res.path,
        });
        context.state.updateContext(res.context);
        return res;
      });

      promise.finally(() => {
        context.state.updateValue({
          isLoading: false,
        });
      });

      return promise;
    },
    async updateNotebookContext(newContext: NotebookContext) {
      const { id: openedNoteId } = context.state.value;
      try {
        const response = await http.put(`${NOTEBOOKS_API_PREFIX}/note/updateNotebookContext`, {
          body: JSON.stringify({
            notebookId: openedNoteId,
            context: newContext,
          }),
        });

        context.state.updateContext(newContext);

        return response;
      } catch (error) {
        console.error('Error updating notebook context:', error);
        throw error;
      }
    },
  };
};
