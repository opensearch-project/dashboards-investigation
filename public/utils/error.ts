/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Attempts to parse a JSON string, returns null if parsing fails.
 */
const tryParseJson = (str: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Generic HTTP status messages that should be skipped in favor of fallback.
 */
const GENERIC_HTTP_MESSAGES = ['Bad Request', 'Internal Server Error', 'Not Found', 'Forbidden'];

/**
 * Extracts error details from an OpenSearch error object.
 * Does not extract root-level `message` property - that's handled separately
 * to allow filtering of generic HTTP status messages.
 */
const extractFromOpenSearchError = (obj: Record<string, unknown>): string | null => {
  if (obj.error && typeof obj.error === 'object') {
    const opensearchError = obj.error as Record<string, unknown>;
    // Prefer details over reason as it contains more specific information
    if (opensearchError.details && typeof opensearchError.details === 'string') {
      return opensearchError.details;
    }
    if (opensearchError.reason && typeof opensearchError.reason === 'string') {
      return opensearchError.reason;
    }
  }
  // Only check reason at root level, not message (handled separately with generic check)
  if (obj.reason && typeof obj.reason === 'string') {
    return obj.reason;
  }
  return null;
};

/**
 * Extracts a user-friendly error message from various error formats.
 * Handles OpenSearch PPL/SQL errors, HTTP errors, and generic errors.
 *
 * OpenSearch PPL/SQL error format:
 * {
 *   "error": {
 *     "reason": "Invalid Query",
 *     "details": "[field] is not a valid term...",
 *     "type": "SyntaxCheckException"
 *   },
 *   "status": 400
 * }
 *
 * @param error - The error object from a failed request
 * @param fallbackMessage - Optional fallback message if no meaningful error can be extracted
 * @returns A user-friendly error message string
 */
export const extractErrorMessage = (
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred'
): string => {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === 'string') {
    // Try to parse JSON string
    const parsed = tryParseJson(error);
    if (parsed) {
      const extracted = extractFromOpenSearchError(parsed);
      if (extracted) {
        return extracted;
      }
    }
    return error;
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Handle HTTP client error with body containing OpenSearch error response
    // Structure: { message: "Bad Request", body: { error: { reason, details, type }, status } }
    if (err.body) {
      let body: Record<string, unknown> | null = null;

      if (typeof err.body === 'string') {
        // Body might be a JSON string
        body = tryParseJson(err.body);
      } else if (typeof err.body === 'object') {
        body = err.body as Record<string, unknown>;
      }

      if (body) {
        const extracted = extractFromOpenSearchError(body);
        if (extracted) {
          return extracted;
        }
        // Check for message in body (not filtered for generics as body messages are specific)
        if (body.message && typeof body.message === 'string') {
          return body.message;
        }
      }
    }

    // Handle direct OpenSearch error response (without HTTP wrapper)
    const directExtracted = extractFromOpenSearchError(err);
    if (directExtracted) {
      return directExtracted;
    }

    // Try standard error message (skip generic HTTP status text)
    if (err.message && typeof err.message === 'string') {
      if (!GENERIC_HTTP_MESSAGES.includes(err.message)) {
        return err.message;
      }
    }
  }

  return fallbackMessage;
};
