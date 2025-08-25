/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import classNames from 'classnames';
import { NoteBookServices } from 'public/types';
import {
  CodeEditor,
  useOpenSearchDashboards,
} from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../input_context';
import { useQueryPanelEditor } from './use_query_panel_editor/use_query_panel_editor';
import { QueryState } from '../types';

import './query_panel_editor.scss';

export const QueryPanelEditor: React.FC<{ promptModeIsAvailable: boolean }> = ({
  promptModeIsAvailable,
}) => {
  const { services } = useOpenSearchDashboards<NoteBookServices>();
  const {
    dataView,
    editorRef,
    editorTextRef,
    inputValue,
    handleSubmit,
    handleInputChange,
  } = useInputContext();

  const queryState = inputValue as QueryState;
  const { value, queryLanguage, isPromptEditorMode } = queryState || {
    value: '',
    queryLanguage: 'PPL' as const,
    isPromptEditorMode: false,
  };

  const {
    isFocused,
    isPromptMode,
    onEditorClick,
    placeholder,
    promptIsTyping,
    showPlaceholder,
    ...editorProps
  } = useQueryPanelEditor({
    promptModeIsAvailable: queryLanguage === 'SQL' ? false : promptModeIsAvailable,
    isPromptEditorMode,
    queryLanguage,
    userQueryString: value,
    handleRun: useCallback(() => {
      handleSubmit();
    }, [handleSubmit]),
    handleEscape: useCallback(() => {
      handleInputChange({ isPromptEditorMode: false });
    }, [handleInputChange]),
    handleSpaceBar: useCallback(() => {
      handleInputChange({ isPromptEditorMode: true });
    }, [handleInputChange]),
    handleChange: () => {},
    isQueryEditorDirty: false,
    services,
    editorRef,
    editorTextRef,
    datasetId: dataView?.id,
  });
  return (
    // Suppressing below as this should only happen for click events.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      className={classNames('notebookQueryPanelEditor', {
        ['notebookQueryPanelEditor--focused']: isFocused,
        ['notebookQueryPanelEditor--promptMode']: isPromptMode,
        ['notebookQueryPanelEditor--promptIsTyping']: promptIsTyping,
      })}
      data-test-subj="notebookQueryPanelEditor"
      onClick={onEditorClick}
    >
      <CodeEditor {...editorProps} />
      {showPlaceholder ? (
        <div className={`notebookQueryPanelEditor__placeholder`}>{placeholder}</div>
      ) : null}
    </div>
  );
};
