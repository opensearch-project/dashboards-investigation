/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base class for errors that are recoverable (can resume polling on page refresh).
 * Extend this class to create specific recoverable error types.
 */
export class RecoverableError extends Error {
  readonly isRecoverable = true;

  constructor(message: string) {
    super(message);
    this.name = 'RecoverableError';
  }
}

/**
 * Patterns that indicate a recoverable error (used for deserialized errors that lost their class type).
 * These patterns match the error messages from PollingTimeoutError and PollingMaxErrorsError.
 */
const RECOVERABLE_ERROR_PATTERNS = [
  /^Investigation polling exceeded \d+ minutes$/,
  /^Polling failed after \d+ errors$/,
];

/** Check if an error is recoverable (can resume polling on page refresh) */
export const isRecoverableError = (error: Error): boolean => {
  // Check by class type or isRecoverable flag
  if (error instanceof RecoverableError || (error as any).isRecoverable === true) {
    return true;
  }

  // Check by error message pattern (for deserialized errors)
  return RECOVERABLE_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
};
