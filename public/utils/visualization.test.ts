/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPanelValue, createDashboardVizObject, DEFAULT_VIZ_INPUT_VALUE } from './visualization';
import { VisualizationInputValue } from 'public/components/notebooks/components/input/visualization_input';
import { DashboardContainerInput } from '../../../../src/plugins/dashboard/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { renderTopologyGraph } from './visualization';

describe('visualization utils', () => {
  describe('getPanelValue', () => {
    it('should merge panel value with visualization input', () => {
      const panelValue: DashboardContainerInput['panels'][number] = {
        gridData: {
          x: 0,
          y: 0,
          w: 50,
          h: 20,
          i: '1',
        },
        type: 'original-type',
        explicitInput: {
          id: '1',
        },
      };

      const value: VisualizationInputValue = {
        type: 'visualization',
        id: 'viz-123',
        startTime: 'now-1h',
        endTime: 'now',
      };

      const result = getPanelValue(panelValue, value);

      expect(result).toEqual({
        gridData: {
          x: 0,
          y: 0,
          w: 50,
          h: 20,
          i: '1',
        },
        type: 'visualization',
        explicitInput: {
          id: '1',
          savedObjectId: 'viz-123',
        },
      });
    });

    it('should override type with value type', () => {
      const panelValue: DashboardContainerInput['panels'][number] = {
        gridData: {
          x: 0,
          y: 0,
          w: 30,
          h: 15,
          i: '2',
        },
        type: 'old-type',
        explicitInput: {
          id: '2',
        },
      };

      const value: VisualizationInputValue = {
        type: 'new-type',
        id: 'new-id',
        startTime: 'now-24h',
        endTime: 'now',
      };

      const result = getPanelValue(panelValue, value);

      expect(result.type).toBe('new-type');
      expect(result.explicitInput.savedObjectId).toBe('new-id');
    });

    it('should preserve existing grid data', () => {
      const panelValue: DashboardContainerInput['panels'][number] = {
        gridData: {
          x: 10,
          y: 20,
          w: 40,
          h: 30,
          i: '3',
        },
        type: 'test',
        explicitInput: {
          id: '3',
        },
      };

      const value: VisualizationInputValue = {
        type: 'viz',
        id: 'viz-456',
        startTime: 'now-30m',
        endTime: 'now',
      };

      const result = getPanelValue(panelValue, value);

      expect(result.gridData).toEqual({
        x: 10,
        y: 20,
        w: 40,
        h: 30,
        i: '3',
      });
    });
  });

  describe('createDashboardVizObject', () => {
    it('should create dashboard visualization object with default values', () => {
      const value: VisualizationInputValue = {
        type: 'line-chart',
        id: 'chart-123',
        startTime: 'now-15m',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result).toMatchObject({
        viewMode: ViewMode.VIEW,
        isFullScreenMode: false,
        filters: [],
        useMargins: false,
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        query: {
          query: '',
          language: 'lucene',
        },
        refreshConfig: {
          pause: true,
          value: 15,
        },
      });
      expect(result.id).toBeDefined();
      expect(result.title).toContain('embed_viz_');
    });

    it('should create panel with correct structure', () => {
      const value: VisualizationInputValue = {
        type: 'bar-chart',
        id: 'bar-456',
        startTime: 'now-1h',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.panels['1']).toBeDefined();
      expect(result.panels['1'].type).toBe('bar-chart');
      expect(result.panels['1'].explicitInput.savedObjectId).toBe('bar-456');
      expect(result.panels['1'].gridData).toEqual({
        x: 0,
        y: 0,
        w: 50,
        h: 20,
        i: '1',
      });
    });

    it('should use custom time range', () => {
      const value: VisualizationInputValue = {
        type: 'pie-chart',
        id: 'pie-789',
        startTime: 'now-7d',
        endTime: 'now-1d',
      };

      const result = createDashboardVizObject(value);

      expect(result.timeRange).toEqual({
        from: 'now-7d',
        to: 'now-1d',
      });
    });

    it('should generate id and title for dashboard', () => {
      const value: VisualizationInputValue = {
        type: 'test',
        id: 'test-id',
        startTime: 'now-15m',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.id).toBeDefined();
      expect(result.title).toContain('embed_viz_');
      expect(typeof result.id).toBe('string');
      expect(typeof result.title).toBe('string');
    });

    it('should create object with VIEW mode', () => {
      const value: VisualizationInputValue = {
        type: 'area-chart',
        id: 'area-999',
        startTime: 'now-30m',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.viewMode).toBe(ViewMode.VIEW);
    });

    it('should initialize with empty filters array', () => {
      const value: VisualizationInputValue = {
        type: 'metric',
        id: 'metric-111',
        startTime: 'now-5m',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.filters).toEqual([]);
    });

    it('should set isFullScreenMode to false', () => {
      const value: VisualizationInputValue = {
        type: 'table',
        id: 'table-222',
        startTime: 'now-2h',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.isFullScreenMode).toBe(false);
    });

    it('should set useMargins to false', () => {
      const value: VisualizationInputValue = {
        type: 'heatmap',
        id: 'heatmap-333',
        startTime: 'now-12h',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.useMargins).toBe(false);
    });

    it('should set refresh config with pause true and value 15', () => {
      const value: VisualizationInputValue = {
        type: 'gauge',
        id: 'gauge-444',
        startTime: 'now-10m',
        endTime: 'now',
      };

      const result = createDashboardVizObject(value);

      expect(result.refreshConfig).toEqual({
        pause: true,
        value: 15,
      });
    });
  });

  describe('DEFAULT_VIZ_INPUT_VALUE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_VIZ_INPUT_VALUE).toEqual({
        type: '',
        id: '',
        startTime: 'now-15m',
        endTime: 'now',
      });
    });

    it('should be immutable', () => {
      const original = { ...DEFAULT_VIZ_INPUT_VALUE };

      expect(DEFAULT_VIZ_INPUT_VALUE).toEqual(original);
    });
  });
});

describe('renderTopologyGraph', () => {
  it('should render complete topology graph with expected format', () => {
    const topology = {
      id: 'T1',
      description: 'Product Addition Flow - User adding OLJCESPC7Z to cart resulting in 500 error',
      traceId: 'dfde0cdceffee06b1794943cb7ea4ae3',
      nodes: [
        {
          id: 'load-generator',
          name: 'load-generator: add_to_cart',
          startTime: '2025-12-24T06:12:40.603Z',
          duration: '11ms',
          status: 'success' as const,
          parentId: null,
        },
        {
          id: 'frontend-proxy-1',
          name: 'frontend-proxy: GET /api/products/OLJCESPC7Z',
          startTime: '2025-12-24T06:12:40.604Z',
          duration: '3ms',
          status: 'failed' as const,
          parentId: 'load-generator',
        },
        {
          id: 'product-catalog',
          name: 'product-catalog: GetProduct (no logs)',
          startTime: '2025-12-24T06:12:40.604Z',
          duration: '3ms',
          status: 'failed' as const,
          parentId: 'frontend-proxy-1',
        },
        {
          id: 'frontend-proxy-2',
          name: 'frontend-proxy: POST /api/cart',
          startTime: '2025-12-24T06:12:40.610Z',
          duration: '4ms',
          status: 'success' as const,
          parentId: 'load-generator',
        },
        {
          id: 'cart',
          name: 'cart: AddItemAsync',
          startTime: '2025-12-24T06:12:40.612Z',
          duration: '2ms',
          status: 'success' as const,
          parentId: 'frontend-proxy-2',
        },
      ],
    };

    const result = renderTopologyGraph(topology);

    const expectedGraph = `┌─────────────────────────────────────────────────────────────────────────────────┐
│ Product Addition Flow - User adding OLJCESPC7Z to cart resulting in 500 error   │
│ Trace ID: dfde0cdceffee06b1794943cb7ea4ae3                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ load-generator: add_to_cart                                                     │
│     Start: 2025-12-24T06:12:40.603Z                                             │
│     Duration: 11ms                                                              │
│     └─ [FAILED] frontend-proxy: GET /api/products/OLJCESPC7Z                    │
│        Start: 2025-12-24T06:12:40.604Z                                          │
│        Duration: 3ms                                                            │
│        └─ [FAILED] product-catalog: GetProduct (no logs)                        │
│           Start: 2025-12-24T06:12:40.604Z                                       │
│           Duration: 3ms                                                         │
│     └─ frontend-proxy: POST /api/cart                                           │
│        Start: 2025-12-24T06:12:40.610Z                                          │
│        Duration: 4ms                                                            │
│        └─ cart: AddItemAsync                                                    │
│           Start: 2025-12-24T06:12:40.612Z                                       │
│           Duration: 2ms                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘`;

    expect(result).toBe(expectedGraph);
  });
});
