/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { htmlIdGenerator } from '@elastic/eui';
import { PERAgentTopology, PERAgentTopologyNode } from 'common/types/notebooks';

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

export const renderTopologyGraph = (topology: PERAgentTopology): string => {
  const { nodes, traceId, description } = topology;

  const rootNodes = nodes.filter((node) => node.parentId === null);

  const renderNode = (node: PERAgentTopologyNode, depth: number = 0): string => {
    const indent = '   '.repeat(depth);
    const statusPrefix = node.status === 'failed' || node.status === 'error' ? '[FAILED] ' : '';
    const connector = depth > 0 ? ' └─ ' : '';

    let result = `${indent}${connector}${statusPrefix}${node.name}\n`;
    result += `${indent}    Start: ${node.startTime}\n`;
    result += `${indent}    Duration: ${node.duration}\n`;

    const children = nodes.filter((n) => n.parentId === node.id);
    children.forEach((child) => {
      result += renderNode(child, depth + 1);
    });

    return result;
  };

  const headerLines = [description, `Trace ID: ${traceId}`];
  const allLines = [] as any[];

  rootNodes.forEach((root) => {
    const nodeContent = renderNode(root)
      .split('\n')
      .filter((line) => line.trim());
    allLines.push(...nodeContent);
  });

  const maxContentWidth = Math.max(
    ...headerLines.map((line) => line.length),
    ...allLines.map((line) => line.length)
  );

  const width = Math.max(80, maxContentWidth + 4);
  const border = '─'.repeat(width);

  let graph = `┌${border}┐\n`;
  headerLines.forEach((line) => {
    graph += `│ ${line}${' '.repeat(width - line.length - 1)}│\n`;
  });
  graph += `├${border}┤\n`;

  allLines.forEach((line) => {
    graph += `│ ${line}${' '.repeat(Math.max(0, width - line.length - 1))}│\n`;
  });

  graph += `└${border}┘`;

  return graph;
};
