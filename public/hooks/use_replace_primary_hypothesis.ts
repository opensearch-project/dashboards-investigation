/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useCallback } from 'react';
import { i18n } from '@osd/i18n';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../types';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { useNotebook } from './use_notebook';

export const useReplaceAsPrimary = () => {
  const {
    services: { notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const notebookContext = useContext(NotebookReactContext);
  const { updateHypotheses } = useNotebook();

  const replaceAsPrimary = useCallback(
    async (hypothesisId: string) => {
      const { hypotheses } = notebookContext.state.value;
      try {
        const currentHypotheses = hypotheses || [];
        const targetIndex = currentHypotheses.findIndex((h) => h.id === hypothesisId);
        if (targetIndex === -1) return;

        const reorderedHypotheses = [...currentHypotheses];
        const [targetHypothesis] = reorderedHypotheses.splice(targetIndex, 1);
        reorderedHypotheses.unshift(targetHypothesis);

        await updateHypotheses(reorderedHypotheses);
        notebookContext.state.updateValue({ isPromoted: true });
        notifications.toasts.addSuccess(
          i18n.translate('notebook.hypotheses.primaryHypothesisUpdated', {
            defaultMessage: 'Primary hypothesis updated successfully',
          })
        );
      } catch (error) {
        notifications.toasts.addDanger(
          i18n.translate('notebook.hypotheses.failedToUpdatePrimaryHypothesis', {
            defaultMessage: 'Failed to update primary hypothesis',
          })
        );
        console.error(error);
      }
    },
    [notebookContext.state, updateHypotheses, notifications.toasts]
  );

  return { replaceAsPrimary };
};
