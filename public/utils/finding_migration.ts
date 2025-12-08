/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParagraphBackendType } from '../../common/types/notebooks';

export const migrateFindingParagraphs = (paragraphs: Array<ParagraphBackendType<unknown>>) => {
  const migratedIds: string[] = [];

  const migratedParagraphs = paragraphs.map((paragraph) => {
    if (
      paragraph.aiGenerated === true &&
      paragraph.input.inputType === 'MARKDOWN' &&
      paragraph.output?.[0]?.result
    ) {
      const result = (paragraph.output[0] as any).result;
      const isOldFormat = result.startsWith('Importance:') && result.includes('Description:');

      if (isOldFormat) {
        migratedIds.push(paragraph.id);
        const description = /Description\:\s*(.*)\n/.exec(result)?.[1];
        const evidence = /Evidence\:\s*(.*)/s.exec(result)?.[1];
        const importance = +(/Importance\:\s*(.*)/.exec(result)?.[1] || 0);
        return {
          ...paragraph,
          input: {
            ...paragraph.input,
            inputText: `%md ${evidence}`.trim(),
            parameters: {
              importance: isNaN(importance) ? 0 : importance,
              description: description || '',
            },
          },
        };
      }
    }
    return paragraph;
  });

  return { migratedParagraphs, migratedIds };
};
