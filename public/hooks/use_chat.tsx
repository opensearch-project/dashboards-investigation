/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useEffect } from 'react';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { SubRouter, useSubRouter } from './use_sub_router';
import { generateParagraphPrompt } from '../services/helpers/per_agent';

export const useChatContextProvider = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { updateContext, paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { page } = useSubRouter();
  const { context: topLevelContext, title, id, paragraphs } = context.state.value;
  const topLevelContextValue = useObservable(topLevelContext.getValue$(), topLevelContext.value);
  console.log('useContextSubscription - updateContext');

  useEffect(() => {
    // Invesitagation metadata
    updateContext(`Investigation-${id}`, {
      label: `Investigation: ${title}`,
      description: 'Metadata information for the investigation',
      value: {
        notebookId: id,
        // TODO we need a better format to show the metadata
        topLevelContext: topLevelContextValue,
      },
      categories: ['chat', 'investigation'],
    });

    async function updateContextWithParagraphs() {
      const prompt = await generateParagraphPrompt({
        paragraphService,
        paragraphs: paragraphs.map((para) => para.value),
      });
      updateContext(`Investigation-${id}-findings`, {
        label: `Findings: ${title}`,
        description: 'Findigns information for the investigation',
        value: {
          notebookId: id,
          paragraphContext: prompt.join('\n'),
        },
        categories: ['chat', 'paragraphs'],
      });
    }

    // Add paragraphs to context only for investigation page
    if (paragraphs.length > 0 && page === SubRouter.Investigation) {
      updateContextWithParagraphs();
    }
    return () => {
      updateContext(`Investigation-${id}`, undefined);
      updateContext(`Investigation-${id}-findings`, undefined);
    };
  }, [updateContext, title, page, id, topLevelContextValue, paragraphService, paragraphs]);
};
