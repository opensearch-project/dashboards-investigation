/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef } from 'react';
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

export const QueryPanelEditor: React.FC<{
  queryState: QueryState;
  promptModeIsAvailable: boolean;
  handleRunQuery: () => void;
}> = ({ queryState, handleRunQuery, promptModeIsAvailable }) => {
  const { services } = useOpenSearchDashboards<NoteBookServices>();
  const { editorRef, handleInputChange } = useInputContext();

  const { value, queryLanguage, isPromptEditorMode, selectedIndex } = queryState;

  const selectedIndexRef = useRef<any>();
  selectedIndexRef.current = selectedIndex;

  const showPlaceholder = !value.length;

  const {
    isFocused,
    isPromptMode,
    onEditorClick,
    placeholder,
    promptIsTyping,
    ...editorProps
  } = useQueryPanelEditor({
    promptModeIsAvailable: queryLanguage === 'SQL' ? false : promptModeIsAvailable,
    isPromptEditorMode,
    queryLanguage,
    editorTextValue: value || '',
    handleRun: handleRunQuery,
    handleEscape: useCallback(() => {
      handleInputChange({ isPromptEditorMode: false, query: '' });
    }, [handleInputChange]),
    handleSpaceBar: useCallback(() => {
      handleInputChange({ isPromptEditorMode: true });
    }, [handleInputChange]),
    handleChange: (val) => {
      handleInputChange({ value: val });
    },
    isQueryEditorDirty: false,
    services,
    editorRef,
    selectedIndexRef,
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
      <CodeEditor value={value} {...editorProps} />
      {showPlaceholder && (
        <div className={`notebookQueryPanelEditor__placeholder`}>{placeholder}</div>
      )}
    </div>
  );
};
