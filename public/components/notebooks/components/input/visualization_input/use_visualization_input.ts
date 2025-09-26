/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState, useEffect } from 'react';
import { EuiComboBoxOptionOption, EuiSelectableOption } from '@elastic/eui';
import { NoteBookServices } from 'public/types';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { SavedObjectsActions } from '../../../../../services/saved_objects/saved_object_client/saved_objects_actions';
import { ObservabilitySavedVisualization } from '../../../../../services/saved_objects/saved_object_client/types';
import {
  DASHBOARDS_VISUALIZATION_TYPE,
  OBSERVABILITY_VISUALIZATION_TYPE,
} from '../../../../../../common/constants/notebooks';
import { getVisualizations } from '../../../../../../public/services';

export const useVisualizationInput = () => {
  const {
    services: { uiSettings, dataSource, savedObjects },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { get: getVisualizationType } = getVisualizations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]);
  const [visOptions, setVisOptions] = useState<EuiComboBoxOptionOption[]>([]);

  const fetchSavedObjectsVisualizations = useCallback(() => {
    return savedObjects.client
      ?.find<{ title: string; typeName: string; visState: object }>({
        type: ['visualization-visbuilder', 'visualization-nlq', 'explore', 'visualization'],
        page: 1,
        perPage: 1000,
      })
      .then((res) => {
        return res.savedObjects.map(({ id, attributes }) => {
          let typeName = attributes.typeName;
          if (attributes.visState) {
            try {
              typeName = JSON.parse(String(attributes.visState)).type;
            } catch (e) {
              // Do nothing
            }
          }
          const { title, icon } = getVisualizationType(typeName) || {};
          return {
            label: `${title ? `(${title})` : ''} ${attributes.title}`,
            key: id,
            datatype: DASHBOARDS_VISUALIZATION_TYPE,
            icon: icon || 'beaker',
          };
        });
      })
      .catch((error) => {
        console.error('Failed to fetch visualizations', error);
        return [];
      });
  }, [savedObjects.client, getVisualizationType]);

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
              icon: 'beaker',
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

  const updateSelectableOptions = useCallback(() => {
    setSelectableOptions([
      ...(visOptions[0]?.options || []),
      ...(visOptions[1]?.options || []),
    ] as EuiSelectableOption[]);
  }, [visOptions]);

  const onSelect = useCallback(() => {
    const selectedOptions = selectableOptions.filter((opt) => opt.checked === 'on');
    if (selectedOptions.length === 0) {
      return;
    }
    return selectedOptions[0];
  }, [selectableOptions]);

  const openModal = useCallback(() => {
    updateSelectableOptions();
    setIsModalOpen(true);
  }, [updateSelectableOptions]);

  useEffect(() => {
    fetchVisualizations();
  }, [fetchVisualizations]);

  useEffect(() => {
    if (isModalOpen && visOptions.length > 0) {
      updateSelectableOptions();
    }
  }, [visOptions, isModalOpen, updateSelectableOptions]);

  return {
    uiSettings,
    isModalOpen,
    setIsModalOpen,
    selectableOptions,
    setSelectableOptions,
    onSelect,
    openModal,
  };
};
