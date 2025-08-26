/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { useContext } from 'react';
import { useObservable } from 'react-use';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { getInputType } from '../../../../../common/utils/paragraph';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';

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
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();

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
        const RenderComponent = paragraphService.getParagraphRegistry(getInputType(paragraphValue))
          ?.renderParagraph;
        if (!RenderComponent) {
          return null;
        }

        return (
          <div key={paragraph.value.id} className={paraClass}>
            <RenderComponent paragraphState={paragraph as ParagraphState<any, any>} />
          </div>
        );
      })()}
    </EuiPanel>
  );
};
