/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { NoteBookServices } from 'public/types';
import { IndexInsight, NotebookBackendType, NotebookContext } from 'common/types/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useParagraphs } from './use_paragraphs';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { isValidUUID } from '../components/notebooks/components/helpers/notebooks_parser';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';

export const useNotebook = () => {
  const context = useContext(NotebookReactContext);
  const { showParagraphRunning } = useParagraphs();
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();

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
    async (index: string, dataSourceId: string | undefined) => {
      try {
        const indexInsightResponse: IndexInsight = await callOpenSearchCluster({
          http,
          dataSourceId,
          request: {
            path: `/_plugins/_ml/insights/${index}/LOG_RELATED_INDEX_CHECK`,
            method: 'GET',
          },
        });

        if (indexInsightResponse?.index_insight && indexInsightResponse.index_insight?.content) {
          const content = JSON.parse(indexInsightResponse.index_insight.content);
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
    [updateNotebookContext, http]
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
      let contextPayload = { ...res.context };

      if (
        !res.context?.indexInsight &&
        res.context?.index &&
        res.context?.timeField &&
        res.context?.timeRange
      ) {
        contextPayload = {
          ...contextPayload,
          indexInsight: await fetchIndexInsights(res.context.index, res.context?.dataSourceId),
        };
      }
      return {
        ...res,
        context: contextPayload,
      };
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
