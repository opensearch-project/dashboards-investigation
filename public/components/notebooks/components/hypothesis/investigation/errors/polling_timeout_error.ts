/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecoverableError } from './recoverable_error';

/** Error thrown when polling exceeds the maximum duration (20 minutes) */
export class PollingTimeoutError extends RecoverableError {
  constructor() {
    super('Investigation polling exceeded 20 minutes');
    this.name = 'PollingTimeoutError';
  }
}
