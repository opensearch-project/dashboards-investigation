/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { IndexInsights, NotebookBackendType, NotebookContext } from 'common/types/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useParagraphs } from './use_paragraphs';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { isValidUUID } from '../components/notebooks/components/helpers/notebooks_parser';

const fetchIndexInsightMock = (index: string): Promise<IndexInsights> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        index_insights: [
          {
            index_name: index,
            content:
              '{"is_log_index": true, "log_message_field": "body", "trace_id_field": "traceId"}',
            status: 'generating',
            task_type: 'INDEX_DESCRIPTION',
            last_updated_time: 1753671175376,
          },
        ],
      });
    }, 3000);
  });
};

export const useNotebook = () => {
  const context = useContext(NotebookReactContext);
  const { showParagraphRunning } = useParagraphs();
  const { http } = context;

  const updateNotebookContext = useCallback(
    async (newContext: Partial<NotebookContext>) => {
      const { id: openedNoteId, context: currentContext } = context.state.value;
      try {
        const response = await http.put(`${NOTEBOOKS_API_PREFIX}/note/updateNotebookContext`, {
          body: JSON.stringify({
            notebookId: openedNoteId,
            context: {
              ...currentContext.value,
              ...newContext,
            },
          }),
        });

        context.state.updateContext(newContext);

        return response;
      } catch (error) {
        console.error('Error updating notebook context:', error);
        throw error;
      }
    },
    [context.state, http]
  );

  const fetchIndexInsights = useCallback(
    async (index: string) => {
      try {
        const indexInsightResponse = await fetchIndexInsightMock(index);
        if (
          indexInsightResponse?.index_insights &&
          indexInsightResponse.index_insights.length > 0
        ) {
          const content = JSON.parse(indexInsightResponse.index_insights[0]?.content);
          await updateNotebookContext({
            indexInsight: content,
          });
          return content;
        }
      } catch (error) {
        console.error('Error fetching index insights:', error);
        throw error;
      }
    },
    [updateNotebookContext]
  );

  const loadNotebook = useCallback(() => {
    showParagraphRunning('queue');
    const { id } = context.state.value;
    const isSavedObjectNotebook = isValidUUID(id);
    const route = isSavedObjectNotebook
      ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${id}`
      : `${NOTEBOOKS_API_PREFIX}/note/${id}`;
    context.state.updateValue({
      isLoading: true,
    });

    const promise = http.get<NotebookBackendType>(route).then(async (res) => {
      context.state.updateValue({
        dateCreated: res.dateCreated,
        path: res.path,
        vizPrefix: res.vizPrefix || '',
      });
      if (res.context) context.state.updateContext(res.context);

      if (
        !res.context?.indexInsight &&
        res.context?.index &&
        res.context?.timeField &&
        res.context?.timeRange
      ) {
        const resWithIndexInsight = {
          ...res,
          context: { ...res.context, indexInsight: await fetchIndexInsights(res.context.index) },
        };
        return resWithIndexInsight;
      }
      return res;
    });

    promise.finally(() => {
      context.state.updateValue({
        isLoading: false,
      });
    });

    return promise;
  }, [context.state, http, showParagraphRunning, fetchIndexInsights]);

  return {
    loadNotebook,
    updateNotebookContext,
  };
};
