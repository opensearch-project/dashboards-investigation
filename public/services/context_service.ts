/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ParagraphContext {
  notebookId: string;
  paragraphId: string;
  // different paragraphs can have different context types, so temporarily use any here
  context: any;
}

export interface ContextServiceSetup {
  getParagraphContext: (
    notebookId: string,
    paragraphId: string
  ) => Promise<ParagraphContext | null>;
  setParagraphContext: (paragraphContext: ParagraphContext) => Promise<boolean>;
  deleteParagraphContext: (notebookId: string, paragraphId: string) => Promise<boolean>;
  getAllParagraphsByNotebook: (notebookId: string) => Promise<ParagraphContext[] | []>;
  deleteAllParagraphsByNotebook: (notebookId: string) => Promise<boolean>;
  getParagraphContextByParagraphId: (paragraphId: string) => Promise<ParagraphContext | null>;
}

export class ContextService {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('NotebookContextDB');

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('contexts')) {
          const store = db.createObjectStore('contexts', {
            keyPath: ['notebookId', 'paragraphId'],
          });
          // create index for notebookId and paragraphId to allow querying by notebook
          store.createIndex('notebookId', 'notebookId', { unique: false });
          store.createIndex('paragraphId', 'paragraphId', { unique: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private handleRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  setup = (): ContextServiceSetup => {
    const getParagraphContext = async (
      notebookId: string,
      paragraphId: string
    ): Promise<ParagraphContext | null> => {
      const transaction = this.db!.transaction('contexts', 'readonly');
      const store = transaction.objectStore('contexts');
      const req = store.get([notebookId, paragraphId]);

      const result = await this.handleRequest(req);
      return (result as ParagraphContext) ?? null;
    };

    const getParagraphContextByParagraphId = async (paragraphId: string) => {
      const transaction = this.db!.transaction('contexts', 'readonly');
      const store = transaction.objectStore('contexts');
      const index = store.index('paragraphId');
      const req = index.get(paragraphId);
      const result = await this.handleRequest(req);
      return (result as ParagraphContext) ?? null;
    };

    const setParagraphContext = async (context: ParagraphContext) => {
      const transaction = this.db!.transaction('contexts', 'readwrite');
      const store = transaction.objectStore('contexts');
      // add a new one or update the existing one
      const req = store.put({
        notebookId: context.notebookId,
        paragraphId: context.paragraphId,
        context: context.context,
      });
      const result = await this.handleRequest(req);
      return !!result;
    };

    const deleteParagraphContext = async (notebookId: string, paragraphId: string) => {
      const transaction = this.db!.transaction('contexts', 'readwrite');
      const store = transaction.objectStore('contexts');
      const req = store.delete([notebookId, paragraphId]);
      const result = await this.handleRequest(req);
      return !!result;
    };

    const getAllParagraphsByNotebook = async (notebookId: string) => {
      const transaction = this.db!.transaction('contexts', 'readonly');
      const store = transaction.objectStore('contexts');
      const index = store.index('notebookId');
      const req = index.getAll(notebookId);
      const result = await this.handleRequest(req);
      return (result as ParagraphContext[]) || [];
    };

    const deleteAllParagraphsByNotebook = (notebookId: string) => {
      return new Promise<boolean>((resolve, reject) => {
        const transaction = this.db!.transaction('contexts', 'readwrite');
        const store = transaction.objectStore('contexts');
        const index = store.index('notebookId');

        const getAllKeysReq = index.getAllKeys(notebookId);
        getAllKeysReq.onsuccess = () => {
          const keys = getAllKeysReq.result;
          let deletedCount = 0;

          if (keys.length === 0) {
            resolve(true);
            return;
          }

          keys.forEach((key) => {
            const deleteReq = store.delete(key);
            deleteReq.onsuccess = () => {
              deletedCount++;
              if (deletedCount === keys.length) {
                resolve(true);
              }
            };
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        };
        getAllKeysReq.onerror = () => reject(getAllKeysReq.error);
      });
    };

    return {
      getParagraphContext,
      setParagraphContext,
      deleteParagraphContext,
      getAllParagraphsByNotebook,
      deleteAllParagraphsByNotebook,
      getParagraphContextByParagraphId,
    };
  };
}
