/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { httpServiceMock } from '../../../../../../src/core/server/mocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { registerParaRoute } from '../paragraph_router';

describe('Paragraph Router - bulk delete validation', () => {
  const getDeleteBodySchema = () => {
    const mockRouter = httpServiceMock.createSetupContract().createRouter();
    registerParaRoute(mockRouter);

    const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
      ([config]) => config.path === `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraphs`
    );
    expect(deleteCall).toBeDefined();
    return deleteCall[0].validate.body;
  };

  it('accepts a paragraphIds array at the cap', () => {
    const bodySchema = getDeleteBodySchema();
    const paragraphIds = Array.from({ length: 1000 }, (_, i) => `paragraph_${i}`);

    expect(() => bodySchema.validate({ noteId: 'note-1', paragraphIds })).not.toThrow();
  });

  it('rejects a paragraphIds array over the cap', () => {
    const bodySchema = getDeleteBodySchema();
    const paragraphIds = Array.from({ length: 1001 }, (_, i) => `paragraph_${i}`);

    expect(() => bodySchema.validate({ noteId: 'note-1', paragraphIds })).toThrow(
      /array size is \[1001\], but cannot be greater than \[1000\]/
    );
  });
});
