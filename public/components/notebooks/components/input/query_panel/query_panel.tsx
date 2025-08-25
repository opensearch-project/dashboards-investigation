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
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { NoteBookServices } from 'public/types';
import { QueryPanelEditor } from './query_panel_editor';
import { QueryPanelGeneratedQuery } from './query_panel_generated_query';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../input_context';
import { QueryState } from '../types';

import './query_panel.scss';
import { getPromptModeIsAvailable } from './get_prompt_mode_is_available';
import { LanguageToggle } from './language_toggle';

interface QueryPanelProps {
  prependWidget?: React.ReactNode;
  appendWidget?: React.ReactNode;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ prependWidget, appendWidget }) => {
  const {
    services,
    services: {
      appName,
      uiSettings,
      data,
      data: {
        ui: { DatasetSelect },
      },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const {
    inputValue,
    dataSourceId,
    handleInputChange,
    handleSubmit,
    isLoading,
    setDataView,
  } = useInputContext();

  const [promptModeIsAvailable, setPromptModeIsAvailable] = useState(false);

  const queryState = inputValue as QueryState | undefined;
  const { timeRange, queryLanguage } = queryState || {};

  useEffect(() => {
    if (inputValue && !(inputValue as QueryState)?.selectedIndex) {
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
    // TODO: consider move this to global state
    if (queryState?.selectedIndex) {
      getPromptModeIsAvailable(services).then(setPromptModeIsAvailable);
    }
  }, [services, dataSourceId, queryState?.selectedIndex]);

  const handleSelect = useCallback(
    (dataset) => {
      data.query.queryString.setQuery({ dataset });
      handleInputChange({ selectedIndex: dataset });
    },
    [data.query.queryString, handleInputChange]
  );

  const handleTimeChange = useCallback(
    (props) => {
      handleInputChange({ timeRange: { from: props.start, to: props.end } });
    },
    [handleInputChange]
  );

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
        <div className="notebookQueryPanelWidgets__datasetSelect">
          {/* <IndexSelect /> */}
          {/* FIXME dataset select cause unncessary http requests due to rerender */}
          <DatasetSelect onSelect={handleSelect} appName={appName} />
        </div>
        {queryLanguage === 'PPL' && (
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
          {isLoading && <EuiLoadingSpinner size="m" />}
          <EuiButtonEmpty
            iconType={isLoading ? undefined : 'play'}
            size="s"
            aria-label="run button"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            Run
          </EuiButtonEmpty>
          {appendWidget && <div className="notebookQueryPanelWidgets__verticalSeparator" />}
          {appendWidget}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <QueryPanelEditor promptModeIsAvailable={promptModeIsAvailable} />
      <QueryPanelGeneratedQuery />
    </EuiPanel>
  );
};
