/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObject } from '../../../../../../src/core/server/types';
import { NotebookContext } from '../../../../common/types/notebooks';
import { updateParagraphText } from './paragraph';

describe('updateParagraphText', () => {
  // Mock notebook info with complex nested structure
  const createMockNotebookInfo = (
    context: any
  ): SavedObject<{ savedNotebook: { context?: NotebookContext } }> => ({
    id: 'test-notebook',
    type: 'notebook',
    references: [],
    attributes: {
      savedNotebook: {
        context,
      },
    },
  });

  describe('Prefix removal', () => {
    it('should remove SQL prefix', () => {
      const inputText = '%sql SELECT * FROM table';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM table');
    });

    it('should remove PPL prefix', () => {
      const inputText = '%ppl source=index | stats count()';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('source=index | stats count()');
    });

    it('should remove Markdown prefix', () => {
      const inputText = '%md # Heading\n\nContent here';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('# Heading\n\nContent here');
    });

    it('should handle prefix with multiple spaces', () => {
      const inputText = '%sql   SELECT * FROM table';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM table');
    });

    it('should handle prefix with tabs', () => {
      const inputText = '%ppl\tsource=index | stats count()';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('source=index | stats count()');
    });
  });

  describe('Simple variable substitution', () => {
    it('should substitute simple variables', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          index: 'logs-*',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });

    it('should substitute multiple variables', () => {
      const inputText =
        '%sql SELECT * FROM ${context.variables.index} WHERE count > ${context.variables.threshold}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          index: 'logs-*',
          threshold: '1000',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-* WHERE count > 1000');
    });

    it('should keep original placeholder when variable not found', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.missing}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          index: 'logs-*',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.missing}');
    });
  });

  describe('Nested path access', () => {
    it('should access nested object properties', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.config.index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          config: {
            index: 'logs-*',
            timeout: 30,
          },
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });

    it('should access deeply nested properties', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.config.settings.database.index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          config: {
            settings: {
              database: {
                index: 'logs-*',
              },
            },
          },
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });

    it('should handle missing nested path gracefully', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.config.missing.index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          config: {
            index: 'logs-*',
          },
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.config.missing.index}');
    });
  });

  describe('Array index access', () => {
    it('should access array elements by index', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.indexes[0]}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          indexes: ['logs-*', 'metrics-*', 'events-*'],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });

    it('should access nested array elements', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.configs[0].index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          configs: [
            { index: 'logs-*', type: 'log' },
            { index: 'metrics-*', type: 'metric' },
          ],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });

    it('should handle array index out of bounds', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.indexes[10]}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          indexes: ['logs-*', 'metrics-*'],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.indexes[10]}');
    });

    it('should handle negative array index', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.indexes[-1]}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          indexes: ['logs-*', 'metrics-*'],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.indexes[-1]}');
    });
  });

  describe('Complex nested access', () => {
    it('should handle mixed array and object access', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.configs[0].databases[1].index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          configs: [
            {
              databases: [
                { index: 'logs-*', type: 'log' },
                { index: 'metrics-*', type: 'metric' },
              ],
            },
          ],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM metrics-*');
    });

    it('should handle multiple complex paths in one query', () => {
      const inputText =
        '%sql SELECT * FROM ${context.variables.configs[0].index} WHERE type = "${context.variables.configs[0].type}" AND count > ${context.variables.thresholds[1]}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          configs: [{ index: 'logs-*', type: 'log' }],
          thresholds: [100, 1000, 5000],
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-* WHERE type = "log" AND count > 1000');
    });
  });

  describe('Data type handling', () => {
    it('should handle numeric values', () => {
      const inputText =
        '%sql SELECT * FROM logs WHERE count > ${context.variables.threshold} LIMIT ${context.variables.limit}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          threshold: 1000,
          limit: 100,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE count > 1000 LIMIT 100');
    });

    it('should handle zero values', () => {
      const inputText =
        '%sql SELECT * FROM logs WHERE count > ${context.variables.threshold} OFFSET ${context.variables.offset}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          threshold: 1000,
          offset: 0,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE count > 1000 OFFSET 0');
    });

    it('should handle boolean values', () => {
      const inputText = '%sql SELECT * FROM logs WHERE active = ${context.variables.isActive}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          isActive: true,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE active = true');
    });

    it('should handle false boolean values', () => {
      const inputText = '%sql SELECT * FROM logs WHERE active = ${context.variables.isActive}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          isActive: false,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE active = false');
    });

    it('should handle empty string values', () => {
      const inputText = '%sql SELECT * FROM logs WHERE status = "${context.variables.status}"';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          status: '',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE status = ""');
    });

    it('should handle null values', () => {
      const inputText = '%sql SELECT * FROM logs WHERE value = ${context.variables.nullValue}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          nullValue: null,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs WHERE value = null');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty context', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.index}';
      const mockNotebookInfo = createMockNotebookInfo({});

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.index}');
    });

    it('should handle null context', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.index}';
      const mockNotebookInfo = createMockNotebookInfo(null);

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.index}');
    });

    it('should handle undefined context', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.index}';
      const mockNotebookInfo = createMockNotebookInfo(undefined);

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.index}');
    });

    it('should handle empty path', () => {
      const inputText = '%sql SELECT * FROM ${}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: { index: 'logs-*' },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${}');
    });

    it('should handle malformed path', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.index';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: { index: 'logs-*' },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables.index');
    });

    it('should handle special characters in path', () => {
      const inputText = '%sql SELECT * FROM ${context.variables["index-name"]}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          'index-name': 'logs-*',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM ${context.variables["index-name"]}');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complex SQL query with multiple variables', () => {
      const inputText =
        '%sql SELECT ${context.variables.fields[0]}, ${context.variables.fields[1]} FROM ${context.variables.index} WHERE ${context.variables.timeField} > now() - INTERVAL ${context.variables.timeRange} AND ${context.variables.condition}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          fields: ['timestamp', 'message'],
          index: 'logs-*',
          timeField: '@timestamp',
          timeRange: '1 day',
          condition: 'level = "error"',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(
        'SELECT timestamp, message FROM logs-* WHERE @timestamp > now() - INTERVAL 1 day AND level = "error"'
      );
    });

    it('should handle PPL query with nested configuration', () => {
      const inputText =
        '%ppl source=${context.variables.index} | where ${context.variables.timeField} > now() - ${context.variables.timeRange} | stats ${context.variables.aggregation}(${context.variables.field}) by ${context.variables.groupBy}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          index: 'logs-*',
          timeField: '@timestamp',
          timeRange: '24h',
          aggregation: 'avg',
          field: 'response_time',
          groupBy: 'status',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(
        'source=logs-* | where @timestamp > now() - 24h | stats avg(response_time) by status'
      );
    });

    it('should handle markdown with dynamic content', () => {
      const inputText =
        '%md # ${context.variables.reportTitle}\n\n## ${context.variables.metric} Analysis for ${context.variables.timeRange}\n\nThis report covers data from the last ${context.variables.timeRange} with a threshold of ${context.variables.threshold}ms.';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          reportTitle: 'Daily Performance Report',
          metric: 'Response Time',
          timeRange: '24 hours',
          threshold: 500,
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(
        '# Daily Performance Report\n\n## Response Time Analysis for 24 hours\n\nThis report covers data from the last 24 hours with a threshold of 500ms.'
      );
    });
  });

  describe('Performance and large data handling', () => {
    it('should handle large number of variables efficiently', () => {
      const inputText =
        '%sql SELECT * FROM ${context.variables.index} WHERE field1 = ${context.variables.value1} AND field2 = ${context.variables.value2} AND field3 = ${context.variables.value3}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          index: 'logs-*',
          value1: 'test1',
          value2: 'test2',
          value3: 'test3',
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(
        'SELECT * FROM logs-* WHERE field1 = test1 AND field2 = test2 AND field3 = test3'
      );
    });

    it('should handle deeply nested objects', () => {
      const inputText = '%sql SELECT * FROM ${context.variables.config.database.settings.index}';
      const mockNotebookInfo = createMockNotebookInfo({
        variables: {
          config: {
            database: {
              settings: {
                index: 'logs-*',
              },
            },
          },
        },
      });

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe('SELECT * FROM logs-*');
    });
  });
});
