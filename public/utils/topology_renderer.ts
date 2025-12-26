/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

interface TopologyNode {
  id: string;
  name: string;
  startTime: string;
  duration: string;
  status: 'success' | 'failed' | 'error';
  parentId: string | null;
}

interface Topology {
  id: string;
  description: string;
  traceId: string;
  nodes: TopologyNode[];
}

export const renderTopologyGraph = (topology: Topology): string => {
  const { nodes, traceId, description } = topology;

  // Build hierarchy
  const rootNodes = nodes.filter((node) => node.parentId === null);

  const renderNode = (node: TopologyNode, depth: number = 0): string => {
    const indent = '   '.repeat(depth);
    const statusPrefix = node.status === 'failed' || node.status === 'error' ? '[FAILED] ' : '';
    const connector = depth > 0 ? ' └─ ' : '';

    let result = `${indent}${connector}${statusPrefix}${node.name}\n`;
    result += `${indent}    Start: ${node.startTime}\n`;
    result += `${indent}    Duration: ${node.duration}\n`;

    // Find children
    const children = nodes.filter((n) => n.parentId === node.id);
    children.forEach((child) => {
      result += renderNode(child, depth + 1);
    });

    return result;
  };

  // Calculate dynamic width
  const headerText = `${description} (TraceId: ${traceId})`;
  const allLines = [] as any[];

  rootNodes.forEach((root) => {
    const nodeContent = renderNode(root)
      .split('\n')
      .filter((line) => line.trim());
    allLines.push(...nodeContent);
  });

  const maxContentWidth = Math.max(headerText.length, ...allLines.map((line) => line.length));

  const width = Math.max(80, maxContentWidth + 4); // minimum 80, +4 for padding
  const border = '─'.repeat(width);

  let graph = `┌${border}┐\n`;
  graph += `│ ${headerText}${' '.repeat(width - headerText.length - 1)}│\n`;
  graph += `├${border}┤\n`;

  allLines.forEach((line) => {
    graph += `│ ${line}${' '.repeat(Math.max(0, width - line.length - 1))}│\n`;
  });

  graph += `└${border}┘`;

  return graph;
};
