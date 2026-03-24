/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecoverableError } from './recoverable_error';

/** Error thrown when polling fails after maximum consecutive errors */
export class PollingMaxErrorsError extends RecoverableError {
  constructor(errorCount: number) {
    super(`Polling failed after ${errorCount} errors`);
    this.name = 'PollingMaxErrorsError';
  }
}
