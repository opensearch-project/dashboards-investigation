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
import { generateContextPromptFromParagraphs } from '../services/helpers/per_agent';

export const useContextSubscription = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { updateContext, paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { paragraphs, context: topLevelContext, title } = context.state.value;
  useEffect(() => {
    const subscription = combineLatest([
      topLevelContext.getValue$(),
      ...paragraphs.map((paragraph) => paragraph.getValue$()),
    ]).subscribe(async () => {
      const finalContext = await generateContextPromptFromParagraphs({
        paragraphService,
        paragraphs: context.state.getParagraphsValue(),
        notebookInfo: topLevelContext.value,
      });

      console.log('useContextSubscription - updateContext');
      updateContext({
        investigation: [
          {
            level: 0,
            displayName: `Investigation: ${title}`,
            notebookId: context.state.value.id,
            contextContent: finalContext,
            notebookInfo: topLevelContext.value,
          },
        ],
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [paragraphs, topLevelContext, context.state, paragraphService, updateContext, title]);
};
