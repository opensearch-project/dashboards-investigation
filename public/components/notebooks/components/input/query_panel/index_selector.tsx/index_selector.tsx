/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import {
  EuiButtonEmpty,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { NoteBookServices } from 'public/types';
import { useOpenSearchDashboards } from '../../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useInputContext } from '../../input_context';
import { QueryState } from '../../types';

import './index_selector.scss';
import { Field } from '../../../../../../../../../src/plugins/dashboard/public/types';

const DEFAULT_QUERY_STATE = { value: '', query: '', isPromptEditorMode: false };

const INITAL_INDEX_SELECTION = {
  selectedIndex: undefined,
  selectedTimeField: undefined,
};

interface IndexSelectorOption {
  checked?: 'on' | 'off';
  key?: string;
  label?: string;
}

export const IndexSelector: React.FC<{ dataSourceId: string | undefined }> = ({ dataSourceId }) => {
  const { handleInputChange, inputValue } = useInputContext();
  const { noDatePicker, selectedIndex, queryLanguage, timeRange } =
    (inputValue as QueryState) || {};
  const {
    services: {
      http,
      data: { indexPatterns }, // FIXME: indexPatterns is deprecated
    },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [currentSelection, setCurrentSelection] = useState<{
    selectedIndex: IndexSelectorOption | undefined;
    selectedTimeField: IndexSelectorOption | undefined;
  }>(INITAL_INDEX_SELECTION);

  const tempSelectedIndexRef = useRef<IndexSelectorOption | undefined>(undefined);
  const isFirstRender = useRef(true);
  const previousDataSouce = useRef<string | undefined>(undefined);

  const [uiState, setUiState] = useState({
    isOpen: false,
    stage: 'index',
    isLoading: false,
  });

  const [indicesData, setIndicesData] = useState({
    indices: [] as any[],
    timeFields: [] as any[],
    allFields: [] as any[],
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (dataSourceId !== undefined) {
      setCurrentSelection(INITAL_INDEX_SELECTION);
      setUiState({
        isOpen: false,
        stage: 'index',
        isLoading: false,
      });
      handleInputChange({
        ...DEFAULT_QUERY_STATE,
        selectedIndex: {
          title: '',
          fields: [],
        },
      });
    }
  }, [dataSourceId, handleInputChange]);

  useEffect(() => {
    // TODO: consider to move the check for indices to notebook context
    if (!uiState.isOpen) return;

    // Prevent fetching when close and reopen the popover without changing the data source
    if (previousDataSouce.current === dataSourceId && indicesData.indices.length > 0) return;

    const fetchIndices = async () => {
      setUiState((prev) => ({ ...prev, isLoading: true }));
      try {
        const res = await http.post('/api/console/proxy', {
          query: {
            path: '/_cat/indices?format=json',
            method: 'GET',
            dataSourceId,
          },
        });
        setIndicesData((prev) => ({ ...prev, indices: res }));
      } catch (err) {
        console.log('error', err);
      } finally {
        setUiState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    fetchIndices();
    previousDataSouce.current = dataSourceId;
  }, [uiState.isOpen, indicesData.indices.length, dataSourceId, http]);

  useEffect(() => {
    // Populate selected index and time field label from input state
    if (!isEmpty(selectedIndex?.title)) {
      const indexTitle = selectedIndex.title;
      const timeField = selectedIndex.timeField;

      setCurrentSelection((prev) => ({
        ...prev,
        selectedIndex: { label: indexTitle },
        selectedTimeField: { label: timeField },
      }));
    } else {
      setCurrentSelection(INITAL_INDEX_SELECTION);
    }
  }, [selectedIndex]);

  const options = useMemo(() => {
    return indicesData.indices.map(({ index, uuid }) => ({ label: index, key: uuid }));
  }, [indicesData.indices]);

  const togglePopover = useCallback(
    () => setUiState((prev) => ({ ...prev, isOpen: !prev.isOpen })),
    []
  );

  const closePopover = useCallback(() => {
    setUiState((prev) => ({ ...prev, isOpen: false }));
    if (uiState.stage === 'timeField' && !currentSelection.selectedTimeField) {
      tempSelectedIndexRef.current = undefined;
      setUiState((prev) => ({ ...prev, stage: 'index' }));
      setIndicesData((prev) => ({ ...prev, timeFields: [] }));
    }
  }, [uiState.stage, currentSelection.selectedTimeField]);

  const fetchTimeFields = useCallback(
    async (label: string | undefined) => {
      setUiState((prev) => ({ ...prev, isLoading: true, stage: 'timeField' }));
      try {
        const res = await indexPatterns.getFieldsForWildcard({
          pattern: label,
          dataSourceId,
        });
        const dateFields = res.filter((field: Field) => field.type === 'date');
        setIndicesData((prev) => ({
          ...prev,
          allFields: res,
          timeFields: dateFields.map((field: Field) => ({ label: field.name, key: field.name })),
        }));
      } catch (err) {
        console.log('error', err);
      } finally {
        setUiState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [indexPatterns, dataSourceId]
  );

  const handleIndexChange = useCallback(
    async (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      if (selected) {
        tempSelectedIndexRef.current = selected;

        if (noDatePicker || queryLanguage === 'SQL') {
          // Skip time field selection and directly set the index
          setCurrentSelection((prev) => ({ ...prev, selectedIndex: selected }));
          setUiState((prev) => ({ ...prev, isOpen: false }));

          if (selectedIndex?.title) {
            /**
             * Don't clear currnet query input if previously no index is selected. This is to
             * ensure for legacy notebook, the user don't have to re-enter the query after
             * select the correct index for an existing query.
             */
            handleInputChange(DEFAULT_QUERY_STATE);
          }

          try {
            const res = await indexPatterns.getFieldsForWildcard({
              pattern: selected.label,
              dataSourceId,
            });

            handleInputChange({
              selectedIndex: {
                title: selected.label!,
                fields: res,
                timeField: undefined,
              },
            });
          } catch (err) {
            console.log('error', err);
          }
        } else {
          fetchTimeFields(selected?.label);
        }
      }
    },
    [
      noDatePicker,
      indexPatterns,
      queryLanguage,
      dataSourceId,
      selectedIndex?.title,
      handleInputChange,
      fetchTimeFields,
    ]
  );

  const handleTimeFieldChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      setCurrentSelection((prev) => ({
        ...prev,
        selectedTimeField: selected,
        selectedIndex: tempSelectedIndexRef.current,
      }));

      const indexData = {
        title: tempSelectedIndexRef.current?.label!,
        fields: indicesData.allFields,
        timeField: selected?.label,
      };

      setUiState((prev) => ({ ...prev, isOpen: false, stage: 'index' }));
      tempSelectedIndexRef.current = undefined;

      handleInputChange({
        ...(selectedIndex?.title ? DEFAULT_QUERY_STATE : {}),
        ...(isEmpty(timeRange) ? { timeRange: { from: 'now-15m', to: 'now' } } : {}),
        selectedIndex: indexData,
      });
    },
    [indicesData.allFields, selectedIndex?.title, timeRange, handleInputChange]
  );

  const handleBack = () => {
    setUiState((prev) => ({ ...prev, stage: 'index' }));
    setIndicesData((prev) => ({ ...prev, timeFields: [] }));
    tempSelectedIndexRef.current = undefined;
  };

  const getButtonText = () => {
    if (noDatePicker || queryLanguage === 'SQL') {
      return currentSelection.selectedIndex?.label || 'Select an index';
    }
    if (currentSelection.selectedTimeField) {
      return `${currentSelection.selectedIndex?.label} - ${
        currentSelection.selectedTimeField.label || 'no time field'
      }`;
    }
    return uiState.stage === 'index' ? 'Select an index' : 'Select a time field';
  };

  return (
    <EuiPopover
      className="notebookIndexSelector"
      button={
        <EuiButtonEmpty
          className="notebookIndexSelector__button"
          data-test-subj="indexSelectorButton"
          iconType="arrowDown"
          iconSide="right"
          size="xs"
          textProps={{ className: 'notebookIndexSelector__textWrapper' }}
          onClick={togglePopover}
        >
          <EuiText size="xs" className="notebookIndexSelector__text">
            {getButtonText()}
          </EuiText>
        </EuiButtonEmpty>
      }
      isOpen={uiState.isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      repositionOnScroll
    >
      {uiState.stage === 'index' || noDatePicker ? (
        <EuiSelectable
          className="notebookIndexSelector__selectable"
          data-test-subj="notebookIndexSelectorSelectable"
          options={options}
          singleSelection="always"
          searchable={true}
          onChange={handleIndexChange}
          renderOption={(option, searchValue) => (
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          )}
          listProps={{ showIcons: false, rowHeight: 40 }}
          searchProps={{ placeholder: 'Search indices', compressed: true }}
          isLoading={uiState.isLoading}
        >
          {(list, search) => (
            <>
              <div className="notebookIndexSelector__searchContainer">{search}</div>
              {list}
            </>
          )}
        </EuiSelectable>
      ) : (
        <EuiSelectable
          className="notebookIndexSelector__selectable"
          data-test-subj="timeFieldSelectSelectable"
          options={indicesData.timeFields}
          singleSelection="always"
          onChange={handleTimeFieldChange}
          renderOption={(option, searchValue) => (
            <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
          )}
          listProps={{ showIcons: false, rowHeight: 40 }}
          searchable={true}
          searchProps={{ placeholder: 'Search time fields', compressed: true }}
          isLoading={uiState.isLoading}
        >
          {(list, search) => (
            <>
              <div className="notebookIndexSelector__searchContainer">
                <EuiButtonEmpty size="xs" onClick={handleBack} iconType="arrowLeft">
                  Back to indices
                </EuiButtonEmpty>
                <EuiSpacer size="s" />
                {search}
              </div>
              {list}
            </>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
};
