/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import { darkMode } from '@osd/ui-shared-deps/theme';

// Theme name for data distribution charts
const THEME_NAME = 'osd-data-distribution';

/**
 * Get theme colors based on current dark mode setting
 */
const getThemeColors = () => ({
  text: darkMode ? '#FFF' : '#343741',
  subText: darkMode ? '#ccc' : '#69707d',
  grid: darkMode ? '#27252C' : '#eef1f7',
});

/**
 * Create and register ECharts theme with current colors
 */
const registerTheme = () => {
  const colors = getThemeColors();
  const axisConfig = {
    axisLine: { lineStyle: { color: colors.grid } },
    axisTick: { lineStyle: { color: colors.grid } },
    axisLabel: { color: colors.text },
    splitLine: { lineStyle: { color: [colors.grid] } },
  };

  echarts.registerTheme(THEME_NAME, {
    title: {
      textStyle: { color: colors.text },
      subtextStyle: { color: colors.subText },
    },
    legend: {
      textStyle: { color: colors.text },
    },
    categoryAxis: axisConfig,
    valueAxis: axisConfig,
  });
};

// Register theme on module load
registerTheme();

export interface EChartsChartProps {
  option: EChartsOption;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const EChartsChart: React.FC<EChartsChartProps> = ({
  option,
  width = '100%',
  height = 250,
  className,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);

  /**
   * Initialize chart instance
   */
  useEffect(() => {
    if (!chartRef.current) return;

    // Get existing instance or create new one
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = echarts.init(chartRef.current, THEME_NAME);
    }
    chartInstanceRef.current = chart;

    return () => {
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  /**
   * Update chart option when it changes
   */
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    chart.setOption(option, {
      notMerge: true,
      lazyUpdate: true,
    });
  }, [option]);

  /**
   * Handle resize
   */
  useEffect(() => {
    if (!chartRef.current) return;

    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(chartRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={chartRef} style={{ width, height }} className={className} />;
};
