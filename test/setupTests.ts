/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { webcrypto } from 'crypto';

require('babel-polyfill');
require('core-js/stable');

// jsdom does not provide the Web Crypto API. uuid v4() relies on
// crypto.getRandomValues(), so polyfill it from Node's webcrypto in tests.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
