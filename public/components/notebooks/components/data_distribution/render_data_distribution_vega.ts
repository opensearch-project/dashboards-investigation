/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NoteBookSource, SummaryDataItem } from '../../../../../common/types/notebooks';

/**
 * Vega Lite specification for generating grouped bar charts for individual fields
 * @param {Object} fieldData
 * @returns {Object} - Vega-Lite Spec
 */
function generateChartSpec(fieldData: SummaryDataItem, isComparison = true) {
  // Prepare data
  const values = fieldData.topChanges.flatMap((change: Record<string, any>) => {
    const baseItem = {
      value: String(change.value || 'null'),
      selectionPercentage: change.selectionPercentage,
    };

    if (!isComparison) {
      return [
        {
          ...baseItem,
          percentage: change.selectionPercentage,
          type: 'Selection',
        },
      ];
    }

    return [
      {
        ...baseItem,
        percentage: change.baselinePercentage,
        baselinePercentage: change.baselinePercentage,
        type: 'Baseline',
      },
      {
        ...baseItem,
        percentage: change.selectionPercentage,
        baselinePercentage: change.baselinePercentage,
        type: 'Selection',
      },
    ];
  });

  // Define colors and tooltips
  const colorDomain = isComparison ? ['Baseline', 'Selection'] : ['Selection'];
  const colorRange = isComparison ? ['#5470C6', '#FCCE2D'] : ['#FCCE2D'];
  const tooltipFields = isComparison
    ? [
        { field: 'value', type: 'nominal', title: 'value' },
        { field: 'baselinePercentage', type: 'quantitative', title: 'Baseline', format: '.2%' },
        { field: 'selectionPercentage', type: 'quantitative', title: 'Selection', format: '.2%' },
      ]
    : [
        { field: 'value', type: 'nominal', title: 'value' },
        { field: 'percentage', type: 'quantitative', title: 'Selection', format: '.2%' },
      ];

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: { text: fieldData.field },
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
          domain: colorDomain,
          range: colorRange,
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
      tooltip: tooltipFields,
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
export function generateAllFieldCharts(comparisonData: SummaryDataItem[], source?: NoteBookSource) {
  const isComparison = source !== NoteBookSource.DISCOVER && source !== NoteBookSource.CHAT;
  return comparisonData.map((fieldData) => generateChartSpec(fieldData, isComparison));
}
