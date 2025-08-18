/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect } from 'react';
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

export const QueryPanelEditor = () => {
  const { services } = useOpenSearchDashboards<NoteBookServices>();
  const {
    dataView,
    editorRef,
    editorTextRef,
    inputValue,
    setDataView,
    handleSubmit,
    handleInputChange,
  } = useInputContext();

  const queryState = inputValue as QueryState;
  const { value, queryLanguage, isPromptEditorMode } = queryState || {
    value: '',
    queryLanguage: 'PPL' as const,
    isPromptEditorMode: false,
  };

  useEffect(() => {
    services.data.dataViews.getDefault().then((res: any) => {
      setDataView(res);
    });
  }, [setDataView, services.data.dataViews]);

  const {
    isFocused,
    isPromptMode,
    onEditorClick,
    placeholder,
    promptIsTyping,
    showPlaceholder,
    ...editorProps
  } = useQueryPanelEditor({
    promptModeIsAvailable: true,
    isPromptEditorMode,
    queryLanguage,
    // FIXME when no need %ppl
    userQueryString: value.startsWith('%ppl\n') ? value.slice(5) : value,
    handleRun: useCallback(() => {
      handleSubmit();
    }, [handleSubmit]),
    handleEscape: useCallback(() => {
      handleInputChange({ ...queryState, isPromptEditorMode: false });
    }, [queryState, handleInputChange]),
    handleSpaceBar: useCallback(() => {
      handleInputChange({ ...queryState, isPromptEditorMode: true });
    }, [queryState, handleInputChange]),
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
