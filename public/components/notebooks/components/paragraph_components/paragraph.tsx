/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useContext } from 'react';
import { useObservable } from 'react-use';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { getInputType } from '../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';
import { isAgenticRunBefore } from './utils';
import { NotebookType } from '../../../../../common/types/notebooks';

export interface ParagraphProps {
  index: number;
  deletePara?: (index: number) => void;
  scrollToPara?: (idx: number) => void;
}

export const Paragraph = (props: ParagraphProps) => {
  const { index, scrollToPara, deletePara } = props;

  const context = useContext(NotebookReactContext);
  const paragraph = context.state.value.paragraphs[index];
  const paragraphValue = useObservable(paragraph.getValue$(), paragraph.value);
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();

  const paraClass = `notebooks-paragraph notebooks-paragraph-${
    uiSettingsService.get('theme:darkMode') ? 'dark' : 'light'
  }`;
  const { ParagraphComponent } =
    paragraphService.getParagraphRegistry(getInputType(paragraphValue)) || {};

  const notebookType = context.state.getContext()?.notebookType;

  const isClassicNotebook = notebookType === NotebookType.CLASSIC;
  const isFindingParagraph =
    notebookType !== NotebookType.CLASSIC && paragraph.value.input.inputType === 'MARKDOWN';

  return (
    <div className="notebookParagraphWrapper">
      {(isClassicNotebook || isFindingParagraph) && (
        <ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />
      )}
      {ParagraphComponent && (
        <div key={paragraph.value.id} className={paraClass}>
          <ParagraphComponent
            paragraphState={paragraph}
            actionDisabled={isAgenticRunBefore({
              notebookState: context.state,
              id: paragraphValue.id,
            })}
          />
        </div>
      )}
    </div>
  );
};
