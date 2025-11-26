/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { extractCodeBlockType, getInputType } from './paragraph';
import { ParagraphBackendType } from '../types/notebooks';

describe('paragraph utils', () => {
  describe('extractCodeBlockType', () => {
    it('should extract code block type from content', () => {
      expect(extractCodeBlockType('%sql SELECT * FROM table')).toBe('sql');
      expect(extractCodeBlockType('%ppl source=logs')).toBe('ppl');
      expect(extractCodeBlockType('%markdown # Title')).toBe('markdown');
    });

    it('should return empty string for content without code block type', () => {
      expect(extractCodeBlockType('SELECT * FROM table')).toBe('');
      expect(extractCodeBlockType('# Regular markdown')).toBe('');
      expect(extractCodeBlockType('')).toBe('');
    });

    it('should handle whitespace after code block type', () => {
      expect(extractCodeBlockType('%sql  SELECT * FROM table')).toBe('sql');
      expect(extractCodeBlockType('%ppl   source=logs')).toBe('ppl');
    });

    it('should only match word characters', () => {
      expect(extractCodeBlockType('%sql-test SELECT')).toBe('');
      expect(extractCodeBlockType('%123 test')).toBe('123');
    });
  });

  describe('getInputType', () => {
    it('should extract code block type for MARKDOWN input', () => {
      const paragraph: ParagraphBackendType<any> = {
        input: {
          inputType: 'MARKDOWN',
          inputText: '%sql SELECT * FROM table',
        },
      } as any;

      expect(getInputType(paragraph)).toBe('sql');
    });

    it('should extract code block type for CODE input', () => {
      const paragraph: ParagraphBackendType<any> = {
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=logs',
        },
      } as any;

      expect(getInputType(paragraph)).toBe('ppl');
    });

    it('should return inputType directly for other types', () => {
      const paragraph: ParagraphBackendType<any> = {
        input: {
          inputType: 'VISUALIZATION',
          inputText: '',
        },
      } as any;

      expect(getInputType(paragraph)).toBe('VISUALIZATION');
    });

    it('should return empty string if no code block type found in MARKDOWN', () => {
      const paragraph: ParagraphBackendType<any> = {
        input: {
          inputType: 'MARKDOWN',
          inputText: '# Regular markdown',
        },
      } as any;

      expect(getInputType(paragraph)).toBe('');
    });
  });
});
