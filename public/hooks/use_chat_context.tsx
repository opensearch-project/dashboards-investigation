/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useEffect, useMemo } from 'react';
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
  const { context: topLevelContext, title, id, paragraphs, hypotheses } = context.state.value;
  const topLevelContextValue = useObservable(topLevelContext.getValue$(), topLevelContext.value);

  const hypothesesContext = useMemo(() => {
    if (!hypotheses) return '';
    return hypotheses
      .map(
        (hypothesis, index) => `
          ## Hypothesis ${index + 1}
          ${hypothesis.title}
          ## Hypothesis Description
          ${hypothesis.description}
        `
      )
      .join('\n');
  }, [hypotheses]);

  useEffect(() => {
    // Invesitagation metadata
    updateContext(`Investigation-${id}`, {
      label: `Investigation: ${title}`,
      description: 'Metadata information for the investigation',
      value: {
        notebookId: id,
        topLevelContext: topLevelContextValue,
      },
      categories: ['chat', 'investigation'],
    });

    async function updateContextWithParagraphs() {
      const paragraphPrompt = await generateParagraphPrompt({
        paragraphService,
        paragraphs: paragraphs.map((para) => para.value),
      });
      const findingsContext = `## Findings\n\n${paragraphPrompt.filter((item) => item).join('\n')}`;
      updateContext(`Investigation-${id}-findings`, {
        label: `Hypothesis & Findings: ${title}`,
        description: 'Hypothesis and findings information for current investigation',
        value: {
          notebookId: id,
          paragraphContext: hypothesesContext + '\n\n' + findingsContext,
        },
        categories: ['chat', 'investigation', 'hypothesis', 'finding'],
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
  }, [
    updateContext,
    title,
    page,
    id,
    topLevelContextValue,
    paragraphService,
    paragraphs,
    hypothesesContext,
  ]);
};
