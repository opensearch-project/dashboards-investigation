/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotebookContext } from 'common/types/notebooks';
import { OpenSearchClient, RequestHandlerContext, SavedObject } from '../../../../src/core/server';

export const getOpenSearchClientTransport = async ({
  context,
  dataSourceId,
}: {
  context: RequestHandlerContext & {
    dataSource?: {
      opensearch: {
        getClient: (dataSourceId: string) => Promise<OpenSearchClient>;
      };
    };
  };
  dataSourceId?: string;
}): Promise<OpenSearchClient['transport']> => {
  if (dataSourceId && context.dataSource) {
    return (await context.dataSource.opensearch.getClient(dataSourceId)).transport;
  }
  return context.core.opensearch.client.asCurrentUser.transport;
};

export const getNotebookTopLevelContextPrompt = (
  notebookInfo: SavedObject<{ savedNotebook: { context?: NotebookContext } }>
) => {
  const { index, timeField, timeRange, filters, variables, summary } =
    notebookInfo.attributes.savedNotebook.context! || {};
  if (!index && !timeField && !timeRange && !filters && !variables && !summary) {
    return '';
  }

  return `
    Step: Top level context for investigation.
    Step Result: 
    You are an AI assistant helping with root cause analysis based on log data. I'm investigating an issue in a system and need your analytical expertise.

    ## Context Information
    ${summary ? `**Investigation Summary**: ${summary}` : ''}
    ${index ? `**Relevant Index name**: ${index}` : ''}
    ${timeField ? `**Time Field**: ${timeField}` : ''}
    ${
      timeRange
        ? `**Time Period**: From ${timeRange?.selectionFrom} to ${timeRange.selectionTo}`
        : ''
    }
    ${filters ? `**Applied Filters**: ${JSON.stringify(filters, null, 2)}` : ''}
    ${variables ? `**Variables**: ${JSON.stringify(variables, null, 2)}` : ''}

    ## Request
    Based on the information above, please help me analyze the following:
    1. What potential root causes could explain the observed behavior?
    2. What patterns or anomalies should I look for in the data?
    3. What additional data or metrics might be useful to collect?
    4. What are the next steps you recommend for this investigation?

    Please provide your analysis, focusing on technical insights that could help resolve this issue.
  `;
};
