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

export const httpClientMock = httpClientMockInstance as HttpSetup;
