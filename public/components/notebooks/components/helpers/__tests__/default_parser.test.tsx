/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  sampleNotebook1,
  sampleNotebook2,
  sampleNotebook3,
  sampleNotebook4,
  sampleNotebook5,
  sampleParsedParagraghs1,
  sampleParsedParagraghs2,
} from '../../../../../../test/notebooks_constants';
import { defaultParagraphParser } from '../default_parser';

// Perfect schema
describe('Testing default backend parser function with perfect schema', () => {
  it('defaultParagraphParserTest1', () => {
    const parsedParagraphs1 = defaultParagraphParser(sampleNotebook1.paragraphs);
    const parsedParagraphs2 = defaultParagraphParser(sampleNotebook2.paragraphs);
    const parsedParagraphs3 = defaultParagraphParser([]);
    expect(parsedParagraphs1).toEqual(sampleParsedParagraghs1);
    expect(parsedParagraphs2).toEqual(sampleParsedParagraghs2);
    expect(parsedParagraphs3).toEqual([]);
  });

  it('returns parsed paragraphs', () => {
    const MockVis = sampleNotebook1.paragraphs[2].input.inputText;

    const parsedPara = defaultParagraphParser(
      Array.from({ length: 5 }, (v, k) => {
        const isVisualization = k % 2 === 0;
        return {
          id: `paragraph-${k}`,
          input: {
            inputText: isVisualization ? MockVis : `text-${k}`,
            inputType: isVisualization ? 'VISUALIZATION' : 'MARKDOWN',
          },
          output: [
            {
              result: isVisualization ? '' : `text-${k}`,
              outputType: isVisualization ? 'VISUALIZATION' : 'MARKDOWN',
              execution_time: '0s',
            },
          ],
          uiState: {
            viewMode: 'view_both',
          },
          dateModified: '',
          dateCreated: '',
        };
      })
    );

    const expected = Array.from({ length: 5 }, (v, k) => {
      const isVisualization = k % 2 === 0;
      return {
        uniqueId: `paragraph-${k}`,
        isRunning: false,
        inQueue: false,
        showAddPara: false,
        isVizualisation: isVisualization,
        vizObjectInput: isVisualization ? MockVis : '',
        id: k + 1,
        inp: isVisualization ? MockVis : `text-${k}`,
        lang: isVisualization ? 'text/x-' : 'text/x-md',
        editorLanguage: isVisualization ? '' : 'md',
        typeOut: isVisualization ? ['VISUALIZATION'] : ['MARKDOWN'],
        out: isVisualization ? [''] : [`text-${k}`],
        isOutputStale: false,
        paraDivRef: undefined,
        visStartTime: isVisualization ? '2020-07-21T18:37:44.710Z' : undefined,
        visEndTime: isVisualization ? '2020-08-20T18:37:44.710Z' : undefined,
        visSavedObjId: isVisualization ? '935afa20-e0cd-11e7-9d07-1398ccfcefa3' : undefined,
        dataSourceMDSId: undefined,
        dataSourceMDSLabel: undefined,
        isAnomalyVisualizationAnalysis: false,
        isDeepResearch: false,
        isLogPattern: false,
      };
    });
    expect(parsedPara).toEqual(expected);
  });
});

// Issue in schema
describe('Testing default backend parser function with wrong schema', () => {
  it('defaultParagraphParserTest2', () => {
    expect(() => {
      const _parsedParagraphs1 = defaultParagraphParser(sampleNotebook3.paragraphs);
    }).toThrow(Error);
    expect(() => {
      const _parsedParagraphs2 = defaultParagraphParser(sampleNotebook4.paragraphs);
    }).toThrow(Error);
    expect(() => {
      const _parsedParagraphs3 = defaultParagraphParser(sampleNotebook5.paragraphs);
    }).toThrow(Error);
  });
});

// LogPattern type test
describe('Testing LogPattern type parsing', () => {
  it('correctly identifies LogPattern paragraphs', () => {
    const logPatternParagraph = {
      id: 'log-pattern-1',
      input: {
        inputText: '{"patterns": [{"pattern": "ERROR", "count": 42}]}',
        inputType: 'LOG_PATTERN',
      },
      output: [
        {
          result:
            '{"patterns": [{"pattern": "ERROR", "count": 42}, {"pattern": "WARN", "count": 15}]}',
          outputType: 'LOG_PATTERN',
          execution_time: '0s',
        },
      ],
      dateCreated: '2023-01-01T00:00:00.000Z',
      dateModified: '2023-01-01T00:00:00.000Z',
    };

    const parsed = defaultParagraphParser([logPatternParagraph]);
    expect(parsed[0].isLogPattern).toBe(true);
    expect(parsed[0].typeOut).toEqual(['LOG_PATTERN']);
    expect(parsed[0].out[0]).toContain('ERROR');
  });
});
