/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
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

const getTimezoneFullfilledDateString = (time: number): string =>
  moment.utc(time).format('YYYY-MM-DD HH:mm:ss');

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
        ? `**Time Period the issue happens**: From ${getTimezoneFullfilledDateString(
            timeRange.selectionFrom
          )} to ${getTimezoneFullfilledDateString(timeRange.selectionTo)}
        `
        : ''
    }
    ${filters ? `**Applied Filters**: ${JSON.stringify(filters, null, 2)}` : ''}
    ${variables ? `**Variables**: ${JSON.stringify(variables, null, 2)}` : ''}
  `;
};
