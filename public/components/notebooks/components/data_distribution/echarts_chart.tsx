/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import { darkMode } from '@osd/ui-shared-deps/theme';

// Simple theme for data distribution charts
const THEME_NAME = 'osd-data-distribution';

// Register theme based on current dark mode
const textColor = darkMode ? '#FFF' : '#343741';
const subTextColor = darkMode ? '#ccc' : '#69707d';
const gridColor = darkMode ? '#27252C' : '#eef1f7';

echarts.registerTheme(THEME_NAME, {
  title: {
    textStyle: { color: textColor },
    subtextStyle: { color: subTextColor },
  },
  legend: {
    textStyle: { color: textColor },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: gridColor } },
    axisTick: { lineStyle: { color: gridColor } },
    axisLabel: { color: textColor },
    splitLine: { lineStyle: { color: [gridColor] } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: gridColor } },
    axisTick: { lineStyle: { color: gridColor } },
    axisLabel: { color: textColor },
    splitLine: { lineStyle: { color: [gridColor] } },
  },
});

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
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);

  const containerResizeObserver = useMemo(
    () =>
      new ResizeObserver(() => {
        chartInstanceRef.current?.resize();
      }),
    []
  );

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with theme
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, THEME_NAME);
    }

    // Set option with notMerge to ensure clean update
    chartInstanceRef.current.setOption(option, { notMerge: true });

    // Handle resize
    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Observe container size changes
    containerResizeObserver.observe(chartRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerResizeObserver.disconnect();
    };
  }, [option, containerResizeObserver]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={chartRef} style={{ width, height }} className={className} />;
};
