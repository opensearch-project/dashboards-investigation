/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { NoteBookServices } from 'public/types';
import {
  HypothesisItem,
  IndexInsight,
  IndexInsightContent,
  NotebookBackendType,
  NotebookContext,
} from 'common/types/notebooks';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { NOTEBOOKS_API_PREFIX } from '../../common/constants/notebooks';
import { isValidUUID } from '../components/notebooks/components/helpers/notebooks_parser';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';
import { parsePPLQuery } from '../../common/utils';

export const useNotebook = () => {
  const context = useContext(NotebookReactContext);
  const { showParagraphRunning } = context.paragraphHooks;
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
          addIndexCorrelation(content);
          await updateNotebookContext({
            indexInsight: content,
          });
          return content;
        }
      } catch (error) {
        console.error('Error fetching index insights:', error);
        throw error;
      }

      function addIndexCorrelation(content: IndexInsightContent) {
        // FIXME to replace with real data
        if (!content.related_indexes) {
          if (/ss4o_metrics.*/.test(index)) {
            content.related_indexes = [
              {
                index_name: 'ss4o_logs*',
                is_log_index: true,
                log_message_field: 'body',
                time_field: 'time', // get the value from index pattern if possible
              },
              {
                index_name: 'otel-v1-apm-span*',
                is_log_index: false,
              },
            ];
          } else if (/ss4o_logs.*/.test(index)) {
            content.related_indexes = [
              {
                index_name: 'ss4o_metrics*',
                is_log_index: false,
              },
              {
                index_name: 'otel-v1-apm-span*',
                is_log_index: false,
              },
            ];
          } else if (/otel-v1-apm-span.*/.test(index) || /jaeger-span.*/.test(index)) {
            content.related_indexes = [
              {
                index_name: 'ss4o_logs*',
                is_log_index: true,
                log_message_field: 'body',
                time_field: 'time',
              },
              {
                index_name: 'ss4o_metrics*',
                is_log_index: false,
              },
            ];
          }
        }
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
      let contextPayload = {
        ...res.context,
      };

      // try to convert relative time in ppl query to absolute time as
      if (res.context?.variables?.pplQuery) {
        const pplWithAbsoluteTime = parsePPLQuery(
          res.context.variables.pplQuery,
          res.context.currentTime
        ).pplWithAbsoluteTime;
        if (pplWithAbsoluteTime !== res.context.variables.pplQuery) {
          contextPayload = {
            ...contextPayload,
            variables: {
              ...contextPayload.variables,
              pplQuery: pplWithAbsoluteTime,
            },
          };
        }
      }

      if (
        !res.context?.indexInsight &&
        res.context?.index &&
        res.context?.timeField &&
        res.context?.timeRange
      ) {
        let indexInsight;
        try {
          indexInsight = await fetchIndexInsights(res.context.index, res.context?.dataSourceId);
        } catch (error) {
          console.error('Failed to load index insight:', error);
        }
        contextPayload = {
          ...contextPayload,
          indexInsight,
        };
      }
      return {
        ...res,
        vizPrefix: res.vizPrefix || '',
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

  const updateHypotheses = useCallback(
    async (hypotheses: HypothesisItem[], isNewHypotheses?: boolean) => {
      const { id: openedNoteId, runningMemory, historyMemory } = context.state.value;
      try {
        const response = await http.put(`${NOTEBOOKS_API_PREFIX}/note/updateHypotheses`, {
          body: JSON.stringify({
            notebookId: openedNoteId,
            hypotheses,
            ...(isNewHypotheses
              ? { historyMemory: runningMemory }
              : { historyMemory: historyMemory || null }),
            ...(isNewHypotheses
              ? { runningMemory: null }
              : { runningMemory: runningMemory || null }),
          }),
        });

        context.state.updateValue({
          hypotheses,
        });

        return response;
      } catch (error) {
        console.error('Error updating notebook investigation result:', error);
        throw error;
      }
    },
    [context.state, http]
  );

  const deleteHypotheses = useCallback(
    async (hypothesisId?: string) => {
      // Clear old memory IDs before starting new investigation
      context.state.updateValue({ runningMemory: undefined });
      const { id: openedNoteId } = context.state.value;
      try {
        const endpoint = hypothesisId
          ? `${NOTEBOOKS_API_PREFIX}/savedNotebook/${openedNoteId}/deleteHypothesis/${hypothesisId}`
          : `${NOTEBOOKS_API_PREFIX}/savedNotebook/${openedNoteId}/deleteAllHypotheses`;

        await http.delete(endpoint);

        const currentHypotheses = context.state.value.hypotheses || [];
        const updatedHypotheses = hypothesisId
          ? currentHypotheses.filter((h) => h.id !== hypothesisId)
          : [];

        context.state.updateValue({ hypotheses: updatedHypotheses });
      } catch (error) {
        console.error('Error deleting hypotheses:', error);
        throw error;
      }
    },
    [context.state, http]
  );

  return {
    loadNotebook,
    updateNotebookContext,
    updateHypotheses,
    deleteHypotheses,
  };
};
