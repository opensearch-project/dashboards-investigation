/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { useObservable } from 'react-use';
import moment from 'moment';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { getInputType } from '../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';
import { NotebookType, FindingParagraphParameters } from '../../../../../common/types/notebooks';
import { ParagraphState } from '../../../../../common/state/paragraph_state';

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
    !isClassicNotebook &&
    !!(paragraphValue.input.parameters as FindingParagraphParameters)?.finding;

  let isActionVisible = isClassicNotebook;
  if (!isClassicNotebook && isFindingParagraph && !context.state.value.isNotebookReadonly) {
    isActionVisible = true;
  }

  const output = ParagraphState.getOutput(paragraphValue);
  const isAIGenerated = !isClassicNotebook && paragraphValue.aiGenerated === true;

  const renderFindingHeader = () => {
    if (!isFindingParagraph || !output) return null;

    const parameters = paragraphValue.input.parameters as FindingParagraphParameters;
    const description = parameters?.finding?.description;
    const importance = parameters?.finding?.importance;
    const feedback = parameters?.finding?.feedback;
    const isTopology = parameters?.finding?.type === 'TOPOLOGY';

    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween" style={{ marginInlineEnd: 20 }}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>
                {isAIGenerated && description && importance !== undefined
                  ? `Finding: ${description} ${isTopology ? '' : `| Importance: ${importance}`}`
                  : 'User Finding'}
              </span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap' }}>
              {isAIGenerated ? 'Updated' : 'Created'}&nbsp;
              {moment(paragraphValue.dateModified).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {isAIGenerated && (
          <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
            <EuiBadge>AI Generated</EuiBadge>
            {feedback === 'CONFIRMED' && <EuiBadge color="warning">Confirmed</EuiBadge>}
            {feedback === 'REJECTED' && <EuiBadge color="warning">Rejected</EuiBadge>}
          </EuiFlexGroup>
        )}
        <EuiSpacer size="s" />
      </>
    );
  };

  return (
    <div className="notebookParagraphWrapper">
      {isActionVisible && (
        <ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />
      )}
      {ParagraphComponent && (
        <div key={paragraph.value.id} className={paraClass}>
          {renderFindingHeader()}
          {(paragraphValue.input.parameters as FindingParagraphParameters)?.finding?.type ===
          'TOPOLOGY' ? (
            <pre style={{ whiteSpace: 'pre-wrap' }}>{output?.result}</pre>
          ) : (
            <ParagraphComponent
              paragraphState={paragraph}
              actionDisabled={notebookType === NotebookType.AGENTIC}
            />
          )}
        </div>
      )}
    </div>
  );
};
