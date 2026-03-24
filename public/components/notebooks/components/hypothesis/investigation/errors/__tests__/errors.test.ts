/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RecoverableError,
  isRecoverableError,
  PollingTimeoutError,
  PollingMaxErrorsError,
} from '../index';

describe('RecoverableError', () => {
  it('should have correct name and isRecoverable flag', () => {
    const error = new RecoverableError('Test recoverable error');
    expect(error.name).toBe('RecoverableError');
    expect(error.message).toBe('Test recoverable error');
    expect(error.isRecoverable).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('PollingTimeoutError', () => {
  it('should extend RecoverableError with correct name and message', () => {
    const error = new PollingTimeoutError();
    expect(error.name).toBe('PollingTimeoutError');
    expect(error.message).toBe('Investigation polling exceeded 20 minutes');
    expect(error.isRecoverable).toBe(true);
    expect(error).toBeInstanceOf(RecoverableError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('PollingMaxErrorsError', () => {
  it('should extend RecoverableError with correct name and message including error count', () => {
    const error = new PollingMaxErrorsError(5);
    expect(error.name).toBe('PollingMaxErrorsError');
    expect(error.message).toBe('Polling failed after 5 errors');
    expect(error.isRecoverable).toBe(true);
    expect(error).toBeInstanceOf(RecoverableError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should include different error counts in message', () => {
    const error3 = new PollingMaxErrorsError(3);
    expect(error3.message).toBe('Polling failed after 3 errors');

    const error10 = new PollingMaxErrorsError(10);
    expect(error10.message).toBe('Polling failed after 10 errors');
  });
});

describe('isRecoverableError', () => {
  it('should return true for RecoverableError', () => {
    const error = new RecoverableError('Test');
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return true for PollingTimeoutError', () => {
    const error = new PollingTimeoutError();
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return true for PollingMaxErrorsError', () => {
    const error = new PollingMaxErrorsError(5);
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return true for errors with isRecoverable flag set to true', () => {
    const error = new Error('Custom error');
    (error as any).isRecoverable = true;
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Some other error');
    expect(isRecoverableError(error)).toBe(false);
  });

  it('should return false for TypeError', () => {
    const error = new TypeError('Type error');
    expect(isRecoverableError(error)).toBe(false);
  });

  it('should return false for errors with isRecoverable set to false', () => {
    const error = new Error('Non-recoverable');
    (error as any).isRecoverable = false;
    expect(isRecoverableError(error)).toBe(false);
  });

  describe('message pattern matching (for deserialized errors)', () => {
    it('should return true for error with PollingTimeoutError message pattern', () => {
      // Simulate a deserialized error that lost its class type
      const error = new Error('Investigation polling exceeded 20 minutes');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for error with PollingMaxErrorsError message pattern', () => {
      // Simulate a deserialized error that lost its class type
      const error = new Error('Polling failed after 5 errors');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for PollingMaxErrorsError message with different error counts', () => {
      expect(isRecoverableError(new Error('Polling failed after 3 errors'))).toBe(true);
      expect(isRecoverableError(new Error('Polling failed after 10 errors'))).toBe(true);
      expect(isRecoverableError(new Error('Polling failed after 100 errors'))).toBe(true);
    });

    it('should return true for PollingTimeoutError message with different minute values', () => {
      expect(isRecoverableError(new Error('Investigation polling exceeded 15 minutes'))).toBe(true);
      expect(isRecoverableError(new Error('Investigation polling exceeded 30 minutes'))).toBe(true);
    });

    it('should return false for similar but non-matching messages', () => {
      expect(isRecoverableError(new Error('Investigation polling exceeded'))).toBe(false);
      expect(isRecoverableError(new Error('Polling failed after errors'))).toBe(false);
      expect(isRecoverableError(new Error('Investigation polling exceeded 20 minutes extra'))).toBe(
        false
      );
      expect(
        isRecoverableError(new Error('Prefix Investigation polling exceeded 20 minutes'))
      ).toBe(false);
    });
  });
});
