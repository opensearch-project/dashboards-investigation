/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getQueryOutputData,
  PPLParagraph,
  QueryObject,
} from '../components/notebooks/components/paragraph_components/ppl';
import { ParagraphRegistryItem } from '../services/paragraph_service';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';
import { getClient } from '../services';

export const PPLParagraphItem: ParagraphRegistryItem<string, unknown, QueryObject> = {
  ParagraphComponent: PPLParagraph,
  getContext: async (paragraph) => {
    const { output, dataSourceMDSId } = paragraph || {};
    if (!output?.[0].result) {
      return '';
    }

    const query = output[0].result;
    const queryType = paragraph?.input.inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';

    let queryObject = paragraph?.fullfilledOutput;

    if (!queryObject || queryObject.error) {
      queryObject = await callOpenSearchCluster({
        http: getClient(),
        dataSourceId: dataSourceMDSId,
        request: {
          path: `/_plugins/${queryType}`,
          method: 'POST',
          body: JSON.stringify({
            query,
          }),
        },
      });

      if (!queryObject || queryObject.error) {
        return '';
      }
    }

    const data = getQueryOutputData(queryObject);

    if (data.length === 0) {
      return '';
    }

    return `
          ## Step description
          This step executes PPL query and get response data for further research. Analyze these results as part of your investigation and consider how they relate to the overall issue. 
    
          ## Step result:
          User has executed the following PPL query: '${query}' which returned the following results:
          
          \`\`\`json
          ${JSON.stringify(data)}
          \`\`\`
        `;
  },
};
