/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSmallButtonIcon,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { NoteBookServices } from 'public/types';
import { isEmpty } from 'lodash';
import { QueryPanelEditor } from './query_panel_editor';
import { QueryPanelGeneratedQuery } from './query_panel_generated_query';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../input_context';
import { QueryLanguage, QueryState } from '../types';

import './query_panel.scss';
import { getPromptModeIsAvailable } from './get_prompt_mode_is_available';
import { LanguageToggle } from './language_toggle';
import { IndexSelector } from './index_selector.tsx/index_selector';
import {
  QueryAssistParameters,
  QueryAssistResponse,
} from '../../../../../../../../src/plugins/query_enhancements/common/query_assist';

interface QueryPanelProps {
  prependWidget?: React.ReactNode;
  appendWidget?: React.ReactNode;
}

export const QUERY_PANEL_INITIAL_STATE = {
  value: '',
  query: '',
  queryLanguage: 'PPL' as QueryLanguage,
  isPromptEditorMode: false,
  timeRange: { from: 'now-15m', to: 'now' },
  selectedIndex: {
    title: '',
    fields: [],
  },
  noDatePicker: false,
};

export const QueryPanel: React.FC<QueryPanelProps> = ({ prependWidget, appendWidget }) => {
  const {
    services,
    services: {
      uiSettings,
      data: { indexPatterns },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const {
    editorTextRef,
    inputValue,
    dataSourceId,
    isLoading,
    paragraphInput,
    handleInputChange,
    handleSubmit,
  } = useInputContext();

  const [promptModeIsAvailable, setPromptModeIsAvailable] = useState(false);
  const [isQueryPanelMenuOpen, setIsQueryPanelMenuOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const queryState = (inputValue && typeof inputValue !== 'string'
    ? inputValue
    : QUERY_PANEL_INITIAL_STATE) as QueryState;
  const { queryLanguage, isPromptEditorMode, selectedIndex, timeRange, noDatePicker } = queryState;

  useEffect(() => {
    // TODO: consider move this to global state
    getPromptModeIsAvailable(services, dataSourceId).then(setPromptModeIsAvailable);
  }, [services, dataSourceId]);

  useEffect(() => {
    const handleInitalInput = async () => {
      if (
        !isFetching &&
        paragraphInput &&
        (paragraphInput.inputType === 'PPL' || paragraphInput.inputType === 'SQL') &&
        (isEmpty(inputValue) || typeof inputValue === 'string')
      ) {
        // Set up input value from paragraph input
        try {
          setIsFetching(true);
          const value = paragraphInput.inputText;
          const {
            timeRange: inputTimeRange,
            query,
            indexName,
            timeField,
            noDatePicker: inputNoDatePicker,
          } = (paragraphInput.parameters as any) || {};

          const fields = indexName
            ? await indexPatterns.getFieldsForWildcard({
                pattern: indexName,
                dataSourceId,
              })
            : [];

          handleInputChange({
            value,
            query,
            queryLanguage: paragraphInput.inputType as QueryLanguage,
            // If question is defined, indicate the user executed t2ppl previously
            isPromptEditorMode: !isEmpty(query),
            timeRange: inputTimeRange,
            selectedIndex: {
              title: indexName || '',
              fields,
              timeField,
            },
            noDatePicker: inputNoDatePicker,
          });
        } catch (err) {
          console.log('error', err);
        } finally {
          setIsFetching(false);
        }
      } else if (typeof inputValue === 'string' || isEmpty(inputValue)) {
        handleInputChange(QUERY_PANEL_INITIAL_STATE);
      }
    };
    handleInitalInput();
  }, [paragraphInput, handleInputChange, indexPatterns, dataSourceId, inputValue, isFetching]);

  const handleTimeChange = useCallback(
    (props) => {
      handleInputChange({ timeRange: { from: props.start, to: props.end } });
    },
    [handleInputChange]
  );

  const handleGenerateQuery = useCallback(async () => {
    if (
      paragraphInput?.inputText &&
      editorTextRef.current === (paragraphInput?.parameters as any)?.question
    ) {
      // Don't regenerate PPL query if the input NL question isn't changed
      return paragraphInput?.inputText;
    }
    setIsFetching(true);
    const params: QueryAssistParameters = {
      question: editorTextRef.current,
      index: selectedIndex.title,
      language: queryLanguage,
      dataSourceId,
    };

    const { query } = await services.http.post<QueryAssistResponse>(
      '/api/enhancements/assist/generate',
      {
        body: JSON.stringify(params),
      }
    );

    handleInputChange({ query });
    setIsFetching(false);

    return query;
  }, [
    paragraphInput,
    editorTextRef,
    selectedIndex.title,
    queryLanguage,
    dataSourceId,
    services.http,
    handleInputChange,
  ]);

  const handleRunQuery = useCallback(async () => {
    handleSubmit(editorTextRef.current, {
      timeRange,
      indexName: selectedIndex?.title,
      timeField: selectedIndex?.timeField,
      query: isPromptEditorMode ? await handleGenerateQuery() : '',
      noDatePicker,
    });
  }, [
    handleSubmit,
    handleGenerateQuery,
    editorTextRef,
    isPromptEditorMode,
    noDatePicker,
    selectedIndex,
    timeRange,
  ]);

  const isQueryPanelLoading = isFetching || isLoading;

  if (!queryState) {
    return null;
  }

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiFlexGroup
        className="notebookQueryPanelWidgets"
        gutterSize="none"
        dir="row"
        alignItems="center"
      >
        {prependWidget}
        <LanguageToggle promptModeIsAvailable={promptModeIsAvailable} />
        <div className="notebookQueryPanelWidgets__indexSelectorWrapper">
          <IndexSelector />
        </div>
        {queryLanguage === 'PPL' && !queryState?.noDatePicker && (
          <>
            <div className="notebookQueryPanelWidgets__verticalSeparator" />
            <div className="notebookQueryPanelWidgets__datePicker">
              <EuiSuperDatePicker
                start={timeRange?.from}
                end={timeRange?.to}
                onTimeChange={handleTimeChange}
                compressed
                showUpdateButton={false}
                dateFormat={uiSettings!.get('dateFormat')}
              />
            </div>
          </>
        )}
        <EuiFlexGroup gutterSize="none" dir="row" justifyContent="flexEnd" alignItems="center">
          {isQueryPanelLoading && <EuiLoadingSpinner size="m" />}
          <EuiButtonEmpty
            iconType={isQueryPanelLoading ? undefined : 'play'}
            size="s"
            aria-label="run button"
            onClick={handleRunQuery}
            disabled={isQueryPanelLoading}
          >
            Run
          </EuiButtonEmpty>
          {queryLanguage === 'PPL' && (
            <>
              <div className="notebookQueryPanelWidgets__verticalSeparator" />
              <EuiPopover
                panelPaddingSize="none"
                button={
                  <EuiSmallButtonIcon
                    aria-label="Open input menu"
                    iconType="boxesHorizontal"
                    onClick={() => setIsQueryPanelMenuOpen(true)}
                  />
                }
                closePopover={() => setIsQueryPanelMenuOpen(false)}
                isOpen={isQueryPanelMenuOpen}
              >
                <EuiFlexGroup
                  gutterSize="none"
                  dir="row"
                  alignItems="center"
                  style={{ gap: 8, padding: 8 }}
                >
                  <EuiSwitch
                    showLabel={false}
                    label=""
                    checked={Boolean((inputValue as QueryState)?.noDatePicker)}
                    onChange={(e) => handleInputChange({ noDatePicker: e.target.checked })}
                  />
                  <EuiText size="s">Disable Time Filter</EuiText>
                </EuiFlexGroup>
              </EuiPopover>
            </>
          )}
          {appendWidget && <div className="notebookQueryPanelWidgets__verticalSeparator" />}
          {appendWidget}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <QueryPanelEditor
        queryState={queryState}
        promptModeIsAvailable={promptModeIsAvailable}
        handleRunQuery={handleRunQuery}
      />
      <QueryPanelGeneratedQuery />
    </EuiPanel>
  );
};
