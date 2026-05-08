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

    // Check if using by-value embedding (has attributes but no savedObjectId)
    const isByValue = visualizationPanel.explicitInput.attributes && !selectedVisualizationId;

    if (!selectedVisualizationId && !isByValue) {
      // Neither by-reference nor by-value, invalid state
      return;
    }

    // For by-value, use panel id as the identifier
    if (isByValue) {
      selectedVisualizationId = visualizationPanel.explicitInput.id;
    }

    const observabilityVisStartWord = `${OBSERVABILITY_VISUALIZATION_TYPE}:`;
    const ifIdIncludesType = selectedVisualizationId?.startsWith(observabilityVisStartWord);

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
