/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useContext, useEffect, useMemo } from 'react';
import { of } from 'rxjs';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { generateParagraphPrompt } from '../services/helpers/per_agent';

export const useChatContextProvider = () => {
  const context = useContext(NotebookReactContext);
  const {
    services: { updateContext, paragraphService, chat },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { context: topLevelContext, title, id, paragraphs, hypotheses } = context.state.value;
  const topLevelContextValue = useObservable(topLevelContext.getValue$(), topLevelContext.value);
  const chatThreadId$ = useMemo(() => {
    if (!chat?.chatService?.getThreadId$) {
      return of('');
    }
    return chat.chatService.getThreadId$();
  }, [chat?.chatService]);
  const chatThreadId = useObservable(chatThreadId$);

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
    if (!title) {
      return;
    }

    let changed = false;
    const contextId = `Investigation-${id}`;

    async function updateContextWithParagraphs() {
      const paragraphPrompt = await generateParagraphPrompt({
        paragraphService,
        paragraphs: paragraphs
          // Only MARKDOWN paragraph allowed to avoid context too large
          .filter((paragraph) => ['MARKDOWN'].includes(paragraph.getParagraphType()))
          .map((para) => para.value),
      });
      if (changed) {
        return;
      }
      const findingsContext = `## Findings\n\n${paragraphPrompt.filter((item) => item).join('\n')}`;
      updateContext(contextId, {
        label: `Investigation: ${title}`,
        description: 'Metadata, hypotheses and findings for the investigation',
        value: {
          notebookId: id,
          metadata: topLevelContextValue,
          hypotheses: hypothesesContext,
          findings: findingsContext,
        },
        categories: ['chat', 'investigation'],
      });
    }

    updateContextWithParagraphs();
    return () => {
      changed = true;
      updateContext(contextId, undefined);
    };
  }, [
    updateContext,
    title,
    id,
    topLevelContextValue,
    paragraphService,
    paragraphs,
    hypothesesContext,
    // Rebuilt chat context after thread changes, make sure context not been cleared
    chatThreadId,
  ]);
};
