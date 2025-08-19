/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
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

interface QueryPanelProps {
  prependWidget?: React.ReactNode;
  appendWidget?: React.ReactNode;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ prependWidget, appendWidget }) => {
  const {
    services: {
      appName,
      uiSettings,
      data,
      data: {
        ui: { DatasetSelect },
      },
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { inputValue, handleInputChange, handleSubmit } = useInputContext();

  const queryState = inputValue as QueryState;
  const { timeRange } = queryState || {};

  const handleSelect = useCallback(
    (dataset) => {
      data.query.queryString.setQuery({ dataset });
      handleInputChange({ selectedIndex: dataset });
    },
    [data.query.queryString, handleInputChange]
  );

  const handleTimeChange = useCallback(
    (props) => {
      handleInputChange({ timeRange: props });
    },
    [handleInputChange]
  );

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiFlexGroup className="notebookQueryPanelWidgets" gutterSize="none" dir="row">
        {prependWidget}
        {prependWidget && <div className="notebookQueryPanelWidgets__verticalSeparator" />}
        <div className="notebookQueryPanelWidgets__datasetSelect">
          {/* <IndexSelect /> */}
          {/* FIXME dataset select cause unncessary http requests due to rerender */}
          <DatasetSelect onSelect={handleSelect} appName={appName} />
        </div>
        <div className="notebookQueryPanelWidgets__verticalSeparator" />
        <div className="notebookQueryPanelWidgets__datePicker">
          <EuiSuperDatePicker
            start={timeRange?.start}
            end={timeRange?.end}
            onTimeChange={handleTimeChange}
            compressed
            showUpdateButton={false}
            dateFormat={uiSettings!.get('dateFormat')}
          />
        </div>
        <EuiFlexGroup gutterSize="none" dir="row" justifyContent="flexEnd">
          <EuiButtonEmpty iconType="play" size="s" aria-label="run button" onClick={handleSubmit}>
            Run
          </EuiButtonEmpty>
          {appendWidget && <div className="notebookQueryPanelWidgets__verticalSeparator" />}
          {appendWidget}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <QueryPanelEditor />
      <QueryPanelGeneratedQuery />
    </EuiPanel>
  );
};
