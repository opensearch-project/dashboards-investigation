/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { htmlIdGenerator } from '@elastic/eui';
import { VisualizationInputValue } from 'public/components/notebooks/components/input/visualization_input';
import { DashboardContainerInput } from '../../../../src/plugins/dashboard/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';

export const getPanelValue = (
  panelValue: DashboardContainerInput['panels'][number],
  value: VisualizationInputValue
) => ({
  ...panelValue,
  type: value.type,
  explicitInput: {
    ...panelValue.explicitInput,
    savedObjectId: value.id,
  },
});

export const createDashboardVizObject = (value: VisualizationInputValue) => {
  const { startTime, endTime } = value;
  const vizUniqueId = htmlIdGenerator()();
  // a dashboard container object for new visualization
  const newVizObject: DashboardContainerInput = {
    viewMode: ViewMode.VIEW,
    panels: {
      '1': getPanelValue(
        {
          gridData: {
            x: 0,
            y: 0,
            w: 50,
            h: 20,
            i: '1',
          },
          type: '',
          explicitInput: {
            id: '1',
          },
        },
        value
      ),
    },
    isFullScreenMode: false,
    filters: [],
    useMargins: false,
    id: vizUniqueId,
    timeRange: {
      from: startTime,
      to: endTime,
    },
    title: 'embed_viz_' + vizUniqueId,
    query: {
      query: '',
      language: 'lucene',
    },
    refreshConfig: {
      pause: true,
      value: 15,
    },
  };
  return newVizObject;
};

export const DEFAULT_VIZ_INPUT_VALUE = {
  type: '',
  id: '',
  startTime: 'now-15m',
  endTime: 'now',
};
