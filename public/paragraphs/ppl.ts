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
import { executePPLQuery, jsonArrayToTsv } from '../../public/utils/query';
import { parsePPLQuery } from '../../common/utils';
import { addTimeRangeFilter } from '../utils/time';
import { NotebookType } from '../../common/types/notebooks';
import { ParagraphState } from '../../common/state/paragraph_state';

export const PPLParagraphItem: ParagraphRegistryItem<string, unknown, QueryObject> = {
  ParagraphComponent: PPLParagraph,
  getContext: async (paragraph) => {
    const { input } = paragraph || {};
    if (!input?.inputText) {
      return '';
    }

    const query = ParagraphState.getOutput(paragraph)?.result || input.inputText.substring(5);
    const isSqlQuery = input?.inputText.substring(0, 4) === '%sql';
    const queryTypeName = isSqlQuery ? 'SQL' : 'PPL';

    const queryObject = paragraph?.fullfilledOutput;

    if (!queryObject || queryObject.error) {
      return `
## Step description
This step will execute ${queryTypeName} query: '${query}' when run.
      `;
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

**Important**: Due to input context length limits, only 100 records are shown below. If the actual query result contains more than 100 records, a random sampling of 100 records has been applied. The actual result set may be significantly larger than what is displayed here.

\`\`\`tsv
${jsonArrayToTsv(data)}
\`\`\`
        `;
  },
  runParagraph: async ({ paragraphState, notebookStateValue }) => {
    const paragraphValue = paragraphState.getBackendValue();
    const inputText = paragraphValue.input.inputText;
    const queryType = inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';
    const queryParams = paragraphValue.input.parameters as any;
    const inputQuery =
      ParagraphState.getOutput(paragraphValue)?.result ||
      queryParams?.query ||
      inputText.substring(5);
    const { notebookType } = notebookStateValue.context.value;

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
    });

    try {
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
        : executePPLQuery(
            {
              http: getClient(),
              dataSourceId: paragraphValue.dataSourceMDSId,
              query: addTimeRangeFilter(currentSearchQuery, queryParams),
            },
            notebookType === NotebookType.AGENTIC
          ));

      paragraphState.updateFullfilledOutput(queryResponse);
      paragraphState.updateUIState({
        isRunning: false,
      });
    } catch (err) {
      paragraphState.resetFullfilledOutput();
      paragraphState.updateFullfilledOutput({
        error: err.message,
      });
      paragraphState.updateUIState({
        isRunning: false,
      });
      getNotifications().toasts.addDanger(`Error executing query: ${err.message}`);
    }
  },
};
