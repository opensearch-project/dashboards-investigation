/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { OBSERVABILITY_VISUALIZATION_TYPE } from '../../../../../../common/constants/notebooks';
import { DashboardContainerInput } from '../../../../../../../../src/plugins/dashboard/public';

export const useVisualizationValue = (inputJSON: DashboardContainerInput) => {
  const endDate = useMemo(() => new Date(), []);

  return useMemo(() => {
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

    return visualizationInputValue;
  }, [inputJSON, endDate]);
};
