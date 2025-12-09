/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseStep, isMarkdownText } from '../utils';

describe('parseStep', () => {
  it('should parse purpose, context, and tool from structured step format', () => {
    const stepText =
      '<step><purpose>Query error logs for given time</purpose><context>context information for executor agent to solve this task</context><tool>Tool name and parameters</tool></step>';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs for given time',
      context: 'context information for executor agent to solve this task',
      tool: 'Tool name and parameters',
      isStructured: true,
    });
  });

  it('should parse only purpose if context and tool are missing', () => {
    const stepText = '<step><purpose>Query error logs for given time</purpose></step>';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs for given time',
      context: undefined,
      tool: undefined,
      isStructured: true,
    });
  });

  it('should handle multiline purpose and context text', () => {
    const stepText = `<step><purpose>Query error logs
for given time range</purpose><context>Use the time range
from user input</context><tool>some tool</tool></step>`;
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs\nfor given time range',
      context: 'Use the time range\nfrom user input',
      tool: 'some tool',
      isStructured: true,
    });
  });

  it('should return original text as purpose if not in structured format', () => {
    const stepText = 'Query error logs for given time';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs for given time',
      isStructured: false,
    });
  });

  it('should handle empty string', () => {
    const result = parseStep('');
    expect(result).toEqual({
      purpose: '',
      isStructured: false,
    });
  });

  it('should handle null or undefined gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseStep(null as any)).toEqual({
      purpose: '',
      isStructured: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseStep(undefined as any)).toEqual({
      purpose: '',
      isStructured: false,
    });
  });

  it('should handle malformed XML gracefully', () => {
    const stepText = '<step><purpose>Query error logs</purpose>';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs',
      context: undefined,
      tool: undefined,
      isStructured: true,
    });
  });

  it('should trim whitespace from extracted purpose, context, and tool', () => {
    const stepText =
      '<step><purpose>  Query error logs  </purpose><context>  some context  </context><tool>  some tool  </tool></step>';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs',
      context: 'some context',
      tool: 'some tool',
      isStructured: true,
    });
  });

  it('should handle empty context tag', () => {
    const stepText =
      '<step><purpose>Query error logs</purpose><context></context><tool>tool</tool></step>';
    const result = parseStep(stepText);
    expect(result).toEqual({
      purpose: 'Query error logs',
      context: undefined,
      tool: 'tool',
      isStructured: true,
    });
  });
});

describe('isMarkdownText', () => {
  it('should detect markdown with multiple patterns', () => {
    const text = '# Header\n**bold** and *italic* and `code`';
    expect(isMarkdownText(text)).toBe(true);
  });

  it('should detect markdown with lists, formatting and code', () => {
    const text = '- item 1\n- item 2\n**bold** text and `code`';
    expect(isMarkdownText(text)).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(isMarkdownText('This is just plain text')).toBe(false);
  });
});
