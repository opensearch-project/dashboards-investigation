/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { useContext } from 'react';
import { useObservable } from 'react-use';
import {
  AI_RESPONSE_TYPE,
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  DASHBOARDS_VISUALIZATION_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  OBSERVABILITY_VISUALIZATION_TYPE,
} from '../../../../../common/constants/notebooks';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { PPLParagraph } from './ppl';
import { getInputType } from '../../../../../common/utils/paragraph';
import { MarkdownParagraph } from './markdown';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { DeepResearchParagraph } from './deep_research';
import { VisualizationParagraph } from './visualization';
import { OtherParagraph } from './other';
import { BubbleUpContainer } from '../bubbleup/bubble_up_container';
import { LogPatternContainer } from '../log_analytics/log_pattern_container';

/**
 * TODO: Use paragraph service to maintain the relationships
 */
const mapParagraphTypeToRenderComponent = {
  ppl: PPLParagraph,
  sql: PPLParagraph,
  md: MarkdownParagraph,
  [DEEP_RESEARCH_PARAGRAPH_TYPE]: DeepResearchParagraph,
  [AI_RESPONSE_TYPE]: DeepResearchParagraph,
  [DASHBOARDS_VISUALIZATION_TYPE.toUpperCase()]: VisualizationParagraph,
  [OBSERVABILITY_VISUALIZATION_TYPE.toUpperCase()]: VisualizationParagraph,
  [DASHBOARDS_VISUALIZATION_TYPE]: VisualizationParagraph,
  [OBSERVABILITY_VISUALIZATION_TYPE]: VisualizationParagraph,
  [ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE]: BubbleUpContainer,
  [LOG_PATTERN_PARAGRAPH_TYPE]: LogPatternContainer,
};

export interface ParagraphProps {
  paragraphState: ParagraphState<unknown>;
  index: number;
  deletePara: (index: number) => void;
  scrollToPara: (idx: number) => void;
}

export const Paragraphs = (props: ParagraphProps) => {
  const { index, scrollToPara, deletePara } = props;

  const context = useContext(NotebookReactContext);
  const paragraph = context.state.value.paragraphs[index];
  const paragraphValue = useObservable(paragraph.getValue$(), paragraph.value);

  const paraClass = `notebooks-paragraph notebooks-paragraph-${
    uiSettingsService.get('theme:darkMode') ? 'dark' : 'light'
  }`;

  return (
    <EuiPanel
      className="notebookParagraphWrapper"
      hasShadow={false}
      paddingSize="none"
      hasBorder={false}
    >
      {<ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />}
      {(() => {
        const RenderComponent =
          mapParagraphTypeToRenderComponent[getInputType(paragraphValue)] || OtherParagraph;
        return (
          <div key={paragraph.value.id} className={paraClass}>
            <RenderComponent paragraphState={paragraph as ParagraphState<any>} />
          </div>
        );
      })()}
    </EuiPanel>
  );
};
