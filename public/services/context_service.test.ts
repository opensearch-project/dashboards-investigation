/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextService, ParagraphContext } from './context_service';
import { indexedDB } from 'fake-indexeddb';

describe('ContextService', () => {
  let contextService: ContextService;

  beforeEach(() => {
    global.indexedDB = indexedDB;
    contextService = new ContextService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('should initialize IndexedDB successfully', async () => {
      await contextService.init();
      expect((contextService as any).db).toBeDefined();
    });
  });

  describe('setup methods', () => {
    let setup: any;

    beforeEach(async () => {
      await contextService.init();
      setup = contextService.setup();
      const tx = (contextService as any).db.transaction('contexts', 'readwrite');
      const store = tx.objectStore('contexts');
      await new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
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
