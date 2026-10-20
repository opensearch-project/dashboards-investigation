/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextService, ParagraphContext } from './context_service';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

describe('ContextService', () => {
  let contextService: ContextService;

  beforeEach(() => {
    global.indexedDB = indexedDB;
    global.IDBKeyRange = IDBKeyRange;
    contextService = new ContextService();
  });

  afterEach(async () => {
    // Close and delete the database to ensure clean state
    if ((contextService as any).db) {
      (contextService as any).db.close();
    }
    const deleteReq = indexedDB.deleteDatabase('NotebookContextDB');
    await new Promise((resolve) => {
      deleteReq.onsuccess = () => resolve(true);
      deleteReq.onerror = () => resolve(true);
    });
    jest.clearAllMocks();
  });

  describe('setup methods', () => {
    let setup: any;

    beforeEach(async () => {
      setup = await contextService.setup();
    });

    describe('getParagraphContext', () => {
      it('should return null when context not found', async () => {
        const result = await setup.getParagraphContext('notebook1', 'para1');
        expect(result).toBeNull();
      });

      it('should retrieve paragraph context successfully', async () => {
        const mockContext: ParagraphContext = {
          notebookId: 'notebook1',
          paragraphId: 'para1',
          context: { data: 'test' },
        };

        await setup.setParagraphContext(mockContext);
        const result = await setup.getParagraphContext('notebook1', 'para1');
        expect(result).toEqual(mockContext);
      });
    });

    describe('setParagraphContext', () => {
      it('should save paragraph context successfully', async () => {
        const mockContext: ParagraphContext = {
          notebookId: 'notebook1',
          paragraphId: 'para1',
          context: { data: 'test' },
        };

        const result = await setup.setParagraphContext(mockContext);
        expect(result).toBe(true);
      });
    });

    describe('deleteParagraphContext', () => {
      it('should delete paragraph context', async () => {
        const mockContext: ParagraphContext = {
          notebookId: 'notebook1',
          paragraphId: 'para1',
          context: { data: 'test' },
        };

        await setup.setParagraphContext(mockContext);
        await setup.deleteParagraphContext('notebook1', 'para1');
        const result = await setup.getParagraphContext('notebook1', 'para1');
        expect(result).toBeNull();
      });
    });

    describe('getAllParagraphsByNotebook', () => {
      it('should retrieve all paragraphs for a notebook', async () => {
        const mockContexts: ParagraphContext[] = [
          { notebookId: 'notebook1', paragraphId: 'para1', context: { data: 'test1' } },
          { notebookId: 'notebook1', paragraphId: 'para2', context: { data: 'test2' } },
        ];

        await setup.setParagraphContext(mockContexts[0]);
        await setup.setParagraphContext(mockContexts[1]);

        const result = await setup.getAllParagraphsByNotebook('notebook1');
        expect(result).toHaveLength(2);
      });
    });

    describe('deleteAllParagraphsByNotebook', () => {
      it('should delete all paragraphs for a notebook', async () => {
        const mockContexts: ParagraphContext[] = [
          { notebookId: 'notebook1', paragraphId: 'para1', context: { data: 'test1' } },
          { notebookId: 'notebook2', paragraphId: 'para2', context: { data: 'test2' } },
        ];

        await setup.setParagraphContext(mockContexts[0]);
        await setup.setParagraphContext(mockContexts[1]);

        await setup.deleteAllParagraphsByNotebook('notebook1');
        const result = await setup.getAllParagraphsByNotebook('notebook1');
        expect(result).toHaveLength(0);
      });
    });
  });
});
