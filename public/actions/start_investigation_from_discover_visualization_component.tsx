/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { IEmbeddable } from '../../../../src/plugins/embeddable/public';
import { OpenSearchDashboardsContextProvider } from '../../../../src/plugins/opensearch_dashboards_react/public';
import {
  StartInvestigationModal,
  NotebookCreationPayload,
  StartInvestigateModalDedentServices,
} from '../components/notebooks/components/discover_explorer/start_investigation_modal';
import { NoteBookSource, NotebookType } from '../../common/types/notebooks';
import { calculateBounds, TimeRangeBounds } from '../../../../src/plugins/data/common';
import { SavedExplore } from '../../../../src/plugins/explore/public';
import { DEFAULT_VISUALIZATION_NAME } from '../../common/constants/notebooks';

export interface DiscoverVisualizationEmbeddable extends IEmbeddable {
  savedExplore: SavedExplore;
}

interface StartInvestigationFromDiscoverVisualizationComponentProps {
  embeddable: DiscoverVisualizationEmbeddable;
  services: StartInvestigateModalDedentServices;
  onClose: () => void;
}

export const StartInvestigationFromDiscoverVisualizationComponent = ({
  embeddable,
  services,
  onClose,
}: StartInvestigationFromDiscoverVisualizationComponentProps) => {
  const currentTime = useMemo(() => {
    return new Date().getTime();
  }, []);

  const handleProvideNotebookParameters = async (
    defaultParameters: NotebookCreationPayload
  ): Promise<NotebookCreationPayload> => {
    const input = embeddable.getInput();
    const timeRange = input.timeRange;
    const searchSource = embeddable.savedExplore.searchSource;

    // Extract time range from embeddable input
    let bounds: TimeRangeBounds | undefined;
    if (timeRange) {
      bounds = calculateBounds(timeRange);
    }

    // Extract query and filters from embeddable input
    const filters = input.filters || [];

    // Extract data source information
    const query = searchSource.getFields().query;
    if (!query || !query.query) {
      throw new Error('Query can not be found for this visualization');
    }
    const dataSourceId = query.dataset?.dataSource?.id ?? '';
    const indexTitle = query.dataset?.title;
    const timeFieldName = query.dataset?.timeFieldName;

    if (!bounds?.min || !bounds?.max) {
      throw new Error('Time range can not be found');
    }

    return {
      ...defaultParameters,
      name: DEFAULT_VISUALIZATION_NAME,
      context: {
        ...defaultParameters.context,
        dataSourceId,
        source: NoteBookSource.VISUALIZATION,
        index: indexTitle,
        notebookType: NotebookType.AGENTIC,
        timeField: timeFieldName,
        currentTime,
        timeRange: {
          selectionFrom: bounds.min.unix() * 1000,
          selectionTo: bounds.max.unix() * 1000,
        },
        variables: {
          pplQuery: query.query as string,
          savedObjectId: embeddable.savedExplore.id,
          visualizationFilters: filters,
        },
      },
    };
  };

  return (
    <OpenSearchDashboardsContextProvider services={services}>
      <StartInvestigationModal
        closeModal={onClose}
        onProvideNotebookParameters={handleProvideNotebookParameters}
      />
    </OpenSearchDashboardsContextProvider>
  );
};
