/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  StartInvestigationFromDiscoverVisualizationComponent,
  DiscoverVisualizationEmbeddable,
} from '../start_investigation_from_discover_visualization_component';
import { NoteBookSource, NotebookType } from '../../../common/types/notebooks';
import { DEFAULT_VISUALIZATION_NAME } from '../../../common/constants/notebooks';
import * as dataCommon from '../../../../../src/plugins/data/common';

// Mock dependencies
jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  OpenSearchDashboardsContextProvider: ({ children }: any) => <div>{children}</div>,
}));

jest.mock(
  '../../components/notebooks/components/discover_explorer/start_investigation_modal',
  () => ({
    StartInvestigationModal: ({ onProvideNotebookParameters }: any) => {
      // Store the callback for testing
      (global as any).testOnProvideNotebookParameters = onProvideNotebookParameters;
      return <div data-test-subj="start-investigation-modal">Modal</div>;
    },
  })
);

jest.mock('../../../../../src/plugins/data/common', () => ({
  calculateBounds: jest.fn(),
}));

describe('StartInvestigationFromDiscoverVisualizationComponent', () => {
  let mockEmbeddable: DiscoverVisualizationEmbeddable;
  let mockServices: any;
  let mockOnClose: jest.Mock;
  let mockCalculateBounds: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock calculateBounds
    mockCalculateBounds = dataCommon.calculateBounds as jest.Mock;
    mockCalculateBounds.mockReturnValue({
      min: { unix: () => 1000 },
      max: { unix: () => 2000 },
    });

    // Setup mock services
    mockServices = {
      data: {} as any,
      http: {} as any,
      application: {} as any,
      notifications: {} as any,
    };

    // Setup mock onClose
    mockOnClose = jest.fn();

    // Setup mock embeddable
    mockEmbeddable = {
      type: 'explore',
      savedExplore: {
        id: 'test-saved-explore-id',
        searchSource: {
          getFields: jest.fn().mockReturnValue({
            query: {
              query: 'source = test_index | stats count()',
              dataset: {
                dataSource: { id: 'test-datasource-id' },
                title: 'test-index',
                timeFieldName: '@timestamp',
              },
            },
          }),
        },
      },
      getInput: jest.fn().mockReturnValue({
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [{ meta: { disabled: false }, query: { match: { field: 'value' } } }],
      }),
      getOutput: jest.fn(),
      reload: jest.fn(),
      destroy: jest.fn(),
    } as any;
  });

  describe('rendering', () => {
    it('should render OpenSearchDashboardsContextProvider with services', () => {
      const { container } = render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should render StartInvestigationModal', () => {
      const { getByTestId } = render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      expect(getByTestId('start-investigation-modal')).toBeInTheDocument();
    });

    it('should pass closeModal prop to StartInvestigationModal', () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      // The modal component should receive the closeModal prop
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('handleProvideNotebookParameters', () => {
    it('should extract and return correct notebook parameters', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const defaultParameters = {
        name: 'Test Notebook',
        context: {
          initialGoal: 'Test goal',
        },
      };

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler(defaultParameters);

      expect(result).toEqual({
        ...defaultParameters,
        name: DEFAULT_VISUALIZATION_NAME,
        context: {
          ...defaultParameters.context,
          dataSourceId: 'test-datasource-id',
          source: NoteBookSource.VISUALIZATION,
          index: 'test-index',
          notebookType: NotebookType.AGENTIC,
          timeField: '@timestamp',
          currentTime: expect.any(Number),
          timeRange: {
            selectionFrom: 1000000,
            selectionTo: 2000000,
          },
          variables: {
            pplQuery: 'source = test_index | stats count()',
            savedObjectId: 'test-saved-explore-id',
            visualizationFilters: [
              { meta: { disabled: false }, query: { match: { field: 'value' } } },
            ],
          },
        },
      });
    });

    it('should use DEFAULT_VISUALIZATION_NAME for notebook name', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const defaultParameters = {
        name: 'Original Name',
        context: { initialGoal: 'Test' },
      };

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler(defaultParameters);

      expect(result.name).toBe(DEFAULT_VISUALIZATION_NAME);
    });

    it('should set source to VISUALIZATION', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.source).toBe(NoteBookSource.VISUALIZATION);
    });

    it('should set notebookType to AGENTIC', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.notebookType).toBe(NotebookType.AGENTIC);
    });

    it('should extract filters from embeddable input', async () => {
      const filters = [
        { meta: { disabled: false }, query: { match: { status: 'active' } } },
        { meta: { disabled: true }, query: { match: { type: 'error' } } },
      ];

      mockEmbeddable.getInput = jest.fn().mockReturnValue({
        timeRange: { from: 'now-15m', to: 'now' },
        filters,
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.variables.visualizationFilters).toEqual(filters);
    });

    it('should handle empty filters array', async () => {
      mockEmbeddable.getInput = jest.fn().mockReturnValue({
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [],
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.variables.visualizationFilters).toEqual([]);
    });

    it('should handle missing filters', async () => {
      mockEmbeddable.getInput = jest.fn().mockReturnValue({
        timeRange: { from: 'now-15m', to: 'now' },
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.variables.visualizationFilters).toEqual([]);
    });

    it('should calculate time bounds correctly', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      await handler({ name: 'Test', context: {} });

      expect(mockCalculateBounds).toHaveBeenCalledWith({ from: 'now-15m', to: 'now' });
    });

    it('should convert unix timestamps to milliseconds', async () => {
      mockCalculateBounds.mockReturnValue({
        min: { unix: () => 1234 },
        max: { unix: () => 5678 },
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.timeRange).toEqual({
        selectionFrom: 1234000,
        selectionTo: 5678000,
      });
    });

    it('should extract dataSourceId from query dataset', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.dataSourceId).toBe('test-datasource-id');
    });

    it('should handle missing dataSourceId', async () => {
      mockEmbeddable.savedExplore.searchSource.getFields = jest.fn().mockReturnValue({
        query: {
          query: 'test query',
          dataset: {
            title: 'test-index',
            timeFieldName: '@timestamp',
          },
        },
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.dataSourceId).toBe('');
    });

    it('should extract index title from query dataset', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.index).toBe('test-index');
    });

    it('should extract timeFieldName from query dataset', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.timeField).toBe('@timestamp');
    });

    it('should include savedObjectId in variables', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.variables.savedObjectId).toBe('test-saved-explore-id');
    });

    it('should include pplQuery in variables', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler({ name: 'Test', context: {} });

      expect(result.context.variables.pplQuery).toBe('source = test_index | stats count()');
    });

    it('should preserve default parameters context properties', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const defaultParameters = {
        name: 'Test',
        context: {
          initialGoal: 'My investigation goal',
          customProperty: 'custom value',
        },
      };

      const handler = (global as any).testOnProvideNotebookParameters;
      const result = await handler(defaultParameters);

      expect(result.context.initialGoal).toBe('My investigation goal');
      expect(result.context.customProperty).toBe('custom value');
    });
  });

  describe('error handling', () => {
    it('should throw error when query is missing', async () => {
      mockEmbeddable.savedExplore.searchSource.getFields = jest.fn().mockReturnValue({});

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Query can not be found for this visualization'
      );
    });

    it('should throw error when query.query is missing', async () => {
      mockEmbeddable.savedExplore.searchSource.getFields = jest.fn().mockReturnValue({
        query: {},
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Query can not be found for this visualization'
      );
    });

    it('should throw error when time range bounds are missing', async () => {
      mockCalculateBounds.mockReturnValue({});

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Time range can not be found'
      );
    });

    it('should throw error when min bound is missing', async () => {
      mockCalculateBounds.mockReturnValue({
        max: { unix: () => 2000 },
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Time range can not be found'
      );
    });

    it('should throw error when max bound is missing', async () => {
      mockCalculateBounds.mockReturnValue({
        min: { unix: () => 1000 },
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Time range can not be found'
      );
    });

    it('should throw error when timeRange is not provided in input', async () => {
      mockEmbeddable.getInput = jest.fn().mockReturnValue({
        filters: [],
      });

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;

      await expect(handler({ name: 'Test', context: {} })).rejects.toThrow(
        'Time range can not be found'
      );
    });
  });

  describe('currentTime memoization', () => {
    it('should generate currentTime on mount', () => {
      const beforeRender = Date.now();

      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const afterRender = Date.now();

      // CurrentTime should be between these two timestamps
      expect(beforeRender).toBeLessThanOrEqual(afterRender);
    });

    it('should use memoized currentTime in notebook parameters', async () => {
      render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      const handler = (global as any).testOnProvideNotebookParameters;
      const result1 = await handler({ name: 'Test', context: {} });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await handler({ name: 'Test', context: {} });

      // CurrentTime should be the same (memoized)
      expect(result1.context.currentTime).toBe(result2.context.currentTime);
    });
  });

  describe('integration', () => {
    it('should work with complete workflow', async () => {
      const { getByTestId } = render(
        <StartInvestigationFromDiscoverVisualizationComponent
          embeddable={mockEmbeddable}
          services={mockServices}
          onClose={mockOnClose}
        />
      );

      // Modal should be rendered
      expect(getByTestId('start-investigation-modal')).toBeInTheDocument();

      // Handler should be available
      const handler = (global as any).testOnProvideNotebookParameters;
      expect(handler).toBeDefined();

      // Should successfully create notebook parameters
      const result = await handler({ name: 'Test', context: { initialGoal: 'Test goal' } });
      expect(result).toBeDefined();
      expect(result.name).toBe(DEFAULT_VISUALIZATION_NAME);
      expect(result.context.source).toBe(NoteBookSource.VISUALIZATION);
    });
  });
});
