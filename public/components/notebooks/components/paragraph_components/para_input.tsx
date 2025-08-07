/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiCompressedComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiHighlight,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { Input, Prompt } from '@nteract/presentational-components';
import React, { useState } from 'react';
import { observabilityLogsID } from '../../../../../common/constants/shared';
import { ParaType } from '../../../../../common/types/notebooks';
import { uiSettingsService } from '../../../../../common/utils';

/*
 * "ParaInput" component is used by notebook to populate paragraph inputs for an open notebook.
 *
 * Props taken in as params are:
 * para - parsed paragraph from notebook
 * index - index of paragraph in the notebook
 *
 * Input component of nteract used as a container for notebook UI.
 * https://components.nteract.io/#input
 */

export const ParaInput = (props: {
  para: ParaType;
  index: number;
  runParaError: boolean;
  startTime: string;
  setStartTime: (startTime: string) => void;
  endTime: string;
  setEndTime: (endTime: string) => void;
  setIsOutputStale: (isStale?: boolean) => void;
  visOptions: EuiComboBoxOptionOption[];
  selectedVisOption: EuiComboBoxOptionOption[];
  setSelectedVisOption: (newOption: EuiComboBoxOptionOption[]) => void;
  setVisType: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { para } = props;

  const RenderVisInput = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]);
    const [selectableError, setSelectableError] = useState(false);

    const onSelect = () => {
      const selectedOptions = selectableOptions.filter((opt) => opt.checked === 'on');
      if (selectedOptions.length === 0) {
        setSelectableError(true);
        return;
      }
      props.setIsOutputStale(true);
      if (selectedOptions.length > 0) props.setVisType(selectedOptions[0].className);
      props.setSelectedVisOption(selectedOptions);
      setIsModalOpen(false);
    };

    const renderOption = (option: EuiComboBoxOptionOption, searchValue: string) => {
      let visURL = `visualize#/edit/${option.key}?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${props.startTime}',to:'${props.endTime}'))`;
      if (option.className === 'OBSERVABILITY_VISUALIZATION') {
        visURL = `${observabilityLogsID}#/explorer/${option.key}`;
      }
      return (
        <EuiLink href={visURL} target="_blank">
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiLink>
      );
    };

    return (
      <>
        <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false} style={{ minWidth: '500px' }}>
            <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
              <EuiFlexItem grow={true}>
                <EuiCompressedFormRow label="Title" fullWidth>
                  <EuiCompressedComboBox
                    placeholder="Find visualization"
                    singleSelection={{ asPlainText: true }}
                    options={props.visOptions}
                    selectedOptions={props.selectedVisOption}
                    onChange={(newOption: EuiComboBoxOptionOption[]) => {
                      if (newOption.length > 0) props.setVisType(newOption[0].className);
                      props.setSelectedVisOption(newOption);
                      props.setIsOutputStale(true);
                    }}
                  />
                </EuiCompressedFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  data-test-subj="para-input-visualization-browse-button"
                  onClick={() => {
                    setSelectableOptions([
                      ...props.visOptions[0].options,
                      ...props.visOptions[1].options,
                    ]);
                    setSelectableError(false);
                    setIsModalOpen(true);
                  }}
                >
                  Browse
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />
          <EuiFlexItem grow={false}>
            <EuiCompressedFormRow label="Date range" fullWidth>
              <EuiSuperDatePicker
                compressed
                start={props.startTime}
                end={props.endTime}
                showUpdateButton={false}
                dateFormat={uiSettingsService.get('dateFormat')}
                onTimeChange={(e) => {
                  props.setStartTime(e.start);
                  props.setEndTime(e.end);
                  props.setIsOutputStale(true);
                }}
              />
            </EuiCompressedFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isModalOpen && (
          <EuiOverlayMask>
            <EuiModal onClose={() => setIsModalOpen(false)} style={{ width: 500 }}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>
                  <EuiText size="s">
                    <h2>Browse visualizations</h2>
                  </EuiText>
                </EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiSelectable
                  aria-label="Searchable Visualizations"
                  searchable
                  options={selectableOptions}
                  singleSelection={true}
                  renderOption={renderOption}
                  onChange={(newOptions) => {
                    setSelectableOptions(newOptions);
                    setSelectableError(false);
                  }}
                >
                  {(list, search) => (
                    <>
                      {search}
                      {list}
                    </>
                  )}
                </EuiSelectable>
                {selectableError && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText color="danger" size="s">
                      {'Visualization is required.'}
                    </EuiText>
                  </>
                )}
              </EuiModalBody>

              <EuiModalFooter>
                <EuiSmallButtonEmpty onClick={() => setIsModalOpen(false)}>
                  Cancel
                </EuiSmallButtonEmpty>
                <EuiSmallButton
                  data-test-subj="para-input-select-button"
                  onClick={() => onSelect()}
                  fill
                >
                  Select
                </EuiSmallButton>
              </EuiModalFooter>
            </EuiModal>
          </EuiOverlayMask>
        )}
      </>
    );
  };

  return (
    <Input>
      <Prompt blank={true} running={para.isRunning} queued={para.inQueue} />
      {para.isVizualisation ? RenderVisInput() : null}
    </Input>
  );
};
