/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { NoteBookServices } from 'public/types';
import {
  CodeEditor,
  useOpenSearchDashboards,
} from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../input_context';
import { useQueryPanelEditor } from './use_query_panel_editor/use_query_panel_editor';
import { QueryState } from '../types';
import { getPromptModeIsAvailable } from './get_prompt_mode_is_available';

import './query_panel_editor.scss';

export const QueryPanelEditor = () => {
  const { services } = useOpenSearchDashboards<NoteBookServices>();
  const {
    dataView,
    editorRef,
    editorTextRef,
    inputValue,
    dataSourceId,
    setDataView,
    handleSubmit,
    handleInputChange,
  } = useInputContext();
  const [promptModeIsAvailable, setPromptModeIsAvailable] = useState(false);

  const queryState = inputValue as QueryState;
  const { value, queryLanguage, isPromptEditorMode } = queryState || {
    value: '',
    queryLanguage: 'PPL' as const,
    isPromptEditorMode: false,
  };

  useEffect(() => {
    if (!(inputValue as QueryState)?.selectedIndex) {
      const dataset = services.data.query.queryString.getDefaultQuery().dataset;
      if (dataset) {
        // Set dataset to the default
        services.data.query.queryString.setQuery({ dataset });
        handleInputChange({ selectedIndex: dataset });
      }
    }
  }, [inputValue, handleInputChange, services.data.query.queryString]);

  useEffect(() => {
    services.data.dataViews.getDefault().then((res: any) => {
      setDataView(res);
    });
  }, [setDataView, services.data.dataViews]);

  useEffect(() => {
    if (dataSourceId) {
      // Only check t2ppl when there is data source id in global
      // TODO: consider move this to global state
      getPromptModeIsAvailable(services).then(setPromptModeIsAvailable);
    }
  }, [services, dataSourceId]);

  const {
    isFocused,
    isPromptMode,
    onEditorClick,
    placeholder,
    promptIsTyping,
    showPlaceholder,
    ...editorProps
  } = useQueryPanelEditor({
    promptModeIsAvailable,
    isPromptEditorMode,
    queryLanguage,
    // FIXME when no need %ppl
    userQueryString: value.startsWith('%ppl') ? value.slice(5) : value,
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
