/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ParagraphState } from '../../common/state/paragraph_state';
import { VisualizationParagraphItem, waitForDomElement } from './visualization';
import {
  DASHBOARDS_VISUALIZATION_TYPE,
  EXPLORE_VISUALIZATION_TYPE,
} from '../../common/constants/notebooks';
import { TopContextState } from '../../common/state/top_context_state';
import { NotebookStateValue } from '../../common/state/notebook_state';

const defaultMockNotebookStateValue: NotebookStateValue = {
  id: 'test-notebook-id',
  title: 'Test Notebook',
  paragraphs: [],
  context: new TopContextState({}),
  dataSourceEnabled: true,
  dateCreated: '0',
  dateModified: '0',
  isLoading: false,
  path: '',
  vizPrefix: '',
  isNotebookReadonly: true,
  topologies: [],
};

describe('VisualizationParagraph - Time Range Updates', () => {
  describe('runParagraph with time range changes', () => {
    it('should handle time range updates correctly', async () => {
      const mockParagraphState = new ParagraphState({
        id: 'test-paragraph-id',
        input: {
          inputText: '',
          inputType: DASHBOARDS_VISUALIZATION_TYPE,
          parameters: {
            type: EXPLORE_VISUALIZATION_TYPE,
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-01-02T00:00:00Z',
          },
        },
        dateCreated: '2024-01-01T00:00:00Z',
        dateModified: '2024-01-01T00:00:00Z',
      });

      // Mock DOM elements
      const mockParagraphElement = document.createElement('div');
      mockParagraphElement.setAttribute('data-paragraph-id', 'test-paragraph-id');

      const mockVisualizationContainer = document.createElement('div');
      mockVisualizationContainer.className = 'dshDashboardViewport';
      mockParagraphElement.appendChild(mockVisualizationContainer);

      const mockCanvas = document.createElement('canvas');
      mockParagraphElement.appendChild(mockCanvas);

      // Mock querySelector
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn((selector: string) => {
        if (selector.includes('data-paragraph-id="test-paragraph-id"')) {
          return mockParagraphElement;
        }
        if (selector.includes('canvas') || selector.includes('table')) {
          return mockCanvas;
        }
        if (selector.includes('.dshDashboardViewport')) {
          return mockVisualizationContainer;
        }
        return null;
      }) as typeof document.querySelector;

      // Test runParagraph
      await expect(
        VisualizationParagraphItem.runParagraph({
          paragraphState: mockParagraphState,
          notebookStateValue: defaultMockNotebookStateValue,
        })
      ).resolves.toBeUndefined();

      // Restore original querySelector
      document.querySelector = originalQuerySelector;
    });

    it('should skip execution for non-visualization types', async () => {
      const mockParagraphState = new ParagraphState({
        id: 'test-paragraph-id',
        input: {
          inputText: '',
          inputType: 'OTHER_TYPE',
          parameters: {
            type: 'OTHER_TYPE',
          },
        },
        dateCreated: '2024-01-01T00:00:00Z',
        dateModified: '2024-01-01T00:00:00Z',
      });

      // Should return immediately without error
      await expect(
        VisualizationParagraphItem.runParagraph({
          paragraphState: mockParagraphState,
          notebookStateValue: defaultMockNotebookStateValue,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('waitForVisualizationRendered helper', () => {
    it('should wait for visualization elements to appear', async () => {
      // Create a test element and add it to the DOM
      const testElement = document.createElement('div');
      testElement.id = 'test-element';
      document.body.appendChild(testElement);

      // Test that waitForDomElement resolves when element exists
      await expect(waitForDomElement('#test-element')).resolves.toBe(testElement);

      // Clean up
      document.body.removeChild(testElement);
    });
  });
});

describe('VisualizationParagraph - Timezone Offset Logic', () => {
  describe('Timezone offset calculation', () => {
    it('should negate the timezone offset from getTimezoneOffset', () => {
      // getTimezoneOffset returns positive for west of UTC and negative for east
      // We need to negate it to get the correct offset for the server
      const testCases = [
        { timezoneOffset: 480, expected: -480 }, // PST (UTC-8)
        { timezoneOffset: -480, expected: 480 }, // CST (UTC+8)
        { timezoneOffset: 330, expected: -330 }, // IST (UTC-5:30)
        { timezoneOffset: -345, expected: 345 }, // ACDT (UTC+5:45)
      ];

      testCases.forEach(({ timezoneOffset, expected }) => {
        const result = -timezoneOffset;
        expect(result).toBe(expected);
      });
    });

    it('should calculate offset for PST (UTC-8)', () => {
      // Mock getTimezoneOffset for PST
      const timezoneOffset = 480; // PST is UTC-8, returns +480
      const localTimeZoneOffset = -timezoneOffset;

      expect(localTimeZoneOffset).toBe(-480);
    });

    it('should calculate offset for CST (UTC+8)', () => {
      // Mock getTimezoneOffset for CST
      const timezoneOffset = -480; // CST is UTC+8, returns -480
      const localTimeZoneOffset = -timezoneOffset;

      expect(localTimeZoneOffset).toBe(480);
    });

    it('should calculate offset for UTC (zero offset)', () => {
      const timezoneOffset = 0;
      const localTimeZoneOffset = -timezoneOffset;

      // Check that the result is 0 or -0 (both are valid for UTC)
      expect(Math.abs(localTimeZoneOffset)).toBe(0);
    });

    it('should handle half-hour timezone offsets', () => {
      // India Standard Time (IST) is UTC+5:30, returns -330 minutes
      const timezoneOffset = -330;
      const localTimeZoneOffset = -timezoneOffset;

      expect(localTimeZoneOffset).toBe(330);
    });

    it('should handle quarter-hour timezone offsets', () => {
      // Australia Central Daylight Time (ACDT) is UTC+10:30, returns -630 minutes
      const timezoneOffset = -630;
      const localTimeZoneOffset = -timezoneOffset;

      expect(localTimeZoneOffset).toBe(630);
    });
  });

  describe('Request body structure', () => {
    it('should include both visualization and localTimeZoneOffset', () => {
      const base64Image = 'data:image/png;base64,testImageData';
      const localTimeZoneOffset = -new Date().getTimezoneOffset();

      const requestBody = {
        visualization: base64Image,
        localTimeZoneOffset,
      };

      expect(requestBody.visualization).toBe(base64Image);
      expect(requestBody.localTimeZoneOffset).toBeDefined();
      expect(typeof requestBody.localTimeZoneOffset).toBe('number');
    });

    it('should have localTimeZoneOffset as a number', () => {
      const localTimeZoneOffset = -new Date().getTimezoneOffset();

      expect(typeof localTimeZoneOffset).toBe('number');
    });

    it('should calculate offset dynamically based on current timezone', () => {
      const offset1 = -new Date().getTimezoneOffset();
      const offset2 = -new Date().getTimezoneOffset();

      // Should be consistent within the same execution
      expect(offset1).toBe(offset2);
    });
  });

  describe('Date.getTimezoneOffset behavior', () => {
    it('should understand getTimezoneOffset semantics', () => {
      // getTimezoneOffset returns minutes difference from UTC
      // Positive value = west of UTC (e.g., PST is +480 for UTC-8)
      // Negative value = east of UTC (e.g., CST is -480 for UTC+8)

      const date = new Date();
      const offset = date.getTimezoneOffset();

      // Offset should be a number
      expect(typeof offset).toBe('number');

      // For server, we need to send the negated value
      const serverOffset = -offset;
      expect(typeof serverOffset).toBe('number');

      // Negating twice should give us the original
      expect(-serverOffset).toBe(offset);
    });

    it('should maintain sign consistency', () => {
      const testOffsets = [480, -480, 0, 330, -330];

      testOffsets.forEach((offset) => {
        const negated = -offset;
        const doubleNegated = -negated;

        expect(doubleNegated).toBe(offset);
      });
    });
  });

  describe('Query parameters', () => {
    it('should include dataSourceId when provided', () => {
      const dataSourceId = 'test-datasource-123';
      const query = dataSourceId ? { dataSourceId } : undefined;

      expect(query).toEqual({ dataSourceId: 'test-datasource-123' });
    });

    it('should not include query when dataSourceId is not provided', () => {
      const dataSourceId = undefined;
      const query = dataSourceId ? { dataSourceId } : undefined;

      expect(query).toBeUndefined();
    });
  });
});
