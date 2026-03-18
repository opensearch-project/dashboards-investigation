/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpStart } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';

export interface QueryValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a PPL (Piped Processing Language) query by executing it with a limit of 0
 * to check syntax without fetching data
 */
export const validatePPLQuery = async (
  http: HttpStart,
  query: string,
  dataSourceId?: string
): Promise<QueryValidationResult> => {
  try {
    // Trim whitespace
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        isValid: false,
        error: 'PPL query cannot be empty',
      };
    }

    // Execute dry-run with LIMIT 0 to validate syntax without fetching data
    const dryRunQuery = `${trimmedQuery} | head 0`;

    await callOpenSearchCluster({
      http,
      dataSourceId,
      request: {
        path: '/_plugins/_ppl',
        method: 'POST',
        body: JSON.stringify({ query: dryRunQuery }),
      },
    });

    return { isValid: true };
  } catch (error: any) {
    const errorMessage =
      error?.body?.error?.reason ||
      error?.body?.message ||
      error?.message ||
      'Unknown PPL validation error';

    return {
      isValid: false,
      error: `PPL query validation failed: ${errorMessage}`,
    };
  }
};

/**
 * Validates a DSL (Domain Specific Language) query by using OpenSearch's validate API
 */
export const validateDSLQuery = async (
  http: HttpStart,
  query: string,
  index: string,
  dataSourceId?: string
): Promise<QueryValidationResult> => {
  try {
    // Trim whitespace
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        isValid: false,
        error: 'DSL query cannot be empty',
      };
    }

    // Parse JSON to ensure it's valid
    let queryObject: unknown;
    try {
      queryObject = JSON.parse(trimmedQuery);
    } catch (parseError) {
      return {
        isValid: false,
        error: `Invalid JSON format: ${
          parseError instanceof Error ? parseError.message : 'Parse error'
        }`,
      };
    }

    // Ensure it's an object
    if (typeof queryObject !== 'object' || queryObject === null) {
      return {
        isValid: false,
        error: 'DSL query must be a valid JSON object',
      };
    }

    // Use OpenSearch validate query API
    const response = await callOpenSearchCluster({
      http,
      dataSourceId,
      request: {
        path: `/${index}/_validate/query?explain=true`,
        method: 'POST',
        body: JSON.stringify({ query: queryObject }),
      },
    });

    if (response?.valid === false) {
      const explanation = response?.explanations?.[0]?.error || 'Query validation returned invalid';
      return {
        isValid: false,
        error: `DSL query validation failed: ${explanation}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `DSL query validation failed`,
    };
  }
};
