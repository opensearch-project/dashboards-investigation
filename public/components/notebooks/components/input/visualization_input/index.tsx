/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSelectable,
  EuiSuperDatePicker,
  EuiText,
  EuiSmallButtonIcon,
  EuiEmptyPrompt,
  EuiIcon,
  EuiHorizontalRule,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { observabilityLogsID } from '../../../../../../common/constants/shared';
import { OBSERVABILITY_VISUALIZATION_TYPE } from '../../../../../../common/constants/notebooks';
import { useVisualizationInput } from './use_visualization_input';
import { useVisualizationValue } from './use_visualization_value';
import { useInputContext } from '../input_context';

export interface VisualizationInputValue {
  type: string;
  id: string;
  startTime: string;
  endTime: string;
}

export const VisualizationInput: React.FC<{
  prependWidget?: React.ReactNode;
  isDisabled?: boolean;
}> = ({ prependWidget, isDisabled }) => {
  const { inputValue, handleSubmit, isInputMountedInParagraph } = useInputContext();

  const handleSelect = () => {
    const result = onSelect();
    if (result) {
      const updatedValue = { ...value, id: result.key, type: result.datatype };
      setIsModalOpen(false);
      handleSubmit(' ', updatedValue);
      setValue(updatedValue as any);
    }
  };

  const renderOption = (
    option: EuiComboBoxOptionOption & { icon: string },
    searchValue: string
  ) => {
    let visURL = `visualize#/edit/${option.key}?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${value?.startTime}',to:'${value?.endTime}'))`;
    if (option.datatype === OBSERVABILITY_VISUALIZATION_TYPE) {
      visURL = `${observabilityLogsID}#/explorer/${option.key}`;
    }
    return (
      <EuiLink href={visURL} target="_blank">
        <EuiIcon type={option.icon} style={{ marginInlineEnd: 4 }} />
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </EuiLink>
    );
  };

  const { value, setValue } = useVisualizationValue(inputValue as string);

  useEffect(() => {
    if (value && !isInputMountedInParagraph) {
      handleSubmit(' ', value);
    }
  }, [value, isInputMountedInParagraph, handleSubmit]);

  const {
    uiSettings,
    isModalOpen,
    setIsModalOpen,
    selectableOptions,
    setSelectableOptions,
    selectedOption,
    onSelect,
    openModal,
  } = useVisualizationInput(value);

  return (
    <>
      <EuiFlexGroup
        className="notebookQueryPanelWidgets"
        gutterSize="none"
        dir="row"
        alignItems="center"
        justifyContent="spaceBetween"
      >
        {prependWidget}
        {!isDisabled && (
          <EuiSmallButtonIcon
            aria-label="input type icon button"
            iconType="refresh"
            onClick={openModal}
          />
        )}
        <EuiFlexItem grow={false} style={{ marginInlineStart: 'auto' }}>
          <EuiSuperDatePicker
            compressed
            start={value?.startTime}
            end={value?.endTime}
            showUpdateButton={false}
            dateFormat={uiSettings.get('dateFormat')}
            onTimeChange={(e) => {
              const updatedValue = { ...value, startTime: e.start, endTime: e.end };
              handleSubmit(' ', updatedValue);
              setValue(updatedValue as any);
            }}
            isDisabled={isDisabled}
          />
        </EuiFlexItem>
        <EuiSmallButtonIcon
          aria-label="Open input menu"
          iconType="boxesHorizontal"
          onClick={() => {}}
        />
      </EuiFlexGroup>
      {!selectedOption && (
        <EuiEmptyPrompt
          iconType="visualizeApp"
          title={<h2>Select a visualization</h2>}
          actions={
            <EuiSmallButton
              data-test-subj="para-input-visualization-browse-button"
              onClick={openModal}
            >
              Browse
            </EuiSmallButton>
          }
        />
      )}
      {isModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsModalOpen(false)} style={{ width: 500 }}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <EuiText size="s">
                  <h3>Select visualizations</h3>
                </EuiText>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiHorizontalRule style={{ marginBlock: 0 }} />
            <EuiModalBody>
              <EuiSpacer size="s" />
              <EuiSelectable
                aria-label="Searchable Visualizations"
                searchable
                options={selectableOptions}
                singleSelection={true}
                renderOption={renderOption as any}
                onChange={(newOptions) => {
                  setSelectableOptions(newOptions);
                }}
              >
                {(list, search) => (
                  <>
                    {search}
                    {list}
                  </>
                )}
              </EuiSelectable>
            </EuiModalBody>
            <EuiPanel color="subdued">
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
                <EuiSmallButtonEmpty
                  iconType="cross"
                  onClick={() => setIsModalOpen(false)}
                  color="danger"
                >
                  Cancel
                </EuiSmallButtonEmpty>
                <EuiSmallButton
                  data-test-subj="para-input-select-button"
                  onClick={handleSelect}
                  fill
                >
                  Select
                </EuiSmallButton>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
