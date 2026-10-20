/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NoteBookServices } from 'public/types';

export const getPromptModeIsAvailable = async (
  { http, uiSettings }: NoteBookServices,
  dataSourceId: string | undefined
): Promise<boolean> => {
  try {
    if (!Boolean(uiSettings.get('enableAIFeatures'))) {
      return false;
    }

    const res = await http.post('/api/console/proxy', {
      query: {
        path: '/_plugins/_ml/config/os_query_assist_ppl',
        method: 'GET',
        dataSourceId,
      },
    });
    return Boolean(res?.configuration?.agent_id);
  } catch (error) {
    return false;
  }
};
