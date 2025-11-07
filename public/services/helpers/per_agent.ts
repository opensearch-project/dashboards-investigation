/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';
import { NotebookContext } from '../../../common/types/notebooks';
import { ParagraphStateValue } from '../../../common/state/paragraph_state';
import { ParagraphServiceSetup } from '../paragraph_service';
import { getInputType } from '../../../common/utils/paragraph';

interface ParagraphPromptInput {
  paragraphService: ParagraphServiceSetup;
  paragraphs: Array<ParagraphStateValue<unknown, unknown, {}>>;
  ignoreInputTypes?: string[];
}

export const generateParagraphPrompt = async ({
  paragraphService,
  paragraphs,
  ignoreInputTypes = [],
}: ParagraphPromptInput) => {
  return await Promise.all(
    paragraphs
      .filter((paragraph) => !ignoreInputTypes.includes(paragraph.input.inputType))
      .map(async (paragraph) => {
        if (!paragraph) {
          return '';
        }

        const paragraphRegistry = paragraphService.getParagraphRegistry(getInputType(paragraph));
        if (!paragraphRegistry || !paragraphRegistry.getContext) {
          return '';
        }

        return await paragraphRegistry.getContext(paragraph);
      })
  );
};

export const generateContextPromptFromParagraphs = async ({
  paragraphService,
  paragraphs,
  notebookInfo,
  ignoreInputTypes = [],
}: {
  paragraphService: ParagraphServiceSetup;
  paragraphs: Array<ParagraphStateValue<unknown, unknown, {}>>;
  notebookInfo: NotebookContext;
  ignoreInputTypes?: string[];
}) => {
  const allContext = await generateParagraphPrompt({
    paragraphService,
    paragraphs,
    ignoreInputTypes,
  });

  return [getNotebookTopLevelContextPrompt(notebookInfo), ...allContext]
    .filter((item) => item)
    .map((item) => item)
    .join('\n');
};

const getTimezoneFullfilledDateString = (time: number): string =>
  moment.utc(time).format('YYYY-MM-DD HH:mm:ss');

export const getNotebookTopLevelContextPrompt = (notebookInfo: NotebookContext) => {
  const { index, timeField, timeRange, filters, variables, summary } = notebookInfo || {};
  if (!index && !timeField && !timeRange && !filters && !variables && !summary) {
    return '';
  }

  return `
# Investigation Context

You are an AI assistant helping with root cause analysis based on log data. I'm investigating an issue in a system and need your analytical expertise.

## Context Information
${
  summary
    ? `**Investigation Summary**: ${summary}
`
    : ''
}
${
  index
    ? `**Relevant Index name**: ${index}
`
    : ''
}
${
  timeField
    ? `**Time Field**: ${timeField}
`
    : ''
}
${
  timeRange?.selectionFrom && timeRange.selectionTo
    ? `**Time Period the issue happens**: From ${getTimezoneFullfilledDateString(
        timeRange.selectionFrom
      )} to ${getTimezoneFullfilledDateString(timeRange.selectionTo)}
    `
    : ''
}
${
  timeRange?.baselineFrom && timeRange.baselineTo
    ? `**Time Period as baseline**: From ${getTimezoneFullfilledDateString(
        timeRange.baselineFrom
      )} to ${getTimezoneFullfilledDateString(timeRange.baselineTo)}
    `
    : ''
}
${
  filters
    ? `**Applied Filters**: ${JSON.stringify(filters, null, 2)}
`
    : ''
}
${
  variables
    ? `**Variables**: ${JSON.stringify(variables, null, 2)}
`
    : ''
}
${variables?.pplQuery ? `**PPL Query user executed**: ${variables.pplQuery}` : ''}
  `;
};
