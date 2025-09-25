/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiBetaBadge, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import classNames from 'classnames';
import { useInputContext } from '../../input_context';
import { QueryLanguage, QueryState } from '../../types';

import './language_toggle.scss';

export const LanguageToggle: React.FC<{ promptModeIsAvailable: boolean }> = ({
  promptModeIsAvailable,
}) => {
  const {
    inputValue,
    isAgenticNotebook,
    handleInputChange,
    handleSetCurrInputType,
  } = useInputContext();

  const { isPromptEditorMode, queryLanguage } = (inputValue as QueryState) || {};

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onItemClick = useCallback(
    (language: QueryLanguage | 'AI') => {
      closePopover();

      const isAI = language === 'AI';
      const actualLanguage = isAI ? 'PPL' : language;

      handleInputChange({
        value: '',
        query: '',
        queryLanguage: actualLanguage,
        isPromptEditorMode: isAI,
      });

      if (!isAI) {
        handleSetCurrInputType(actualLanguage);
      }
    },
    [closePopover, handleInputChange, handleSetCurrInputType]
  );

  const badgeLabel = isPromptEditorMode ? 'AI' : queryLanguage || 'PPL';

  const items = useMemo(() => {
    const output = [
      <EuiContextMenuItem
        key="PPL"
        onClick={() => onItemClick('PPL')}
        data-test-subj="queryPanelFooterLanguageToggle-PPL"
      >
        PPL
      </EuiContextMenuItem>,
    ];

    if (!isAgenticNotebook) {
      output.push(
        <EuiContextMenuItem
          key="SQL"
          onClick={() => onItemClick('SQL')}
          data-test-subj="queryPanelFooterLanguageToggle-SQL"
        >
          SQL
        </EuiContextMenuItem>
      );
    }

    if (promptModeIsAvailable) {
      output.push(
        <EuiContextMenuItem
          key="ai"
          onClick={() => onItemClick('AI')}
          data-test-subj="queryPanelFooterLanguageToggle-AI"
        >
          AI
        </EuiContextMenuItem>
      );
    }

    return output;
  }, [onItemClick, promptModeIsAvailable, isAgenticNotebook]);

  return (
    // This div is needed to allow for the gradient styling
    <div className="notebookLanguageToggle">
      <EuiPopover
        button={
          <EuiBetaBadge
            onClick={onButtonClick}
            data-test-subj="queryPanelFooterLanguageToggle"
            className={classNames('notebookLanguageToggle__button', {
              ['notebookLanguageToggle__button--aiMode']: isPromptEditorMode,
            })}
            label={badgeLabel}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downCenter"
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    </div>
  );
};
