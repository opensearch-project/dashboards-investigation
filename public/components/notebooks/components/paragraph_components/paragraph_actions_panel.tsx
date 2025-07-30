/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSmallButtonIcon,
} from '@elastic/eui';
import { useState } from 'react';
import { useContext } from 'react';
import { useObservable } from 'react-use';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useParagraphs } from '../../../../hooks/use_paragraphs';

export const ParagraphActionPanel = (props: {
  idx: number;
  scrollToPara: (idx: number) => void;
  deletePara: (idx: number) => void;
}) => {
  const { idx } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { state } = useContext(NotebookReactContext);
  const paragraphStates = useObservable(state.getParagraphStates$(), state.value.paragraphs);
  const { moveParagraph: moveParaHook, createParagraph, cloneParagraph } = useParagraphs();
  const movePara = (index: number, targetIndex: number) => {
    return moveParaHook(index, targetIndex).then((_res) => props.scrollToPara(targetIndex));
  };
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Paragraph actions',
      items: [
        {
          name: 'Insert paragraph above',
          panel: 1,
        },
        {
          name: 'Insert paragraph below',
          panel: 2,
        },
        {
          name: 'Move up',
          disabled: idx === 0,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, idx - 1);
          },
        },
        {
          name: 'Move to top',
          disabled: idx === 0,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, 0);
          },
        },
        {
          name: 'Move down',
          disabled: idx === paragraphStates.length - 1,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, idx + 1);
          },
        },
        {
          name: 'Move to bottom',
          disabled: idx === paragraphStates.length - 1,
          onClick: () => {
            setIsPopoverOpen(false);
            movePara(idx, paragraphStates.length - 1);
          },
        },
        {
          name: 'Duplicate',
          onClick: () => {
            setIsPopoverOpen(false);
            cloneParagraph(idx, idx + 1);
          },
          'data-test-subj': 'duplicateParagraphBtn',
        },
        {
          name: 'Delete',
          onClick: () => {
            setIsPopoverOpen(false);
            props.deletePara(idx);
          },
        },
      ],
    },
    {
      id: 1,
      title: 'Insert paragraph above',
      items: [
        {
          name: 'Code block',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx, '', 'CODE');
          },
        },
        {
          name: 'Visualization',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx, '', 'VISUALIZATION');
          },
        },
        {
          name: 'Deep Research',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx, '', 'DEEP_RESEARCH');
          },
        },
      ],
    },
    {
      id: 2,
      title: 'Insert paragraph below',
      items: [
        {
          name: 'Code block',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx + 1, '', 'CODE');
          },
        },
        {
          name: 'Visualization',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx + 1, '', 'VISUALIZATION');
          },
        },
        {
          name: 'Deep Research',
          onClick: () => {
            setIsPopoverOpen(false);
            createParagraph(idx + 1, '', 'DEEP_RESEARCH');
          },
        },
      ],
    },
  ];

  return (
    <EuiFlexGroup className="notebookHeaderActionMenu">
      <EuiFlexItem grow />
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelPaddingSize="none"
          button={
            <EuiSmallButtonIcon
              aria-label="Open paragraph menu"
              iconType="boxesHorizontal"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className="notebookHeaderActionMenuButton"
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
        >
          <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
