/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { FindingParagraphParameters, ParagraphBackendType } from '../../common/types/notebooks';

export const migrateFindingParagraphs = (paragraphs: Array<ParagraphBackendType<unknown>>) => {
  const migratedIds: string[] = [];

  const migratedParagraphs = paragraphs.map((paragraph) => {
    if (paragraph.input.inputType === 'MARKDOWN') {
      if (paragraph.aiGenerated === true && paragraph.output?.[0]?.result) {
        const result = paragraph.output[0].result as string;
        const isOldFormat = result.startsWith('Importance:') && result.includes('Description:');

        if (isOldFormat) {
          migratedIds.push(paragraph.id);
          const description = /Description\:\s*(.*)\n/.exec(result)?.[1] || '';
          const evidence = /Evidence\:\s*(.*)/s.exec(result)?.[1] || '';
          const importance = +(/Importance\:\s*(.*)/.exec(result)?.[1] || 0);

          const isTopology =
            description.toLowerCase().includes('topology') ||
            evidence.toLowerCase().includes('topology');

          if (isTopology) {
            return {
              ...paragraph,
              input: {
                ...paragraph.input,
                inputType: 'TOPOLOGY',
                inputText: evidence.trim(),
                parameters: {
                  description,
                },
              },
            };
          }

          return {
            ...paragraph,
            input: {
              ...paragraph.input,
              inputText: `%md ${evidence}`.trim(),
              parameters: {
                finding: {
                  importance: isNaN(importance) ? 0 : importance,
                  description,
                },
              },
            },
          };
        }
      } else if (
        paragraph.aiGenerated === false &&
        !(paragraph.input.parameters as FindingParagraphParameters)?.finding
      ) {
        migratedIds.push(paragraph.id);
        return {
          ...paragraph,
          input: {
            ...paragraph.input,
            parameters: {
              finding: {},
            },
          },
        };
      }
    }
    return paragraph;
  });

  return { migratedParagraphs, migratedIds };
};
