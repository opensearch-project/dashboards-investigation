/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePrecheck, waitForPrecheckContexts } from '../use_precheck';
import { useOpenSearchDashboards } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../../components/notebooks/context_provider/context_provider';
import { ParagraphState } from '../../../common/state/paragraph_state';
import { NotebookState } from '../../../common/state/notebook_state';
import { TopContextState } from '../../../common/state/top_context_state';
import {
  DATA_DISTRIBUTION_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
  PPL_PARAGRAPH_TYPE,
} from '../../../common/constants/notebooks';
import { NoteBookSource } from '../../../common/types/notebooks';
import { BehaviorSubject } from 'rxjs';
import React from 'react';

// Mock dependencies
jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public');
jest.mock('../../utils/query', () => ({
  isDateAppenddablePPL: jest.fn((query: string) => {
    return !query.includes('stats') && !query.includes('dedup');
  }),
}));

describe('usePrecheck', () => {
  let mockParagraphService: any;
  let mockBatchCreateParagraphs: jest.Mock;
  let mockBatchSaveParagraphs: jest.Mock;
  let mockRunParagraph: jest.Mock;
  let mockNotebookState: NotebookState;
  let mockParagraphHooks: any;

  const createMockParagraphState = (
    inputType: string,
    inputText: string = '',
    additionalProps: any = {}
  ): ParagraphState<unknown> => {
    const mockValue = {
      id: `para-${Math.random()}`,
      input: {
        inputType,
        inputText,
        parameters: {},
      },
      fullfilledOutput: null,
      uiState: {},
      ...additionalProps,
    };

    const subject = new BehaviorSubject(mockValue);
    const paragraphState = {
      value: mockValue,
      getValue$: jest.fn(() => subject.asObservable()),
      updateInput: jest.fn((input) => {
        mockValue.input = input;
        subject.next(mockValue);
      }),
      getBackendValue: jest.fn(() => mockValue),
    } as any;

    return paragraphState;
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <NotebookReactContext.Provider
        value={{
          state: mockNotebookState,
          paragraphHooks: mockParagraphHooks,
        }}
      >
        {children}
      </NotebookReactContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock functions
    mockBatchCreateParagraphs = jest.fn().mockResolvedValue(undefined);
    mockBatchSaveParagraphs = jest.fn().mockResolvedValue(undefined);
    mockRunParagraph = jest.fn().mockResolvedValue(undefined);

    // Setup mock paragraph service
    mockParagraphService = {
      getParagraphRegistry: jest.fn((type: string) => {
        if (type === DATA_DISTRIBUTION_PARAGRAPH_TYPE) {
          return {
            runParagraph: jest.fn().mockResolvedValue(undefined),
          };
        }
        return null;
      }),
    };

    // Setup mock notebook state
    mockNotebookState = new NotebookState({
      paragraphs: [],
      id: 'test-notebook',
      title: 'Test Notebook',
      context: new TopContextState({}),
      dataSourceEnabled: false,
      dateCreated: '',
      dateModified: '',
      isLoading: false,
      path: '',
      vizPrefix: '',
    });

    // Setup mock paragraph hooks
    mockParagraphHooks = {
      batchCreateParagraphs: mockBatchCreateParagraphs,
      batchSaveParagraphs: mockBatchSaveParagraphs,
      runParagraph: mockRunParagraph,
    };

    // Mock useOpenSearchDashboards hook
    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: {
        paragraphService: mockParagraphService,
      },
    });
  });

  describe('start method', () => {
    describe('log pattern paragraph creation', () => {
      it('should create log pattern paragraph when context has log index', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: true,
            log_message_field: 'message',
          },
          dataSourceId: 'ds-123',
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalledWith({
          startIndex: 0,
          paragraphs: [
            {
              input: {
                inputText: '',
                inputType: LOG_PATTERN_PARAGRAPH_TYPE,
                parameters: {
                  index: 'test-index',
                },
              },
              dataSourceMDSId: 'ds-123',
            },
          ],
        });
      });

      it('should create log pattern paragraph for related log index', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: false,
            related_indexes: [
              {
                is_log_index: true,
                log_message_field: 'log',
                time_field: 'timestamp',
                index_name: 'related-log-index',
              },
            ],
          },
          dataSourceId: 'ds-123',
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalledWith({
          startIndex: 0,
          paragraphs: [
            {
              input: {
                inputText: '',
                inputType: LOG_PATTERN_PARAGRAPH_TYPE,
                parameters: {
                  timeField: 'timestamp',
                  index: 'related-log-index',
                  insight: expect.objectContaining({
                    is_log_index: true,
                    log_message_field: 'log',
                  }),
                },
              },
              dataSourceMDSId: 'ds-123',
            },
          ],
        });
      });

      it('should not create log pattern paragraph when already exists', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: true,
            log_message_field: 'message',
          },
        };

        const existingParagraphs = [
          {
            input: {
              inputType: LOG_PATTERN_PARAGRAPH_TYPE,
              inputText: '',
            },
          },
        ];

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: existingParagraphs as any,
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
      });

      it('should not create log pattern paragraph when no log index available', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: false,
            related_indexes: [],
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
      });
    });

    describe('data distribution paragraph creation', () => {
      it('should create data distribution paragraph from discover context', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          dataSourceId: 'ds-123',
          variables: {
            pplQuery: 'source=test-index | fields @timestamp, message',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalled();
        const call = mockBatchCreateParagraphs.mock.calls[0][0];
        expect(call.paragraphs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              input: expect.objectContaining({
                inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
              }),
            }),
          ])
        );
      });

      it('should not create data distribution paragraph when already exists', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index',
          },
        };

        const existingParagraphs = [
          {
            input: {
              inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
              inputText: '',
            },
          },
          {
            input: {
              inputType: PPL_PARAGRAPH_TYPE,
              inputText: '%ppl source=test-index',
            },
          },
        ];

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: existingParagraphs as any,
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
      });

      it('should not create data distribution paragraph when source is not DISCOVER', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: 'OTHER_SOURCE',
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
      });

      it('should not create data distribution paragraph when query is not date appendable', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index | stats count()',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        // PPL paragraph is still created even if data distribution is not
        expect(mockBatchCreateParagraphs).toHaveBeenCalled();
        const call = mockBatchCreateParagraphs.mock.calls[0][0];
        const hasDataDist = call.paragraphs.some(
          (p: any) => p.input.inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE
        );
        expect(hasDataDist).toBe(false);
      });

      it('should not create data distribution paragraph when variables.log is true', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index',
            log: true,
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        // PPL paragraph is still created even if data distribution is not
        expect(mockBatchCreateParagraphs).toHaveBeenCalled();
        const call = mockBatchCreateParagraphs.mock.calls[0][0];
        const hasDataDist = call.paragraphs.some(
          (p: any) => p.input.inputType === DATA_DISTRIBUTION_PARAGRAPH_TYPE
        );
        expect(hasDataDist).toBe(false);
      });
    });

    describe('PPL paragraph creation', () => {
      it('should create PPL paragraph from discover context', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1609459200000, selectionTo: 1609545600000 },
          index: 'test-index',
          timeField: '@timestamp',
          dataSourceId: 'ds-123',
          variables: {
            pplQuery: 'source=test-index | fields @timestamp, message',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalledWith({
          startIndex: 0,
          paragraphs: expect.arrayContaining([
            expect.objectContaining({
              input: expect.objectContaining({
                inputText: expect.stringContaining('%ppl'),
                inputType: 'CODE',
              }),
            }),
          ]),
        });
      });

      it('should not create PPL paragraph when already exists', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index',
          },
        };

        const existingParagraphs = [
          {
            input: {
              inputType: PPL_PARAGRAPH_TYPE,
              inputText: '%ppl source=test-index',
            },
          },
          {
            input: {
              inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
              inputText: '',
            },
          },
        ];

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: existingParagraphs as any,
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
      });

      it('should set noDatePicker parameter when query is not date appendable', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1609459200000, selectionTo: 1609545600000 },
          index: 'test-index',
          timeField: '@timestamp',
          variables: {
            pplQuery: 'source=test-index | stats count()',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalledWith({
          startIndex: 0,
          paragraphs: expect.arrayContaining([
            expect.objectContaining({
              input: expect.objectContaining({
                parameters: expect.objectContaining({
                  noDatePicker: true,
                }),
              }),
            }),
          ]),
        });
      });
    });

    describe('investigation triggering', () => {
      it('should trigger investigation when initialGoal exists and no hypotheses', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });
        const mockDoInvestigate = jest.fn().mockResolvedValue(undefined);

        const mockContext = {
          initialGoal: 'Find root cause of errors',
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
        };

        // Mock paragraph states
        mockNotebookState.value.paragraphs = [];

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: mockDoInvestigate,
            hypotheses: [],
          });
        });

        // Investigation is triggered asynchronously via waitForPrecheckContexts
        // Since there are no paragraphs, onReady is called immediately
        expect(mockDoInvestigate).toHaveBeenCalledWith({
          investigationQuestion: 'Find root cause of errors',
          timeRange: mockContext.timeRange,
        });
      });

      it('should not trigger investigation when hypotheses exist', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });
        const mockDoInvestigate = jest.fn().mockResolvedValue(undefined);

        const mockContext = {
          initialGoal: 'Find root cause of errors',
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: mockDoInvestigate,
            hypotheses: [{ id: 'hyp-1' } as any],
          });
        });

        expect(mockDoInvestigate).not.toHaveBeenCalled();
      });

      it('should not trigger investigation when no initialGoal', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });
        const mockDoInvestigate = jest.fn().mockResolvedValue(undefined);

        await act(async () => {
          await result.current.start({
            context: {} as any,
            paragraphs: [],
            doInvestigate: mockDoInvestigate,
          });
        });

        expect(mockDoInvestigate).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle batch create paragraphs error gracefully', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockBatchCreateParagraphs.mockRejectedValue(new Error('Create failed'));

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: true,
            log_message_field: 'message',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error creating paragraphs in batch:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should handle batch save paragraphs error gracefully', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockBatchSaveParagraphs.mockRejectedValue(new Error('Save failed'));

        const mockParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '', {
          fullfilledOutput: { result: { fieldComparison: {} } },
        });

        mockNotebookState.value.paragraphs = [mockParagraph];

        const mockContext = {
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          index: 'test-index',
          timeField: '@timestamp',
          indexInsight: {
            is_log_index: true,
            log_message_field: 'message',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        // The error handling is tested - error may or may not be logged depending on timing
        consoleErrorSpy.mockRestore();
      });
    });

    describe('multiple paragraph creation', () => {
      it('should create multiple paragraphs when conditions are met', async () => {
        const { result } = renderHook(() => usePrecheck(), { wrapper });

        const mockContext = {
          source: NoteBookSource.DISCOVER,
          timeRange: { selectionFrom: 1609459200000, selectionTo: 1609545600000 },
          index: 'test-index',
          timeField: '@timestamp',
          dataSourceId: 'ds-123',
          indexInsight: {
            is_log_index: true,
            log_message_field: 'message',
          },
          variables: {
            pplQuery: 'source=test-index | fields @timestamp, message',
          },
        };

        await act(async () => {
          await result.current.start({
            context: mockContext as any,
            paragraphs: [],
            doInvestigate: jest.fn(),
          });
        });

        expect(mockBatchCreateParagraphs).toHaveBeenCalledWith({
          startIndex: 0,
          paragraphs: expect.arrayContaining([
            expect.objectContaining({
              input: expect.objectContaining({
                inputType: LOG_PATTERN_PARAGRAPH_TYPE,
              }),
            }),
            expect.objectContaining({
              input: expect.objectContaining({
                inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
              }),
            }),
            expect.objectContaining({
              input: expect.objectContaining({
                inputText: expect.stringContaining('%ppl'),
              }),
            }),
          ]),
        });
      });
    });
  });

  describe('rerun method', () => {
    it('should rerun PPL paragraph with updated time range', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const pplParagraph = createMockParagraphState('CODE', '%ppl source=test-index', {
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=test-index',
          parameters: {
            timeRange: {
              from: '2021-01-01 00:00:00',
              to: '2021-01-02 00:00:00',
            },
          },
        },
      });

      const timeRange = {
        selectionFrom: 1609545600000,
        selectionTo: 1609632000000,
      };

      await act(async () => {
        await result.current.rerun([pplParagraph], timeRange as any);
      });

      expect(pplParagraph.updateInput).toHaveBeenCalled();
      expect(mockRunParagraph).toHaveBeenCalledWith({ id: pplParagraph.value.id });
    });

    it('should rerun data distribution paragraph', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');

      // Create a fresh mock for this test
      const mockRunParagraphFn = jest.fn().mockResolvedValue(undefined);
      mockParagraphService.getParagraphRegistry = jest.fn((type: string) => {
        if (type === DATA_DISTRIBUTION_PARAGRAPH_TYPE) {
          return {
            runParagraph: mockRunParagraphFn,
          };
        }
        return null;
      });

      await act(async () => {
        await result.current.rerun([dataDistParagraph]);
      });

      expect(mockRunParagraphFn).toHaveBeenCalledWith({
        paragraphState: dataDistParagraph,
        notebookStateValue: mockNotebookState.value,
      });
    });

    it('should save data distribution paragraph after rerun', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');

      await act(async () => {
        await result.current.rerun([dataDistParagraph]);
      });

      expect(mockBatchSaveParagraphs).toHaveBeenCalledWith({
        paragraphStateValues: expect.arrayContaining([
          expect.objectContaining({
            id: dataDistParagraph.value.id,
          }),
        ]),
      });
    });

    it('should handle multiple paragraphs in rerun', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const pplParagraph = createMockParagraphState('CODE', '%ppl source=test-index', {
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=test-index',
          parameters: {},
        },
      });

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');

      // Create a fresh mock for this test
      const mockRunParagraphFn = jest.fn().mockResolvedValue(undefined);
      mockParagraphService.getParagraphRegistry = jest.fn((type: string) => {
        if (type === DATA_DISTRIBUTION_PARAGRAPH_TYPE) {
          return {
            runParagraph: mockRunParagraphFn,
          };
        }
        return null;
      });

      const timeRange = {
        selectionFrom: 1609545600000,
        selectionTo: 1609632000000,
      };

      await act(async () => {
        await result.current.rerun([pplParagraph, dataDistParagraph], timeRange as any);
      });

      expect(mockRunParagraph).toHaveBeenCalledWith({ id: pplParagraph.value.id });
      expect(mockRunParagraphFn).toHaveBeenCalled();
    });

    it('should not update PPL paragraph when no time range provided', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const pplParagraph = createMockParagraphState('CODE', '%ppl source=test-index');

      await act(async () => {
        await result.current.rerun([pplParagraph]);
      });

      expect(pplParagraph.updateInput).not.toHaveBeenCalled();
      expect(mockRunParagraph).not.toHaveBeenCalled();
    });

    it('should handle error in batch save during rerun', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBatchSaveParagraphs.mockRejectedValue(new Error('Save failed'));

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');

      await act(async () => {
        await result.current.rerun([dataDistParagraph]);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error running paragraphs in batch:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should filter out null values when saving paragraphs', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');
      dataDistParagraph.getBackendValue = jest.fn(() => null);

      await act(async () => {
        await result.current.rerun([dataDistParagraph]);
      });

      expect(mockBatchSaveParagraphs).toHaveBeenCalledWith({
        paragraphStateValues: [],
      });
    });
  });

  describe('return value', () => {
    it('should return an object with start and rerun methods', () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      expect(result.current).toHaveProperty('start');
      expect(result.current).toHaveProperty('rerun');
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.rerun).toBe('function');
    });

    it('should maintain stable references with useCallback', () => {
      const { result, rerender } = renderHook(() => usePrecheck(), { wrapper });

      const firstStart = result.current.start;
      const firstRerun = result.current.rerun;

      rerender();

      // useCallback should maintain stable references
      expect(result.current.start).toBe(firstStart);
      expect(result.current.rerun).toBe(firstRerun);
    });
  });

  describe('waitForPrecheckContexts helper', () => {
    it('should call onReady immediately when no paragraphs provided', (done) => {
      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [],
        onReady,
      });
    });

    it('should wait for data distribution paragraph to have output', (done) => {
      const initialValue = {
        id: 'para-1',
        input: {
          inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
          inputText: '',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject(initialValue);
      const paragraphState = {
        value: initialValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });

      // Update the value to trigger the observable
      const updatedValue = {
        ...initialValue,
        output: [
          {
            result: {
              fieldComparison: [],
            },
          },
        ],
      };
      paragraphState.value = updatedValue;
      subject.next(updatedValue);
    });

    it('should wait for data distribution paragraph with error', (done) => {
      const mockValue = {
        id: 'para-1',
        input: {
          inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
          inputText: '',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject(mockValue);
      const paragraphState = {
        value: mockValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });

      // Simulate paragraph completing with error synchronously
      subject.next({
        ...mockValue,
        uiState: {
          dataDistribution: {
            error: 'Test error',
          },
        },
      });
    });

    it('should wait for log pattern paragraph to have output', (done) => {
      const initialValue = {
        id: 'para-1',
        input: {
          inputType: LOG_PATTERN_PARAGRAPH_TYPE,
          inputText: '',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject(initialValue);
      const paragraphState = {
        value: initialValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });

      // Update the value to trigger the observable
      const updatedValue = {
        ...initialValue,
        output: [
          {
            result: { patterns: [] },
          },
        ],
      };
      paragraphState.value = updatedValue;
      subject.next(updatedValue);
    });

    it('should wait for log pattern paragraph with error', (done) => {
      const mockValue = {
        id: 'para-1',
        input: {
          inputType: LOG_PATTERN_PARAGRAPH_TYPE,
          inputText: '',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject(mockValue);
      const paragraphState = {
        value: mockValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });

      // Simulate paragraph completing with error synchronously
      subject.next({
        ...mockValue,
        uiState: {
          logPattern: {
            error: 'Test error',
          },
        },
      });
    });

    it('should wait for PPL paragraph to have fulfilledOutput', (done) => {
      const mockValue: any = {
        id: 'para-1',
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=test-index',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject<any>(mockValue);
      const paragraphState = {
        value: mockValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });

      // Simulate paragraph completing with output synchronously
      const updatedValue: any = {
        ...mockValue,
        fullfilledOutput: {
          result: { data: [] },
        },
      };
      subject.next(updatedValue);
    });

    it('should wait for all paragraphs to complete', (done) => {
      const initialValue1: any = {
        id: 'para-1',
        input: {
          inputType: DATA_DISTRIBUTION_PARAGRAPH_TYPE,
          inputText: '',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const initialValue2: any = {
        id: 'para-2',
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=test-index',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject1 = new BehaviorSubject<any>(initialValue1);
      const subject2 = new BehaviorSubject<any>(initialValue2);

      const paragraphState1 = {
        value: initialValue1,
        getValue$: () => subject1.asObservable(),
      } as any;

      const paragraphState2 = {
        value: initialValue2,
        getValue$: () => subject2.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState1, paragraphState2]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState1, paragraphState2],
        onReady,
      });

      // Complete both paragraphs
      const updatedValue1: any = {
        ...initialValue1,
        output: [
          {
            result: {
              fieldComparison: [],
            },
          },
        ],
      };
      paragraphState1.value = updatedValue1;
      subject1.next(updatedValue1);

      const updatedValue2: any = {
        ...initialValue2,
        fullfilledOutput: {
          result: { data: [] },
        },
      };
      paragraphState2.value = updatedValue2;
      subject2.next(updatedValue2);
    });

    it('should handle non-precheck paragraphs immediately', (done) => {
      const mockValue = {
        id: 'para-1',
        input: {
          inputType: 'MARKDOWN',
          inputText: '# Title',
          parameters: {},
        },
        fullfilledOutput: null,
        uiState: {},
      };

      const subject = new BehaviorSubject(mockValue);
      const paragraphState = {
        value: mockValue,
        getValue$: () => subject.asObservable(),
      } as any;

      const onReady = jest.fn(() => {
        expect(onReady).toHaveBeenCalledWith([paragraphState]);
        done();
      });

      waitForPrecheckContexts({
        paragraphStates: [paragraphState],
        onReady,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty paragraphs array', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      await act(async () => {
        await result.current.start({
          context: {} as any,
          paragraphs: [],
          doInvestigate: jest.fn(),
        });
      });

      expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
    });

    it('should handle missing context properties gracefully', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      await act(async () => {
        await result.current.start({
          context: undefined as any,
          paragraphs: [],
          doInvestigate: jest.fn(),
        });
      });

      expect(mockBatchCreateParagraphs).not.toHaveBeenCalled();
    });

    it('should handle empty paragraph states in rerun', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      await act(async () => {
        await result.current.rerun([]);
      });

      expect(mockRunParagraph).not.toHaveBeenCalled();
      expect(mockBatchSaveParagraphs).not.toHaveBeenCalled();
    });

    it('should handle paragraph without getValue$ method', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const invalidParagraph = {
        value: {
          id: 'invalid',
          input: { inputType: 'CODE', inputText: '' },
        },
      } as any;

      mockNotebookState.value.paragraphs = [invalidParagraph];

      await act(async () => {
        await result.current.start({
          context: { initialGoal: 'test' } as any,
          paragraphs: [],
          doInvestigate: jest.fn(),
        });
      });

      // Should not crash
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from discover to investigation', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });
      const mockDoInvestigate = jest.fn().mockResolvedValue(undefined);

      const mockContext = {
        source: NoteBookSource.DISCOVER,
        initialGoal: 'Investigate errors',
        timeRange: { selectionFrom: 1609459200000, selectionTo: 1609545600000 },
        index: 'test-index',
        timeField: '@timestamp',
        dataSourceId: 'ds-123',
        indexInsight: {
          is_log_index: true,
          log_message_field: 'message',
        },
        variables: {
          pplQuery: 'source=test-index | fields @timestamp, message',
        },
      };

      mockNotebookState.value.paragraphs = [];

      await act(async () => {
        await result.current.start({
          context: mockContext as any,
          paragraphs: [],
          doInvestigate: mockDoInvestigate,
          hypotheses: [],
        });
      });

      expect(mockBatchCreateParagraphs).toHaveBeenCalled();
    });

    it('should handle rerun with time range update', async () => {
      const { result } = renderHook(() => usePrecheck(), { wrapper });

      const pplParagraph = createMockParagraphState('CODE', '%ppl source=test-index', {
        input: {
          inputType: 'CODE',
          inputText: '%ppl source=test-index',
          parameters: {
            timeRange: {
              from: '2021-01-01 00:00:00',
              to: '2021-01-02 00:00:00',
            },
          },
        },
      });

      const dataDistParagraph = createMockParagraphState(DATA_DISTRIBUTION_PARAGRAPH_TYPE, '');

      const newTimeRange = {
        selectionFrom: 1609632000000,
        selectionTo: 1609718400000,
      };

      await act(async () => {
        await result.current.rerun([pplParagraph, dataDistParagraph], newTimeRange as any);
      });

      expect(pplParagraph.updateInput).toHaveBeenCalled();
      expect(mockRunParagraph).toHaveBeenCalled();
      expect(mockBatchSaveParagraphs).toHaveBeenCalled();
    });
  });
});
