/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsClientContract } from '../../../../../../src/core/server/types';
import { NOTEBOOK_SAVED_OBJECT } from '../../../../common/types/observability_saved_object_attributes';
import { batchDeleteParagraphs } from '../saved_objects_paragraphs_router';

describe('batchDeleteParagraphs', () => {
  const buildParagraphs = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `paragraph_${i}`, input: {}, output: [] }));

  const createMockClient = (paragraphs: unknown[]) => {
    const attributes = {
      savedNotebook: {
        paragraphs,
        dateModified: '2020-01-01T00:00:00.000Z',
      },
    };
    return {
      get: jest.fn().mockResolvedValue({ attributes, version: 'v1' }),
      create: jest.fn().mockResolvedValue({ id: 'note-1' }),
    } as unknown as SavedObjectsClientContract & {
      get: jest.Mock;
      create: jest.Mock;
    };
  };

  it('excludes only the paragraphs whose ids are supplied', async () => {
    const client = createMockClient(buildParagraphs(5));

    await batchDeleteParagraphs(
      { noteId: 'note-1', paragraphIds: ['paragraph_1', 'paragraph_3'] },
      client
    );

    const persistedParagraphs = client.create.mock.calls[0][1].savedNotebook.paragraphs;
    expect(persistedParagraphs.map((p: { id: string }) => p.id)).toEqual([
      'paragraph_0',
      'paragraph_2',
      'paragraph_4',
    ]);
  });

  it('leaves paragraphs untouched when no ids match', async () => {
    const client = createMockClient(buildParagraphs(3));

    const result = await batchDeleteParagraphs(
      { noteId: 'note-1', paragraphIds: ['does_not_exist'] },
      client
    );

    expect(result).toEqual({ result: { id: 'note-1' } });
    const persistedParagraphs = client.create.mock.calls[0][1].savedNotebook.paragraphs;
    expect(persistedParagraphs).toHaveLength(3);
  });

  it('persists with overwrite and the fetched version', async () => {
    const client = createMockClient(buildParagraphs(2));

    await batchDeleteParagraphs({ noteId: 'note-1', paragraphIds: ['paragraph_0'] }, client);

    expect(client.create).toHaveBeenCalledWith(
      NOTEBOOK_SAVED_OBJECT,
      expect.any(Object),
      expect.objectContaining({ id: 'note-1', overwrite: true, version: 'v1' })
    );
  });

  it('deduplicates repeated ids without extra work (Set-based exclusion)', async () => {
    const client = createMockClient(buildParagraphs(3));

    await batchDeleteParagraphs(
      { noteId: 'note-1', paragraphIds: ['paragraph_1', 'paragraph_1', 'paragraph_1'] },
      client
    );

    const persistedParagraphs = client.create.mock.calls[0][1].savedNotebook.paragraphs;
    expect(persistedParagraphs.map((p: { id: string }) => p.id)).toEqual([
      'paragraph_0',
      'paragraph_2',
    ]);
  });

  it('throws a wrapped error when persistence fails', async () => {
    const client = createMockClient(buildParagraphs(1));
    client.create.mockRejectedValueOnce(new Error('boom'));

    await expect(
      batchDeleteParagraphs({ noteId: 'note-1', paragraphIds: ['paragraph_0'] }, client)
    ).rejects.toThrow('delete Paragraphs Error:');
  });
});
