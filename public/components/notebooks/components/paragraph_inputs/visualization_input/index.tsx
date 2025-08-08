/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
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
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { NoteBookServices } from 'public/types';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { observabilityLogsID } from '../../../../../../common/constants/shared';
import { SavedObjectsActions } from '../../../../../services/saved_objects/saved_object_client/saved_objects_actions';
import { ObservabilitySavedVisualization } from '../../../../../services/saved_objects/saved_object_client/types';
import {
  DASHBOARDS_VISUALIZATION_TYPE,
  OBSERVABILITY_VISUALIZATION_TYPE,
} from '../../../../../../common/constants/notebooks';

export interface VisualizationInputValue {
  type: string;
  id: string;
  startTime: string;
  endTime: string;
}

export const VisualizationInput = (props: {
  value?: VisualizationInputValue;
  onChange: (vis: Partial<VisualizationInputValue>) => void;
  dataSourceId?: string;
}) => {
  const {
    services: { uiSettings, dataSource, savedObjects },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]);
  const [visOptions, setVisOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const selectedOption = useMemo(() => {
    if (!props.value || !visOptions.length) {
      return undefined;
    }

    return visOptions
      .reduce(
        (acc, current) => [...acc, ...(current.options || [])],
        [] as EuiComboBoxOptionOption[]
      )
      .find((option) => option.key === props.value?.id && option.datatype === props.value?.type);
  }, [props.value, visOptions]);

  const onSelect = () => {
    const selectedOptions = selectableOptions.filter((opt) => opt.checked === 'on');
    if (selectedOptions.length === 0) {
      return;
    }
    props.onChange({
      type: selectedOptions[0].datatype,
    });
    setIsModalOpen(false);
  };

  const renderOption = (option: EuiComboBoxOptionOption, searchValue: string) => {
    let visURL = `visualize#/edit/${option.key}?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${props.value?.startTime}',to:'${props.value?.endTime}'))`;
    if (option.datatype === OBSERVABILITY_VISUALIZATION_TYPE) {
      visURL = `${observabilityLogsID}#/explorer/${option.key}`;
    }
    return (
      <EuiLink href={visURL} target="_blank">
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </EuiLink>
    );
  };

  const fetchSavedObjectsVisualizations = useCallback(() => {
    return savedObjects.client
      ?.find<{ title: string }>({
        type: DASHBOARDS_VISUALIZATION_TYPE,
      })
      .then((res) => {
        return res.savedObjects.map((vizObject) => ({
          label: vizObject.attributes.title,
          key: vizObject.id,
          datatype: DASHBOARDS_VISUALIZATION_TYPE,
        }));
      })
      .catch((error) => {
        console.error('Failed to fetch visualizations', error);
        return [];
      });
  }, [savedObjects.client]);

  const fetchVisualizations = useCallback(async () => {
    if (!!dataSource) {
      const vizOptions = await fetchSavedObjectsVisualizations();
      const allVisualizations = [{ label: 'Dashboards Visualizations', options: vizOptions }];
      setVisOptions(allVisualizations);
    } else {
      const opt1: EuiComboBoxOptionOption[] = await fetchSavedObjectsVisualizations();
      let opt2: EuiComboBoxOptionOption[] = [];

      await SavedObjectsActions.getBulk<ObservabilitySavedVisualization>({
        objectType: ['savedVisualization'],
      })
        .then((res) => {
          opt2 = res.observabilityObjectList
            .filter((visualization) => !visualization.savedVisualization.application_id)
            .map((visualization) => ({
              label: visualization.savedVisualization.name,
              key: visualization.objectId,
              datatype: OBSERVABILITY_VISUALIZATION_TYPE,
            }));
        })
        .catch((err) => console.error('Fetching observability visualization issue', err));

      const allVisualizations = [
        { label: 'Dashboards Visualizations', options: opt1 },
        { label: 'Observability Visualizations', options: opt2 },
      ];
      setVisOptions(allVisualizations);
    }
  }, [dataSource, fetchSavedObjectsVisualizations]);

  useEffect(() => {
    fetchVisualizations();
  }, [fetchVisualizations]);

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
                  options={visOptions}
                  selectedOptions={selectedOption ? [selectedOption] : []}
                  onChange={(newOption: EuiComboBoxOptionOption[]) => {
                    props.onChange({
                      id: newOption[0].key,
                      type: newOption[0].datatype,
                    });
                  }}
                />
              </EuiCompressedFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButton
                data-test-subj="para-input-visualization-browse-button"
                onClick={() => {
                  setSelectableOptions([
                    ...(props.visOptions[0]?.options || []),
                    ...(props.visOptions[1]?.options || []),
                  ] as EuiSelectableOption[]);
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
              start={props.value?.startTime}
              end={props.value?.endTime}
              showUpdateButton={false}
              dateFormat={uiSettings.get('dateFormat')}
              onTimeChange={(e) => {
                props.onChange({
                  ...props.value,
                  startTime: e.start,
                  endTime: e.end,
                });
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

            <EuiModalFooter>
              <EuiSmallButtonEmpty onClick={() => setIsModalOpen(false)}>
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton data-test-subj="para-input-select-button" onClick={onSelect} fill>
                Select
              </EuiSmallButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
