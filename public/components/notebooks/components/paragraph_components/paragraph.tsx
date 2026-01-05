/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { useObservable } from 'react-use';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { FindingHeader } from './finding_header';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { getInputType } from '../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';
import {
  NotebookType,
  FindingParagraphParameters,
  ParagraphBackendType,
} from '../../../../../common/types/notebooks';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { Topology } from '../topology';

export interface ParagraphProps {
  index: number;
  deletePara?: (index: number) => void;
  scrollToPara?: (idx: number) => void;
}

export const Paragraph = (props: ParagraphProps) => {
  const { index, scrollToPara, deletePara } = props;

  const context = useContext(NotebookReactContext);
  const paragraph = context.state.value.paragraphs[index];
  const paragraphValue = useObservable(paragraph?.getValue$(), paragraph?.value);
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();

  if (!paragraph || !paragraphValue) {
    return null;
  }

  const paraClass = `notebooks-paragraph notebooks-paragraph-${
    uiSettingsService.get('theme:darkMode') ? 'dark' : 'light'
  }`;
  const { ParagraphComponent } =
    paragraphService.getParagraphRegistry(getInputType(paragraphValue)) || {};

  const notebookType = context.state.getContext()?.notebookType;

  const isClassicNotebook = notebookType === NotebookType.CLASSIC;
  const isFindingParagraph =
    !isClassicNotebook &&
    !!(paragraphValue.input.parameters as FindingParagraphParameters)?.finding;

  let isActionVisible = isClassicNotebook;
  if (!isClassicNotebook && isFindingParagraph && !context.state.value.isNotebookReadonly) {
    isActionVisible = true;
  }

  const output = ParagraphState.getOutput(paragraphValue);
  const isAIGenerated = !isClassicNotebook && paragraphValue.aiGenerated === true;

  const isTypology =
    paragraphValue.input.inputText.toLowerCase().includes('topology') ||
    (paragraphValue.input.parameters as FindingParagraphParameters)?.finding?.description
      ?.toLowerCase()
      .includes('topology');

  if (isTypology) {
    return (
      <Topology
        legacyTopology={paragraphValue as ParagraphBackendType<string, FindingParagraphParameters>}
      />
    );
  }

  return (
    <div className="notebookParagraphWrapper">
      {isActionVisible && (
        <ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />
      )}
      {ParagraphComponent && (
        <div key={paragraph.value.id} className={paraClass}>
          {isFindingParagraph && !!output && (
            <FindingHeader
              parameters={paragraphValue.input.parameters as FindingParagraphParameters}
              dateModified={paragraphValue.dateModified}
              isAIGenerated={isAIGenerated}
            />
          )}
          <ParagraphComponent
            paragraphState={paragraph}
            actionDisabled={notebookType === NotebookType.AGENTIC}
          />
        </div>
      )}
    </div>
  );
};
