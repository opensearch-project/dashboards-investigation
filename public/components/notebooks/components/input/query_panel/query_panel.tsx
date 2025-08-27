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
import { QueryPanelEditor } from './query_panel_editor';
import { QueryPanelGeneratedQuery } from './query_panel_generated_query';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../input_context';
import { QueryState } from '../types';

import './query_panel.scss';
import { getPromptModeIsAvailable } from './get_prompt_mode_is_available';
import { LanguageToggle } from './language_toggle';
import { IndexSelector } from './index_selector.tsx/index_selector';

interface QueryPanelProps {
  prependWidget?: React.ReactNode;
  appendWidget?: React.ReactNode;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ prependWidget, appendWidget }) => {
  const {
    services,
    services: { uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();
  const {
    inputValue,
    dataSourceId,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useInputContext();

  const [promptModeIsAvailable, setPromptModeIsAvailable] = useState(false);
  const [isQueryPanelMenuOpen, setIsQueryPanelMenuOpen] = useState(false);

  const queryState = inputValue as QueryState | undefined;
  const { timeRange, queryLanguage } = queryState || {};

  useEffect(() => {
    // TODO: consider move this to global state
    getPromptModeIsAvailable(services, dataSourceId).then(setPromptModeIsAvailable);
  }, [services, dataSourceId]);

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
            {queryLanguage === 'PPL' ? (
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
            ) : (
              <></>
            )}
          </EuiPopover>
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
