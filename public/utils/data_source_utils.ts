/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsClientContract } from '../../../../src/core/public';

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
