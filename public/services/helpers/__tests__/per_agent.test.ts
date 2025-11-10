/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  generateContextPromptFromParagraphs,
  getNotebookTopLevelContextPrompt,
} from '../per_agent';
import { NotebookContext } from '../../../../common/types/notebooks';
import { ParagraphStateValue } from '../../../../common/state/paragraph_state';
import { ParagraphServiceSetup } from '../../paragraph_service';

// Mock moment
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    ...actualMoment,
    utc: jest.fn(() => ({
      format: jest.fn(() => '2024-01-01 12:00:00'),
    })),
  };
});

describe('per_agent helpers', () => {
  describe('getNotebookTopLevelContextPrompt', () => {
    it('should return empty string when no context information provided', () => {
      const result = getNotebookTopLevelContextPrompt({} as NotebookContext);
      expect(result).toBe('');
    });

    it('should generate complete context prompt', () => {
      const notebookInfo: NotebookContext = {
        index: 'test-index',
        timeField: '@timestamp',
        timeRange: {
          selectionFrom: 1704110400000,
          selectionTo: 1704196800000,
          baselineFrom: 1704024000000,
          baselineTo: 1704110400000,
        },
        filters: [{ term: { status: 'error' } }],
        variables: { query: 'error logs' },
        summary: 'Investigating error spike',
      };

      const result = getNotebookTopLevelContextPrompt(notebookInfo);

      expect(result).toContain('**Investigation Summary**: Investigating error spike');
      expect(result).toContain('**Relevant Index name**: test-index');
      expect(result).toContain('**Time Field**: @timestamp');
      expect(result).toContain(
        '**Time Period the issue happens**: From 2024-01-01 12:00:00 to 2024-01-01 12:00:00'
      );
      expect(result).toContain(
        '**Time Period as baseline**: From 2024-01-01 12:00:00 to 2024-01-01 12:00:00'
      );
      expect(result).toContain('**Applied Filters**');
      expect(result).toContain('**Variables**');
    });

    it('should handle partial context information', () => {
      const notebookInfo: NotebookContext = {
        index: 'test-index',
        summary: 'Test investigation',
      };

      const result = getNotebookTopLevelContextPrompt(notebookInfo);

      expect(result).toContain('**Investigation Summary**: Test investigation');
      expect(result).toContain('**Relevant Index name**: test-index');
      expect(result).not.toContain('**Time Field**');
      expect(result).not.toContain('**Time Period**');
    });
  });

  describe('generateContextPromptFromParagraphs', () => {
    let mockParagraphService: jest.Mocked<ParagraphServiceSetup>;
    let mockParagraphs: ParagraphStateValue[];
    let mockNotebookInfo: NotebookContext;

    beforeEach(() => {
      mockParagraphService = {
        register: jest.fn(),
        getParagraphRegistry: jest.fn(),
      };

      mockParagraphs = [
        {
          id: 'para-1',
          input: {
            inputType: 'PPL',
            inputText: 'source=logs | stats count by level',
          },
          output: [{ result: 'test result 1' }],
          dateCreated: '2024-01-01',
          dateModified: '2024-01-01',
        },
        {
          id: 'para-2',
          input: {
            inputType: 'MARKDOWN',
            inputText: '# Analysis',
          },
          output: [{ result: 'test result 2' }],
          dateCreated: '2024-01-01',
          dateModified: '2024-01-01',
        },
      ];

      mockNotebookInfo = {
        index: 'test-index',
        summary: 'Test notebook',
      };
    });

    it('should generate prompt with all paragraph contexts', async () => {
      const mockRegistry1 = {
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue('Context from paragraph 1'),
      };
      const mockRegistry2 = {
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue('Context from paragraph 2'),
      };

      mockParagraphService.getParagraphRegistry
        .mockReturnValueOnce(mockRegistry1)
        .mockReturnValueOnce(mockRegistry2);

      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: mockParagraphs,
        notebookInfo: mockNotebookInfo,
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(result).toContain('Context from paragraph 1');
      expect(result).toContain('Context from paragraph 2');
      expect(mockParagraphService.getParagraphRegistry).toHaveBeenCalledTimes(2);
      expect(mockRegistry1.getContext).toHaveBeenCalledWith(mockParagraphs[0]);
      expect(mockRegistry2.getContext).toHaveBeenCalledWith(mockParagraphs[1]);
    });

    it('should ignore specified paragraph types', async () => {
      const mockRegistry = {
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue('Context from paragraph'),
      };

      mockParagraphService.getParagraphRegistry.mockReturnValue(mockRegistry);

      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: mockParagraphs,
        notebookInfo: mockNotebookInfo,
        ignoreInputTypes: ['PPL'],
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(result).toContain('Context from paragraph');
      expect(mockParagraphService.getParagraphRegistry).toHaveBeenCalledTimes(1);
      expect(mockRegistry.getContext).toHaveBeenCalledWith(mockParagraphs[1]);
    });

    it('should skip paragraphs without registry', async () => {
      mockParagraphService.getParagraphRegistry.mockReturnValueOnce(undefined).mockReturnValueOnce({
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue('Context from paragraph 2'),
      });

      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: mockParagraphs,
        notebookInfo: mockNotebookInfo,
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(result).toContain('Context from paragraph 2');
      expect(result).not.toContain('Context from paragraph 1');
    });

    it('should skip paragraphs without getContext method', async () => {
      mockParagraphService.getParagraphRegistry
        .mockReturnValueOnce({
          ParagraphComponent: jest.fn(),
          // No getContext method
        })
        .mockReturnValueOnce({
          ParagraphComponent: jest.fn(),
          getContext: jest.fn().mockResolvedValue('Context from paragraph 2'),
        });

      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: mockParagraphs,
        notebookInfo: mockNotebookInfo,
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(result).toContain('Context from paragraph 2');
    });

    it('should handle empty paragraphs array', async () => {
      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: [],
        notebookInfo: mockNotebookInfo,
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(mockParagraphService.getParagraphRegistry).not.toHaveBeenCalled();
    });

    it('should filter out empty context results', async () => {
      const mockRegistry1 = {
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue(''),
      };
      const mockRegistry2 = {
        ParagraphComponent: jest.fn(),
        getContext: jest.fn().mockResolvedValue('Valid context'),
      };

      mockParagraphService.getParagraphRegistry
        .mockReturnValueOnce(mockRegistry1)
        .mockReturnValueOnce(mockRegistry2);

      const result = await generateContextPromptFromParagraphs({
        paragraphService: mockParagraphService,
        paragraphs: mockParagraphs,
        notebookInfo: mockNotebookInfo,
      });

      expect(result).toContain('**Investigation Summary**: Test notebook');
      expect(result).toContain('Valid context');
      expect(result.split('\n').filter((line) => line.trim()).length).toBeGreaterThan(1);
    });
  });
});
