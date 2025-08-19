/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Import necessary types
import { NotebookType } from '../../../../../../common/types/notebooks';
import { isAgenticRunBefore } from '../utils';

// Mock NotebookState interface for testing
interface MockNotebookState {
  getContext: () => { notebookType: NotebookType };
  value: { paragraphs: Array<{ value: { id: string } }> };
}

describe('Paragraph Components Utils', () => {
  describe('isAgenticRunBefore', () => {
    it('should return true for agentic notebook and paragraph is not last', () => {
      // Create mock notebook state
      const mockNotebookState: MockNotebookState = {
        getContext: () => ({ notebookType: NotebookType.AGENTIC }),
        value: {
          paragraphs: [{ value: { id: '1' } }, { value: { id: '2' } }, { value: { id: '3' } }],
        },
      };

      const result = isAgenticRunBefore({
        notebookState: mockNotebookState as any,
        id: '2',
      });

      expect(result).toBe(true);
    });

    it('should return false for agentic notebook but paragraph is last', () => {
      const mockNotebookState: MockNotebookState = {
        getContext: () => ({ notebookType: NotebookType.AGENTIC }),
        value: {
          paragraphs: [{ value: { id: '1' } }, { value: { id: '2' } }],
        },
      };

      const result = isAgenticRunBefore({
        notebookState: mockNotebookState as any,
        id: '2',
      });

      expect(result).toBe(false);
    });

    it('should return false for non-agentic notebook', () => {
      const mockNotebookState: MockNotebookState = {
        getContext: () => ({ notebookType: NotebookType.CLASSIC }),
        value: {
          paragraphs: [{ value: { id: '1' } }, { value: { id: '2' } }],
        },
      };

      const result = isAgenticRunBefore({
        notebookState: mockNotebookState as any,
        id: '1',
      });

      expect(result).toBe(false);
    });

    it('should return false if paragraph not found', () => {
      const mockNotebookState: MockNotebookState = {
        getContext: () => ({ notebookType: NotebookType.AGENTIC }),
        value: {
          paragraphs: [{ value: { id: '1' } }, { value: { id: '2' } }],
        },
      };

      const result = isAgenticRunBefore({
        notebookState: mockNotebookState as any,
        id: '999',
      });

      expect(result).toBe(false);
    });
  });
});
