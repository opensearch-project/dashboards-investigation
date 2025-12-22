/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { migrateFindingParagraphs } from './finding_migration';
import { FindingParagraphParameters, ParagraphBackendType } from '../../common/types/notebooks';

describe('migrateFindingParagraphs', () => {
  it('should migrate old format finding paragraphs', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old text',
        },
        output: [
          {
            result: 'Importance: 5\nDescription: Test finding\nEvidence: Some evidence text',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.inputText).toBe('%md Some evidence text');
    expect(migratedParagraphs[0].input.parameters).toEqual({
      finding: {
        importance: 5,
        description: 'Test finding',
      },
    });
  });

  it('should not migrate paragraphs without aiGenerated flag', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: false,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md text',
        },
        output: [
          {
            result: 'Importance: 5\nDescription: Test\nEvidence: Evidence',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual([]);
    expect(migratedParagraphs[0]).toEqual(paragraphs[0]);
  });

  it('should not migrate non-MARKDOWN paragraphs', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'VISUALIZATION',
          inputText: 'viz',
        },
        output: [
          {
            result: 'Importance: 5\nDescription: Test\nEvidence: Evidence',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual([]);
    expect(migratedParagraphs[0]).toEqual(paragraphs[0]);
  });

  it('should not migrate new format paragraphs', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md new format',
        },
        output: [
          {
            result: 'Some result without old format',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual([]);
    expect(migratedParagraphs[0]).toEqual(paragraphs[0]);
  });

  it('should handle missing description and default importance to 0', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old',
        },
        output: [
          {
            result: 'Importance: invalid\nDescription:\nEvidence: Evidence text',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.parameters).toEqual({
      finding: {
        importance: 0,
        description: '',
      },
    });
  });

  it('should handle multiple paragraphs with mixed formats', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old',
        },
        output: [
          {
            result: 'Importance: 3\nDescription: Finding 1\nEvidence: Evidence 1',
          },
        ],
      } as ParagraphBackendType<unknown>,
      {
        id: 'para-2',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md new',
        },
        output: [
          {
            result: 'New format result',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.inputText).toBe('%md Evidence 1');
    expect(migratedParagraphs[1]).toEqual(paragraphs[1]);
  });

  it('should add type TOPOLOGY when description contains topology', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old',
        },
        output: [
          {
            result:
              'Importance: 8\nDescription: Request Flow Topology\nEvidence: Service call hierarchy',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.parameters).toEqual({
      finding: {
        importance: 8,
        description: 'Request Flow Topology',
        type: 'TOPOLOGY',
      },
    });
  });

  it('should add type TOPOLOGY when evidence contains topology', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old',
        },
        output: [
          {
            result:
              'Importance: 7\nDescription: Service flow\nEvidence: Topology graph shows service dependencies',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.parameters).toEqual({
      finding: {
        importance: 7,
        description: 'Service flow',
        type: 'TOPOLOGY',
      },
    });
  });

  it('should not add type TOPOLOGY for non-topology findings', () => {
    const paragraphs: Array<ParagraphBackendType<unknown>> = [
      {
        id: 'para-1',
        aiGenerated: true,
        input: {
          inputType: 'MARKDOWN',
          inputText: '%md old',
        },
        output: [
          {
            result: 'Importance: 6\nDescription: Regular finding\nEvidence: Normal evidence',
          },
        ],
      } as ParagraphBackendType<unknown>,
    ];

    const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(paragraphs);

    expect(migratedIds).toEqual(['para-1']);
    expect(migratedParagraphs[0].input.parameters).toEqual({
      finding: {
        importance: 6,
        description: 'Regular finding',
      },
    });
    expect(
      (migratedParagraphs[0].input.parameters as FindingParagraphParameters).finding
    ).not.toHaveProperty('type');
  });
});
