/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SummaryDataItem } from '../../../../../common/types/notebooks';

/**
 * Vega Lite specification for generating grouped bar charts for individual fields
 * @param {Object} fieldData
 * @returns {Object} - Vega-Lite Spec
 */
function generateFieldBarChartSpec(fieldData: SummaryDataItem) {
  // Create a dataset and calculate the percentage
  const values = fieldData.topChanges.flatMap((change) => [
    {
      value: String(change.value || 'null'),
      // count: change.baselineCount,
      percentage: change.baselinePercentage,
      baselinePercentage: change.baselinePercentage,
      SelectionPercentage: change.selectionPercentage,
      type: 'Baseline',
      // total: baselineTotal
    },
    {
      value: String(change.value || 'null'),
      // count: change.selectionCount,
      percentage: change.selectionPercentage,
      baselinePercentage: change.baselinePercentage,
      SelectionPercentage: change.selectionPercentage,
      type: 'Selection',
      // total: selectionTotal
    },
  ]);

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: {
      text: fieldData.field,
    },
    data: { values },
    params: [
      {
        name: 'highlight',
        select: {
          type: 'point',
          on: 'mouseover',
          clear: 'mouseout',
          encodings: ['x'],
          fields: ['value'],
        },
      },
    ],
    mark: 'bar',
    encoding: {
      x: {
        field: 'value',
        type: 'nominal',
        title: null,
        axis: {
          labelOverlap: true,
          labelAngle: 0,
          labelLimit: 50,
          grid: true,
        },
        sort: null,
      },
      xOffset: {
        field: 'type',
        type: 'nominal',
      },
      y: {
        field: 'percentage',
        type: 'quantitative',
        title: null,
        axis: {
          labels: false,
          ticks: false,
          domain: false,
          grid: false,
        },
      },
      color: {
        field: 'type',
        type: 'nominal',
        title: null,
        scale: {
          domain: ['Baseline', 'Selection'],
          range: ['#5470C6', '#FCCE2D'],
        },
        legend: {
          orient: 'top',
          direction: 'horizontal',
        },
      },
      opacity: {
        condition: { param: 'highlight', value: 1 },
        value: 0.5,
      },
      tooltip: [
        { field: 'value', type: 'nominal', title: 'value' },
        // { field: "count", type: "quantitative", title: "count" },
        // { field: "total", type: "quantitative", title: "total" },
        { field: 'baselinePercentage', type: 'quantitative', title: 'Baseline', format: '.2%' },
        { field: 'SelectionPercentage', type: 'quantitative', title: 'Selection', format: '.2%' },
        // { field: "type", type: "nominal", title: "type" }
      ],
    },
    config: {
      view: { stroke: 'transparent' },
    },
  };
}

/**
 * @param {Array} comparisonData
 * @returns {Array}
 */
export function generateAllFieldCharts(comparisonData: SummaryDataItem[]) {
  return comparisonData.map((fieldData) => generateFieldBarChartSpec(fieldData));
}
