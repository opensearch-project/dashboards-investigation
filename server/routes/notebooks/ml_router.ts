/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import { IOpenSearchDashboardsResponse, IRouter } from '../../../../../src/core/server';
import { NOTEBOOKS_API_PREFIX } from '../../../common/constants/notebooks';
import { getOpenSearchClientTransport } from '../utils';

/**
 * Removes specified characters from the beginning of a string.
 * @param str The string to trim
 * @param chars The characters to trim from the beginning (defaults to whitespace)
 * @returns A new string with specified characters removed from the beginning
 */
function trimStart(str: string, chars?: string): string {
  // Handle empty inputs
  if (!str) return str;

  // If no chars provided, use whitespace as default
  if (chars === undefined || chars === '') {
    return str.replace(/^\s+/, '');
  }

  // Escape special regex characters in the chars parameter
  const escapedChars = chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create a regex that matches any of the specified characters at the beginning
  const regex = new RegExp(`^[${escapedChars}]+`);

  // Replace matches with empty string
  return str.replace(regex, '');
}

function toUrlPath(path: string) {
  const FAKE_BASE = 'http://localhost';
  const urlWithFakeBase = new URL(`${FAKE_BASE}/${trimStart(path, '/')}`);
  const urlPath = urlWithFakeBase.href.replace(urlWithFakeBase.origin, '');
  return urlPath;
}

const acceptedHttpVerb = schema.string({
  validate: (method) => {
    return ['GET', 'POST', 'PUT', 'DELETE'].some(
      (verb) => verb.toLowerCase() === method.toLowerCase()
    )
      ? undefined
      : `Method must be one of, case insensitive ['GET', 'POST', 'PUT', 'DELETE']. Received '${method}'.`;
  },
});

export function registerMLConnectorRoute(router: IRouter) {
  router.post(
    {
      path: `${NOTEBOOKS_API_PREFIX}/ml/proxy`,
      validate: {
        body: schema.maybe(schema.any()),
        query: schema.object({
          method: acceptedHttpVerb,
          path: schema.string(),
          dataSourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response): Promise<IOpenSearchDashboardsResponse> => {
      if (!request.query.path.startsWith('/_plugins/_ml')) {
        return response.forbidden({
          body: `Error connecting to '${request.query.path}':\n\nUnable to send requests to that path.`,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }

      try {
        const transport = await getOpenSearchClientTransport({
          context,
          request,
          dataSourceId: request.query.dataSourceId,
        });
        const { method, path } = request.query;
        const result = await transport.request({
          path: toUrlPath(path),
          method,
          body: request.body,
        });
        const contentType = result.headers?.['Content-Type'];

        return response.custom({
          body: result.body,
          statusCode: result.statusCode || 200,
          headers: {
            'Content-Type': contentType,
          },
        });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error,
        });
      }
    }
  );
}
