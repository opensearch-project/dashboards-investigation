/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useEffect, useState } from 'react';
import { OBSERVABILITY_VISUALIZATION_TYPE } from '../../../../../../common/constants/notebooks';
import { createDashboardVizObject } from '../../../../../../public/utils/visualization';
import { VisualizationInputValue } from '.';

const DEFAULT_VIZ_INPUT_VALUE = {
  type: '',
  id: '',
  startTime: 'now-15m',
  endTime: 'now',
};

export const useVisualizationValue = (inputValue: string | undefined) => {
  const [value, setValue] = useState<VisualizationInputValue | undefined>(DEFAULT_VIZ_INPUT_VALUE);

  const endDate = useMemo(() => new Date(), []);
  const inputJSON = useMemo(() => {
    return inputValue ? JSON.parse(inputValue) : createDashboardVizObject(DEFAULT_VIZ_INPUT_VALUE);
  }, [inputValue]);

  useEffect(() => {
    const visualizationPanel = inputJSON.panels[1];
    let selectedVisualizationId: string = visualizationPanel.explicitInput.savedObjectId as string;
    const startDate = new Date(endDate.toISOString());
    startDate.setDate(endDate.getDate() - 30);
    const startTime = inputJSON.timeRange.from || startDate.toISOString();
    const endTime = inputJSON.timeRange.to || endDate.toISOString();

    if (!selectedVisualizationId) {
      return;
    }

    const observabilityVisStartWord = `${OBSERVABILITY_VISUALIZATION_TYPE}:`;
    const ifIdIncludesType = selectedVisualizationId.startsWith(observabilityVisStartWord);

    const selectedVisualizationType = ifIdIncludesType
      ? OBSERVABILITY_VISUALIZATION_TYPE
      : visualizationPanel.type;
    selectedVisualizationId = ifIdIncludesType
      ? selectedVisualizationId.replace(observabilityVisStartWord, '')
      : selectedVisualizationId;

    const visualizationInputValue = {
      type: selectedVisualizationType,
      id: selectedVisualizationId,
      startTime,
      endTime,
    };

    setValue(visualizationInputValue);
  }, [inputJSON, endDate]);

  return { value, setValue };
};
