/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { extractErrorMessage } from '../error';

describe('extractErrorMessage', () => {
  describe('null/undefined handling', () => {
    it('should return fallback message for null error', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
    });

    it('should return fallback message for undefined error', () => {
      expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred');
    });

    it('should return custom fallback message when provided', () => {
      expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('string error handling', () => {
    it('should return string error as-is', () => {
      expect(extractErrorMessage('Simple error message')).toBe('Simple error message');
    });

    it('should parse JSON string and extract error details', () => {
      const jsonError = JSON.stringify({
        error: {
          reason: 'Invalid Query',
          details: '[field] is not a valid term',
        },
      });
      expect(extractErrorMessage(jsonError)).toBe('[field] is not a valid term');
    });

    it('should return original string if JSON parsing fails', () => {
      expect(extractErrorMessage('not valid json')).toBe('not valid json');
    });
  });

  describe('OpenSearch error format (HTTP client wrapper)', () => {
    it('should extract details from body.error.details', () => {
      const error = {
        message: 'Bad Request',
        body: {
          error: {
            reason: 'Invalid Query',
            details: '[field] is not a valid term at position 42',
            type: 'SyntaxCheckException',
          },
          status: 400,
        },
      };
      expect(extractErrorMessage(error)).toBe('[field] is not a valid term at position 42');
    });

    it('should extract reason from body.error.reason when details not available', () => {
      const error = {
        message: 'Bad Request',
        body: {
          error: {
            reason: 'Syntax error in query',
            type: 'SyntaxCheckException',
          },
          status: 400,
        },
      };
      expect(extractErrorMessage(error)).toBe('Syntax error in query');
    });

    it('should extract message from body.message', () => {
      const error = {
        message: 'Bad Request',
        body: {
          message: 'Index not found',
        },
      };
      expect(extractErrorMessage(error)).toBe('Index not found');
    });

    it('should parse JSON string body', () => {
      const error = {
        message: 'Bad Request',
        body: JSON.stringify({
          error: {
            reason: 'Invalid Query',
            details: 'Parsed from JSON string',
          },
        }),
      };
      expect(extractErrorMessage(error)).toBe('Parsed from JSON string');
    });
  });

  describe('direct OpenSearch error format', () => {
    it('should extract details from error.details', () => {
      const error = {
        error: {
          reason: 'Invalid Query',
          details: 'Direct error details',
          type: 'SyntaxCheckException',
        },
        status: 400,
      };
      expect(extractErrorMessage(error)).toBe('Direct error details');
    });

    it('should extract reason from error.reason when details not available', () => {
      const error = {
        error: {
          reason: 'Direct error reason',
          type: 'SyntaxCheckException',
        },
        status: 400,
      };
      expect(extractErrorMessage(error)).toBe('Direct error reason');
    });
  });

  describe('standard Error object', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Standard error message');
      expect(extractErrorMessage(error)).toBe('Standard error message');
    });

    it('should skip generic HTTP status messages', () => {
      const error = { message: 'Bad Request' };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should skip Internal Server Error message', () => {
      const error = { message: 'Internal Server Error' };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should skip Not Found message', () => {
      const error = { message: 'Not Found' };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should skip Forbidden message', () => {
      const error = { message: 'Forbidden' };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should use non-generic message', () => {
      const error = { message: 'Connection timeout occurred' };
      expect(extractErrorMessage(error)).toBe('Connection timeout occurred');
    });
  });

  describe('message and reason at root level', () => {
    it('should extract message from root level', () => {
      const error = { message: 'Root level message' };
      expect(extractErrorMessage(error)).toBe('Root level message');
    });

    it('should extract reason from root level', () => {
      const error = { reason: 'Root level reason' };
      expect(extractErrorMessage(error)).toBe('Root level reason');
    });
  });

  describe('priority order', () => {
    it('should prefer body.error.details over body.error.reason', () => {
      const error = {
        body: {
          error: {
            reason: 'General reason',
            details: 'Specific details',
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Specific details');
    });

    it('should prefer body error over direct error', () => {
      const error = {
        body: {
          error: {
            details: 'Body error details',
          },
        },
        error: {
          details: 'Direct error details',
        },
      };
      expect(extractErrorMessage(error)).toBe('Body error details');
    });
  });

  describe('edge cases', () => {
    it('should handle empty object', () => {
      expect(extractErrorMessage({})).toBe('An unexpected error occurred');
    });

    it('should handle object with only statusCode', () => {
      const error = { statusCode: 500 };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });

    it('should handle nested null values gracefully', () => {
      const error = {
        body: {
          error: null,
        },
      };
      expect(extractErrorMessage(error, 'Fallback')).toBe('Fallback');
    });
  });
});
