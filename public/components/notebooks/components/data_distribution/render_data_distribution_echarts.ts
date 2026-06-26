/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EChartsOption } from 'echarts';
import { NoteBookSource, SummaryDataItem } from '../../../../../common/types/notebooks';

/**
 * Generate ECharts option for a single field bar chart
 */
function generateEChartsOption(fieldData: SummaryDataItem, isComparison = true): EChartsOption {
  const xAxisData: string[] = [];
  const baselineData: number[] = [];
  const selectionData: number[] = [];

  fieldData.topChanges.forEach((change: Record<string, any>) => {
    const value = String(change.value || 'null');
    xAxisData.push(value);

    if (isComparison) {
      baselineData.push(change.baselinePercentage || 0);
    }
    selectionData.push(change.selectionPercentage || 0);
  });

  const series: EChartsOption['series'] = isComparison
    ? [
        {
          name: 'Baseline',
          type: 'bar',
          data: baselineData,
          itemStyle: { color: '#5470C6' },
          emphasis: { itemStyle: { opacity: 1 } },
        },
        {
          name: 'Selection',
          type: 'bar',
          data: selectionData,
          itemStyle: { color: '#FCCE2D' },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ]
    : [
        {
          name: 'Selection',
          type: 'bar',
          data: selectionData,
          itemStyle: { color: '#FCCE2D' },
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ];

  return {
    title: {
      text: fieldData.field,
      left: 'center',
      top: 0,
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: any) => `${(value * 100).toFixed(2)}%`,
    },
    legend: {
      data: isComparison ? ['Baseline', 'Selection'] : ['Selection'],
      top: 25,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 70,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        rotate: 0,
        overflow: 'truncate',
        width: 60,
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series,
  };
}

export interface EChartsChartData {
  option: EChartsOption;
  field: string;
}

/**
 * Generate ECharts options for all fields
 */
export function generateAllFieldECharts(
  comparisonData: SummaryDataItem[],
  source?: NoteBookSource
): EChartsChartData[] {
  const isComparison = source !== NoteBookSource.DISCOVER && source !== NoteBookSource.CHAT;
  return comparisonData.map((fieldData) => ({
    option: generateEChartsOption(fieldData, isComparison),
    field: fieldData.field,
  }));
}
