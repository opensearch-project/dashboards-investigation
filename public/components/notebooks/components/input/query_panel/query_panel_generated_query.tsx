/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiBadge, EuiIcon, EuiText } from '@elastic/eui';
import './query_panel_generated_query.scss';
import { useInputContext } from '../input_context';
import { QueryState } from '../types';

const editQueryText = i18n.translate('notebook.queryPanel.queryPanelGeneratedQuery.editQuery', {
  defaultMessage: 'Edit query',
});

export const QueryPanelGeneratedQuery = () => {
  const { editorRef, inputValue, handleInputChange } = useInputContext();

  const queryState = inputValue as QueryState;
  const { query } = queryState || {};

  if (!query) {
    return null;
  }

  const onEditClick = () => {
    editorRef.current?.setValue(query);

    handleInputChange({
      ...queryState,
      query: undefined,
      value: query,
      isPromptEditorMode: false,
    });
  };

  return (
    <div className="notebookQueryPanelGeneratedQuery">
      <EuiIcon type="editorCodeBlock" size="s" />
      <EuiText
        className="notebookQueryPanelGeneratedQuery__query"
        size="s"
        data-test-subj="notebookQueryPanelGeneratedQuery"
      >
        {query}
      </EuiText>
      <EuiBadge
        data-test-subj="notebookQueryPanelGeneratedQuery_editQuery"
        onClick={onEditClick}
        onClickAriaLabel={editQueryText}
        color="hollow"
      >
        <div
          className="notebookQueryPanelGeneratedQuery__buttonTextWrapper"
          data-test-subj="notebookQueryPanelGeneratedQueryEditButton"
        >
          <EuiText size="xs">{editQueryText}</EuiText>
        </div>
      </EuiBadge>
    </div>
  );
};
