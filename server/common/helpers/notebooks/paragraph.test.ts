/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObject } from '../../../../../../src/core/server/types';
import { NotebookContext } from '../../../../common/types/notebooks';
import { updateParagraphText } from './paragraph';

describe('updateParagraphText', () => {
  const createMockNotebookInfo = (
    variables?: Record<string, unknown>
  ): SavedObject<{ savedNotebook: { context?: NotebookContext } }> => ({
    id: 'test-notebook-id',
    type: 'notebook',
    references: [],
    attributes: {
      savedNotebook: {
        context: variables ? { variables } : undefined,
      },
    },
  });

  describe('SQL paragraph processing', () => {
    it('should replace variables in SQL query with prefix removal', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
        timeRange: '7d',
        threshold: '1000',
      });

      const inputText =
        '%sql SELECT * FROM ${index} WHERE timestamp > now() - INTERVAL ${timeRange} AND count > ${threshold}';
      const expected =
        'SELECT * FROM logs-* WHERE timestamp > now() - INTERVAL 7d AND count > 1000';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle SQL query with no variables', () => {
      const mockNotebookInfo = createMockNotebookInfo();

      const inputText = '%sql SELECT * FROM logs WHERE timestamp > now() - INTERVAL 1d';
      const expected = 'SELECT * FROM logs WHERE timestamp > now() - INTERVAL 1d';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should preserve unmatched variable placeholders in SQL', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
      });

      const inputText = '%sql SELECT * FROM ${index} WHERE field = ${undefinedVar}';
      const expected = 'SELECT * FROM logs-* WHERE field = ${undefinedVar}';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle SQL query with complex variable values', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'my-index-2024-*',
        aggregation: 'avg',
        field: 'response_time',
        condition: '> 500',
      });

      const inputText =
        '%sql SELECT ${aggregation}(${field}) as result FROM ${index} WHERE ${field} ${condition}';
      const expected =
        'SELECT avg(response_time) as result FROM my-index-2024-* WHERE response_time > 500';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });
  });

  describe('PPL paragraph processing', () => {
    it('should replace variables in PPL query with prefix removal', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'metrics-*',
        timeField: '@timestamp',
        aggregation: 'count',
      });

      const inputText =
        '%ppl source=${index} | where ${timeField} > now() - 1d | stats ${aggregation}() by field';
      const expected = 'source=metrics-* | where @timestamp > now() - 1d | stats count() by field';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle PPL query with multiple variable occurrences', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
        field: 'status',
        value: 'error',
      });

      const inputText =
        '%ppl source=${index} | where ${field}="${value}" | stats count() by ${field}';
      const expected = 'source=logs-* | where status="error" | stats count() by status';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle PPL query with no variables', () => {
      const mockNotebookInfo = createMockNotebookInfo();

      const inputText = '%ppl source=logs-* | where status="error" | stats count()';
      const expected = 'source=logs-* | where status="error" | stats count()';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });
  });

  describe('Markdown paragraph processing', () => {
    it('should replace variables in markdown content with prefix removal', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        title: 'Daily Report',
        date: '2024-01-15',
        metric: 'response_time',
      });

      const inputText = '%md # ${title}\n\nReport generated on ${date} for ${metric} analysis.';
      const expected =
        '# Daily Report\n\nReport generated on 2024-01-15 for response_time analysis.';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle markdown with nested variable references', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        reportType: 'Performance',
        timeRange: 'last 24 hours',
        threshold: '500ms',
      });

      const inputText =
        '%md ## ${reportType} Analysis\n\nThis ${reportType.toLowerCase()} report covers the ${timeRange} with a threshold of ${threshold}.';
      const expected =
        '## Performance Analysis\n\nThis performance report covers the last 24 hours with a threshold of 500ms.';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle markdown with no variables', () => {
      const mockNotebookInfo = createMockNotebookInfo();

      const inputText = '%md # Static Report\n\nThis is a static markdown content.';
      const expected = '# Static Report\n\nThis is a static markdown content.';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty input text', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
      });

      const inputText = '%sql';
      const expected = '';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle input text shorter than prefix', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
      });

      const inputText = '%sq';
      const expected = '';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle notebook info without context', () => {
      const mockNotebookInfo = createMockNotebookInfo();

      const inputText = '%sql SELECT * FROM ${index}';
      const expected = 'SELECT * FROM ${index}';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle notebook info with empty context', () => {
      const mockNotebookInfo = createMockNotebookInfo({});

      const inputText = '%sql SELECT * FROM ${index}';
      const expected = 'SELECT * FROM ${index}';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle variables with special characters', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        'index-name': 'logs-2024-*',
        'field.name': 'response_time',
        'special@var': 'value',
      });

      const inputText =
        '%sql SELECT * FROM ${index-name} WHERE ${field.name} > 0 AND ${special@var} = "test"';
      const expected = 'SELECT * FROM logs-2024-* WHERE response_time > 0 AND value = "test"';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle variables with numeric values', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        threshold: 1000,
        limit: 100,
        offset: 0,
      });

      const inputText =
        '%sql SELECT * FROM logs WHERE count > ${threshold} LIMIT ${limit} OFFSET ${offset}';
      const expected = 'SELECT * FROM logs WHERE count > 1000 LIMIT 100 OFFSET 0';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle variables with boolean values', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        enabled: true,
        debug: false,
      });

      const inputText = '%sql SELECT * FROM logs WHERE enabled = ${enabled} AND debug = ${debug}';
      const expected = 'SELECT * FROM logs WHERE enabled = true AND debug = false';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle variables with null values', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: null,
        field: undefined,
      });

      const inputText = '%sql SELECT * FROM ${index} WHERE ${field} IS NOT NULL';
      const expected = 'SELECT * FROM null WHERE undefined IS NOT NULL';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });
  });

  describe('Variable substitution patterns', () => {
    it('should handle consecutive variable replacements', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        a: '1',
        b: '2',
        c: '3',
      });

      const inputText = '%sql SELECT ${a}, ${b}, ${c}';
      const expected = 'SELECT 1, 2, 3';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle nested variable placeholders', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index: 'logs-*',
        field: 'status',
      });

      const inputText = '%sql SELECT * FROM ${index} WHERE ${field} = "${field}_value"';
      const expected = 'SELECT * FROM logs-* WHERE status = "status_value"';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });

    it('should handle variable placeholders with underscores', () => {
      const mockNotebookInfo = createMockNotebookInfo({
        index_name: 'logs-*',
        field_name: 'status',
        table_name: 'events',
      });

      const inputText = '%sql SELECT * FROM ${table_name} WHERE ${field_name} = "error"';
      const expected = 'SELECT * FROM events WHERE status = "error"';

      const result = updateParagraphText(inputText, mockNotebookInfo);

      expect(result).toBe(expected);
    });
  });
});
