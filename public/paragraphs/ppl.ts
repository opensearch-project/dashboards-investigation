/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { isEmpty } from 'lodash';
import {
  getQueryOutputData,
  PPLParagraph,
  QueryObject,
} from '../components/notebooks/components/paragraph_components/ppl';
import { ParagraphRegistryItem } from '../services/paragraph_service';
import { callOpenSearchCluster } from '../plugin_helpers/plugin_proxy_call';
import { getClient, getNotifications } from '../services';
import { executePPLQueryWithHeadFilter } from '../../public/utils/query';
import { parsePPLQuery } from '../../common/utils';
import { addTimeRangeFilter } from '../utils/time';

export const PPLParagraphItem: ParagraphRegistryItem<string, unknown, QueryObject> = {
  ParagraphComponent: PPLParagraph,
  getContext: async (paragraph) => {
    const { output, dataSourceMDSId } = paragraph || {};
    if (!output?.[0].result) {
      return '';
    }

    const query = output[0].result;
    const isSqlQuery = paragraph?.input?.inputText.substring(0, 4) === '%sql';
    const queryType = isSqlQuery ? '_sql' : '_ppl';
    const queryTypeName = isSqlQuery ? 'SQL' : 'PPL';

    let queryObject = paragraph?.fullfilledOutput;

    if (!queryObject || queryObject.error) {
      queryObject = await (isSqlQuery
        ? callOpenSearchCluster({
            http: getClient(),
            dataSourceId: dataSourceMDSId,
            request: {
              path: `/_plugins/${queryType}`,
              method: 'POST',
              body: JSON.stringify({
                query,
              }),
            },
          })
        : executePPLQueryWithHeadFilter({
            http: getClient(),
            dataSourceId: dataSourceMDSId,
            query,
          }));

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
          This step executes ${queryTypeName} query and get response data for further research. Analyze these results as part of your investigation and consider how they relate to the overall issue. 
    
          ## Step result:
          User has executed the following ${queryTypeName} query: '${query}' which returned the following results:
          
          \`\`\`json
          ${JSON.stringify(data)}
          \`\`\`
        `;
  },
  runParagraph: async (paragraphState, saveParagraph) => {
    const paragraphValue = paragraphState.getBackendValue();
    const inputText = paragraphValue.input.inputText;
    const queryType = inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';
    const queryParams = paragraphValue.input.parameters as any;
    const inputQuery = queryParams?.query || inputText.substring(5);
    if (isEmpty(inputQuery)) {
      return;
    }

    let currentSearchQuery = inputQuery;
    if (queryType === '_ppl' && inputQuery.trim()) {
      currentSearchQuery = parsePPLQuery(inputQuery).pplWithAbsoluteTime;
      if (currentSearchQuery !== inputQuery) {
        paragraphState.updateInput({
          inputText: `%ppl\n${currentSearchQuery}`,
        });
      }
    }
    paragraphState.updateUIState({
      isRunning: true,
      ppl: { isWaitingForPPLResult: true },
    });

    try {
      await saveParagraph({
        paragraphStateValue: paragraphValue,
      });

      const queryResponse = await (queryType === '_sql'
        ? callOpenSearchCluster({
            http: getClient(),
            dataSourceId: paragraphValue.dataSourceMDSId,
            request: {
              path: '/_plugins/_sql',
              method: 'POST',
              body: JSON.stringify({
                query: currentSearchQuery,
              }),
            },
          })
        : executePPLQueryWithHeadFilter({
            http: getClient(),
            dataSourceId: paragraphValue.dataSourceMDSId,
            query: addTimeRangeFilter(currentSearchQuery, queryParams),
          }));

      paragraphState.updateFullfilledOutput(queryResponse);
      paragraphState.updateUIState({
        isRunning: false,
        ppl: { isWaitingForPPLResult: false },
      });
    } catch (err) {
      paragraphState.resetFullfilledOutput();
      paragraphState.updateUIState({
        isRunning: false,
        ppl: { error: err.message, isWaitingForPPLResult: false },
      });
      getNotifications().toasts.addDanger(`Error executing query: ${err.message}`);
    }
  },
};
