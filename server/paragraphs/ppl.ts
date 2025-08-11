/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getQueryService } from '../services/get_set';
import { ParagraphRegistryItem } from '../services/paragraph_service';

export const PPLParagraph: ParagraphRegistryItem = {
  getContext: async ({ paragraph, transport }) => {
    const { output } = paragraph;
    if (!output?.[0].result) {
      return '';
    }

    const query = output[0].result;

    const PPLResult = await getQueryService().describePPLQuery(transport, query);
    if (!PPLResult.data.ok) {
      return '';
    }

    return `
      ## Step description
      This step executes PPL query and get response data for further research. Analyze these results as part of your investigation and consider how they relate to the overall issue. 

      ## Step result:
      User has executed the following PPL query: '${query}' which returned the following results:
      ${JSON.stringify(PPLResult.data.resp)}.
    `;
  },
};
