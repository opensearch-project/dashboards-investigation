/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpSetup } from '../../../../src/core/public';

const httpClientMockInstance = jest.fn() as any;

httpClientMockInstance.delete = jest.fn(() => ({
  then: jest.fn(() => ({
    catch: jest.fn(),
  })),
}));
httpClientMockInstance.get = jest.fn(() => ({
  then: jest.fn(() => ({
    catch: jest.fn(),
  })),
}));
httpClientMockInstance.head = jest.fn();
httpClientMockInstance.post = jest.fn(() => ({
  then: jest.fn(() => ({
    catch: jest.fn(),
  })),
}));
httpClientMockInstance.put = jest.fn(() => ({
  then: jest.fn(() => ({
    catch: jest.fn(),
  })),
}));

httpClientMockInstance.basePath = {
  prepend: jest.fn((path: string) => path),
  remove: jest.fn((path: string) => path),
  get: jest.fn(() => ''),
  serverBasePath: '',
};

export const httpClientMock = httpClientMockInstance as HttpSetup;
