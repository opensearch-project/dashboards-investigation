/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpStart, SavedObjectsClientContract } from '../../../../src/core/public';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';

/**
 * Get data source by ID
 * @param id - data source ID
 * @param savedObjectsClient - saved objects client
 * @returns data source attributes including title
 */
export async function getDataSourceById(
  id: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  try {
    const response = await savedObjectsClient.get('data-source', id);

    if (!response || response.error) {
      throw new Error(response.error?.message || 'Failed to fetch data source');
    }

    const attributes: any = response?.attributes || {};
    return {
      id: response.id,
      title: attributes.title,
    };
  } catch (error) {
    console.error('Error fetching data source:', error);
    throw error;
  }
}

export async function getDataSourceVersion(
  http: HttpStart,
  dataSourceId?: string
): Promise<string | undefined> {
  try {
    const response: any = await callOpenSearchCluster({
      http,
      dataSourceId,
      request: {
        path: '/',
        method: 'GET',
      },
    });
    return response?.version?.number;
  } catch (error) {
    console.error('Error fetching data source version:', error);
    return undefined;
  }
}

/**
 * Check if a data source type is AnalyticEngine (unsupported for AI features).
 */
export function isAnalyticEngineDataSource(dataSourceType: string | undefined): boolean {
  return dataSourceType === 'AnalyticEngine';
}
