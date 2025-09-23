/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext } from 'react';
import { useEffect } from 'react';
import { combineLatest } from 'rxjs';
import { NoteBookServices } from 'public/types';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { SubRouter, useSubRouter } from './use_sub_router';

export const useContextSubscription = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { updateContext, paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { page } = useSubRouter();
  const { paragraphs, context: topLevelContext, title } = context.state.value;
  useEffect(() => {
    if (page === SubRouter.Investigation) {
      const subscription = combineLatest([
        topLevelContext.getValue$(),
        ...paragraphs.map((paragraph) => paragraph.getValue$()),
      ]).subscribe(async () => {
        console.log('useContextSubscription - updateContext');
        updateContext(0, {
          displayName: `Investigation: ${title}`,
          notebookId: context.state.value.id,
          contextContent: topLevelContext.value,
        });
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [paragraphs, topLevelContext, context.state, paragraphService, updateContext, title, page]);
};
