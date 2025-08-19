/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiSmallButtonIcon,
} from '@elastic/eui';
import { of } from 'rxjs';
import { useState } from 'react';
import { useContext } from 'react';
import { useObservable } from 'react-use';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useParagraphs } from '../../../../hooks/use_paragraphs';
import { NotebookType } from '../../../../../common/types/notebooks';

export const ParagraphActionPanel = (props: {
  idx: number;
  scrollToPara: (idx: number) => void;
  deletePara: (idx: number) => void;
}) => {
  const { idx } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { state } = useContext(NotebookReactContext);
  const notebookType = state.getContext().notebookType;
  const paragraphStates = useObservable(state.getParagraphStates$(), state.value.paragraphs);
  const paragraphActions = useObservable(paragraphStates[idx]?.getValue$() ?? of(undefined))
    ?.uiState?.actions;
  const { moveParagraph: moveParaHook, cloneParagraph } = useParagraphs();
  const movePara = (index: number, targetIndex: number) => {
    return moveParaHook(index, targetIndex).then((_res) => props.scrollToPara(targetIndex));
  };
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Paragraph actions',
      items: [
        {
          name: 'Move up',
          disabled: idx === 0 || notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, idx - 1);
          },
        },
        {
          name: 'Move to top',
          disabled: idx === 0 || notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, 0);
          },
        },
        {
          name: 'Move down',
          disabled: idx === paragraphStates.length - 1 || notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, idx + 1);
          },
        },
        {
          name: 'Move to bottom',
          disabled: idx === paragraphStates.length - 1 || notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, paragraphStates.length - 1);
          },
        },
        {
          name: 'Duplicate',
          disabled: notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            cloneParagraph(idx, idx + 1);
          },
          'data-test-subj': 'duplicateParagraphBtn',
        },
        {
          name: 'Delete',
          disabled: idx <= paragraphStates.length - 1 || notebookType === NotebookType.AGENTIC,
          onClick: () => {
            setIsPopoverOpen(false);
            props.deletePara(idx);
          },
        },
        ...(paragraphActions ?? []).map(({ name, action }) => ({
          name,
          onClick: () => {
            setIsPopoverOpen(false);
            action();
          },
        })),
      ],
    },
  ];

  return (
    <div className="notebookHeaderActionMenu">
      <EuiPopover
        panelPaddingSize="none"
        button={
          <EuiSmallButtonIcon
            aria-label="Open paragraph menu"
            iconType="boxesHorizontal"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
      </EuiPopover>
    </div>
  );
};
