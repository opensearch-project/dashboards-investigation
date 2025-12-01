/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiIcon,
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
import { getDataSourceManagementSetup } from '../../../../../../public/services';
import { dataSourceFilterFn } from '../../../../../../common/utils/shared';
import { DataSourceOption } from '../../../../../../../../src/plugins/data_source_management/public';
import { generateDefaultQuery } from '../../../../../../public/utils/query';

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
      savedObjects,
      notifications,
      data: { indexPatterns },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const {
    inputValue,
    dataSourceId,
    isLoading,
    paragraphInput,
    isAgenticNotebook,
    isInputMountedInParagraph,
    isDisabled,
    handleInputChange,
    handleSubmit,
  } = useInputContext();

  const { dataSourceManagement } = getDataSourceManagementSetup();
  const DataSourceMenu = useMemo(() => dataSourceManagement?.ui.getDataSourceMenu(), [
    dataSourceManagement,
  ]);

  const [promptModeIsAvailable, setPromptModeIsAvailable] = useState(false);
  const [isQueryPanelMenuOpen, setIsQueryPanelMenuOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [localDataSourceId, setLocalDataSourceId] = useState(dataSourceId);
  const [isEditorInitialized, setIsEditorInitialized] = useState(!isInputMountedInParagraph);

  const isInitialInputHandled = useRef(false);

  const queryState = (inputValue && typeof inputValue !== 'string'
    ? inputValue
    : QUERY_PANEL_INITIAL_STATE) as QueryState;
  const {
    value,
    queryLanguage,
    isPromptEditorMode,
    selectedIndex,
    timeRange,
    noDatePicker,
  } = queryState;

  // Initialize editor when value exists and in paragraph mode
  if (isInputMountedInParagraph && value && !isEditorInitialized) {
    setIsEditorInitialized(true);
  }

  useEffect(() => {
    // TODO: consider move this to global state
    getPromptModeIsAvailable(services, localDataSourceId).then(setPromptModeIsAvailable);
  }, [services, localDataSourceId]);

  useEffect(() => {
    const handleInitialInput = async () => {
      if (
        !isFetching &&
        paragraphInput &&
        (paragraphInput.inputType === 'PPL' || paragraphInput.inputType === 'SQL') &&
        (isEmpty(inputValue) || typeof inputValue === 'string')
      ) {
        // Set up input value from paragraph input
        try {
          setIsFetching(true);
          const val = paragraphInput.inputText;
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
                dataSourceId: localDataSourceId,
              })
            : [];

          handleInputChange({
            value: val,
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
          isInitialInputHandled.current = true;
        }
      } else if (typeof inputValue === 'string' || isEmpty(inputValue)) {
        handleInputChange(QUERY_PANEL_INITIAL_STATE);
        isInitialInputHandled.current = true;
      }
    };
    handleInitialInput();
  }, [paragraphInput, handleInputChange, indexPatterns, localDataSourceId, inputValue, isFetching]);

  // Sync timeRange when external parameters change (only after initial setup)
  useEffect(() => {
    if (!isInitialInputHandled.current) return;

    const externalTimeRange = (paragraphInput?.parameters as any)?.timeRange;
    if (externalTimeRange) {
      handleInputChange({ timeRange: externalTimeRange });
    }
  }, [paragraphInput?.parameters, handleInputChange]);

  const handleTimeChange = useCallback(
    (props) => {
      handleInputChange({ timeRange: { from: props.start, to: props.end } });
    },
    [handleInputChange]
  );

  const handleGenerateQuery = useCallback(async () => {
    if (paragraphInput?.inputText && value === (paragraphInput?.parameters as any)?.question) {
      // Don't regenerate PPL query if the input NL question isn't changed
      return paragraphInput?.inputText;
    }
    setIsFetching(true);
    const params: QueryAssistParameters = {
      question: value,
      index: selectedIndex.title,
      language: queryLanguage,
      dataSourceId: localDataSourceId,
    };

    try {
      const { query } = await services.http.post<QueryAssistResponse>(
        '/api/enhancements/assist/generate',
        {
          body: JSON.stringify(params),
        }
      );

      handleInputChange({ query });

      return query;
    } catch (err) {
      notifications?.toasts.addError(err, {
        title: 'Failed to generate PPL query by natural language',
        toastMessage: err.errorMessage,
      });
      throw err;
    } finally {
      setIsFetching(false);
    }
  }, [
    paragraphInput,
    value,
    selectedIndex.title,
    queryLanguage,
    localDataSourceId,
    services.http,
    handleInputChange,
    notifications?.toasts,
  ]);

  const handleRunQuery = useCallback(async () => {
    if (isDisabled) {
      return;
    }

    // Block execution when in prompt mode without index selection
    if (isPromptEditorMode && !selectedIndex?.title) {
      notifications?.toasts.addWarning({
        title: 'Index Required',
        text: 'Please select an index before using natural language query.',
      });
      return;
    }

    const queryToExecute = value || generateDefaultQuery(selectedIndex?.title, queryLanguage);
    handleInputChange({ value: queryToExecute });
    handleSubmit(
      queryToExecute,
      {
        timeRange,
        indexName: selectedIndex?.title,
        timeField: selectedIndex?.timeField,
        query: isPromptEditorMode ? await handleGenerateQuery() : '',
        noDatePicker,
      },
      localDataSourceId
    );
  }, [
    handleSubmit,
    handleGenerateQuery,
    handleInputChange,
    isDisabled,
    value,
    isPromptEditorMode,
    noDatePicker,
    selectedIndex,
    timeRange,
    localDataSourceId,
    queryLanguage,
    notifications?.toasts,
  ]);

  const isQueryPanelLoading = isFetching || isLoading;
  // Select index can run default query on PPL and SQL but not t2ppl
  const isQueryEmpty = (!Boolean(selectedIndex?.title) || isPromptEditorMode) && !value;

  const getQueryPanelDataSourceSelector = useCallback(() => {
    if (isAgenticNotebook || isDisabled) {
      return (
        <EuiIcon
          color={isDisabled ? 'subuded' : 'primary'}
          type="database"
          style={{ margin: '0 -4px 0 8px' }}
        />
      );
    }

    if (!DataSourceMenu) return null;
    return (
      <DataSourceMenu
        componentType="DataSourceSelectable"
        componentConfig={{
          savedObjects: savedObjects.client,
          notifications,
          activeOption: localDataSourceId !== undefined ? [{ id: localDataSourceId }] : [],
          onSelectedDataSources: (ds: DataSourceOption[]) => {
            setLocalDataSourceId(ds[0].id);
          },
          dataSourceFilter: dataSourceFilterFn,
        }}
      />
    );
  }, [
    isDisabled,
    savedObjects,
    notifications,
    localDataSourceId,
    DataSourceMenu,
    isAgenticNotebook,
  ]);

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
        // Prevent setting button overlap with action menu button
        style={{ marginInlineEnd: isInputMountedInParagraph && !isAgenticNotebook ? 32 : 0 }}
      >
        {prependWidget}
        <LanguageToggle promptModeIsAvailable={promptModeIsAvailable} />
        <div
          className={classNames('notebookQueryPanelWidgets__dataSourceSelector', {
            ['notebookQueryPanelWidgets__dataSourceSelector--disabled']: isDisabled,
          })}
        >
          {getQueryPanelDataSourceSelector()}
        </div>
        <div className="notebookQueryPanelWidgets__indexSelectorWrapper">
          <IndexSelector dataSourceId={localDataSourceId} />
        </div>
        {queryLanguage === 'PPL' &&
          !queryState?.noDatePicker &&
          queryState?.selectedIndex?.timeField !== undefined && ( // Hide picker for legacy paragraph
            <>
              <div className="notebookQueryPanelWidgets__verticalSeparator" />
              <div
                className={classNames('notebookQueryPanelWidgets__datePicker', {
                  ['notebookQueryPanelWidgets__datePicker--disabled']: isDisabled,
                })}
              >
                <EuiSuperDatePicker
                  start={timeRange?.from}
                  end={timeRange?.to}
                  onTimeChange={handleTimeChange}
                  compressed
                  showUpdateButton={false}
                  dateFormat={uiSettings!.get('dateFormat')}
                  isDisabled={isDisabled}
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
            disabled={isQueryPanelLoading || isQueryEmpty || isDisabled}
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
                    isDisabled={isDisabled}
                    iconType="gear"
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
      {isEditorInitialized && (
        <QueryPanelEditor
          queryState={queryState}
          promptModeIsAvailable={promptModeIsAvailable}
          handleRunQuery={handleRunQuery}
        />
      )}
      <QueryPanelGeneratedQuery />
    </EuiPanel>
  );
};
