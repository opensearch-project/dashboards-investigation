/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { of } from 'rxjs';
import { useInvestigation } from '../use_investigation';
import { useOpenSearchDashboards } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../../components/notebooks/context_provider/context_provider';
import { NotebookState } from '../../../common/state/notebook_state';
import { TopContextState } from '../../../common/state/top_context_state';
import * as mlCommonsApis from '../../utils/ml_commons_apis';
import { useNotebook } from '../use_notebook';
import { useToast } from '../use_toast';
import { isValidPERAgentInvestigationResponse } from '../../../common/utils/per_agent';
import { SharedMessagePollingService } from '../../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service';

jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public');
jest.mock('../../utils/ml_commons_apis');
jest.mock('../use_notebook');
jest.mock('../use_toast');
jest.mock(
  '../../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service'
);
jest.mock('../../../common/utils/per_agent');

describe('useInvestigation', () => {
  let mockNotebookState: NotebookState;
  let mockParagraphHooks: any;
  let mockHttp: any;
  let mockAddError: jest.Mock;
  let mockUpdateHypotheses: jest.Mock;
  let mockUpdateNotebookContext: jest.Mock;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotebookReactContext.Provider
      value={{
        state: mockNotebookState,
        paragraphHooks: mockParagraphHooks,
      }}
    >
      {children}
    </NotebookReactContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockAddError = jest.fn();
    mockUpdateHypotheses = jest.fn().mockResolvedValue(undefined);
    mockUpdateNotebookContext = jest.fn().mockResolvedValue(undefined);

    (useToast as jest.Mock).mockReturnValue({ addError: mockAddError });
    (useNotebook as jest.Mock).mockReturnValue({
      updateHypotheses: mockUpdateHypotheses,
      updateNotebookContext: mockUpdateNotebookContext,
    });

    mockHttp = {
      get: jest.fn(),
      put: jest.fn(),
    };

    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: {
        http: mockHttp,
        paragraphService: {},
        notifications: { toasts: { addWarning: jest.fn() } },
        application: { capabilities: { investigation: {} } },
      },
    });

    mockNotebookState = new NotebookState({
      paragraphs: [],
      id: 'test-notebook',
      title: 'Test Notebook',
      context: new TopContextState({ dataSourceId: 'ds-123' }),
      dataSourceEnabled: false,
      dateCreated: '',
      dateModified: '',
      isLoading: false,
      path: '',
      vizPrefix: '',
      isNotebookReadonly: false,
      topologies: [],
    });

    mockParagraphHooks = {
      createParagraph: jest.fn(),
      batchCreateParagraphs: jest.fn(),
      batchRunParagraphs: jest.fn(),
      runParagraph: jest.fn(),
      batchDeleteParagraphs: jest.fn(),
    };
  });

  describe('executeInvestigation - executorMemoryId retry logic', () => {
    const setupMocks = () => {
      (mlCommonsApis.getMLCommonsConfig as jest.Mock).mockResolvedValue({
        configuration: { agent_id: 'test-agent-id' },
      });
      (mlCommonsApis.getMLCommonsAgentDetail as jest.Mock).mockResolvedValue({
        memory: { memory_container_id: 'test-container-id' },
      });
      (mlCommonsApis.executeMLCommonsAgent as jest.Mock).mockResolvedValue({
        inference_results: [{ output: [{ result: 'interaction_id:test-interaction' }] }],
      });
    };

    it('should accept valid executorMemoryId on first attempt', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock).mockResolvedValue({
        session_id: 'valid-session-id',
      });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(1);
    });

    it('should retry when executorMemoryId starts with -', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: '-invalid-id' })
        .mockResolvedValueOnce({ session_id: 'valid-session-id' });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(2);
    });

    it('should retry when executorMemoryId starts with _', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: '_invalid-id' })
        .mockResolvedValueOnce({ session_id: 'valid-session-id' });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(2);
    });

    it('should retry up to 3 times for invalid executorMemoryId', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: '-invalid-1' })
        .mockResolvedValueOnce({ session_id: '_invalid-2' })
        .mockResolvedValueOnce({ session_id: 'valid-id-3' });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(3);
    });

    it('should throw error when executorMemoryId is null after retries', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: null })
        .mockResolvedValueOnce({ session_id: null })
        .mockResolvedValueOnce({ session_id: null });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to execute per agent',
        })
      );
    });

    it('should stop retrying when valid id is found', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: '-invalid' })
        .mockResolvedValueOnce({ session_id: 'abc123' });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(2);
      expect(mlCommonsApis.executeMLCommonsAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            executor_agent_memory_id: 'abc123',
          }),
        })
      );
    });

    it('should continue with invalid id after 3 retries all start with - or _', async () => {
      setupMocks();
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock)
        .mockResolvedValueOnce({ session_id: '-invalid-1' })
        .mockResolvedValueOnce({ session_id: '_invalid-2' })
        .mockResolvedValueOnce({ session_id: '-invalid-3' });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mlCommonsApis.createAgenticExecutionMemory).toHaveBeenCalledTimes(3);
      // Should continue with the last generated id even if it starts with - or _
      expect(mlCommonsApis.executeMLCommonsAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            executor_agent_memory_id: '-invalid-3',
          }),
        })
      );
    });
  });

  describe('executeInvestigation - error handling', () => {
    it('should handle readonly notebook', async () => {
      mockNotebookState.updateValue({ isNotebookReadonly: true });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to execute per agent',
        })
      );
    });

    it('should handle missing agentId', async () => {
      (mlCommonsApis.getMLCommonsConfig as jest.Mock).mockResolvedValue({
        configuration: { agent_id: null },
      });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mockAddError).toHaveBeenCalled();
    });
  });

  describe('isInvestigating state', () => {
    it('should set isInvestigating to false on error', async () => {
      (mlCommonsApis.getMLCommonsConfig as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(result.current.isInvestigating).toBe(false);
    });
  });

  describe('response validation error handling', () => {
    let mockIsValidPERAgentInvestigationResponse: jest.Mock;
    let mockSharedMessagePollingService: any;

    beforeEach(() => {
      mockIsValidPERAgentInvestigationResponse = (isValidPERAgentInvestigationResponse as unknown) as jest.Mock;

      // Mock the SharedMessagePollingService with proper RxJS observable
      mockSharedMessagePollingService = {
        poll: jest.fn(),
      };

      (SharedMessagePollingService.getInstance as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockSharedMessagePollingService);

      // Setup ML Commons API mocks for successful investigation setup
      (mlCommonsApis.getMLCommonsConfig as jest.Mock).mockResolvedValue({
        configuration: { agent_id: 'test-agent-id' },
      });
      (mlCommonsApis.getMLCommonsAgentDetail as jest.Mock).mockResolvedValue({
        memory: { memory_container_id: 'test-container-id' },
      });
      (mlCommonsApis.createAgenticExecutionMemory as jest.Mock).mockResolvedValue({
        session_id: 'test-session-id',
      });
      (mlCommonsApis.executeMLCommonsAgent as jest.Mock).mockResolvedValue({
        response: {
          parent_interaction_id: 'test-parent-interaction',
        },
      });
    });

    it('should call addError with error.message as "Invalid per agent response" and i18n cause when response validation fails', async () => {
      // Mock the validation to return false (invalid response)
      mockIsValidPERAgentInvestigationResponse.mockReturnValue(false);

      // Mock polling service to return invalid response using RxJS of
      const invalidResponse = '{"findings": [], "hypotheses": []}'; // Valid JSON but invalid format
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify that addError was called with exact error.message and i18n translated cause
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: 'Invalid per agent response',
            cause:
              'The investigation response format is invalid. Please try running the investigation again.',
          }),
        })
      );
    });

    it('should call addError with empty error.message and cause containing raw message when JSON parsing fails', async () => {
      // Mock polling service to return invalid JSON using RxJS of
      const invalidJsonResponse = '{"invalid": json}'; // Invalid JSON syntax
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidJsonResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify that addError was called with empty message and cause containing the raw invalid JSON
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: '', // error.message is set to empty string on line 277
            cause: invalidJsonResponse, // error.cause is set to the original message on line 276
          }),
        })
      );
    });

    it('should update investigation error state when response validation fails', async () => {
      mockIsValidPERAgentInvestigationResponse.mockReturnValue(false);

      // Mock polling service to return invalid response using RxJS of
      const invalidResponse = '{"some": "data"}';
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify that the error was added to toast notifications with proper structure
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: 'Invalid per agent response',
            cause:
              'The investigation response format is invalid. Please try running the investigation again.',
          }),
        })
      );

      // Verify that hypotheses were updated (cleanup on error)
      expect(mockUpdateHypotheses).toHaveBeenCalled();
    });

    it('should handle successful response validation and parsing', async () => {
      // Mock the validation to return true (valid response)
      mockIsValidPERAgentInvestigationResponse.mockReturnValue(true);

      const validResponse = JSON.stringify({
        findings: [
          {
            id: 'f1',
            description: 'Finding 1',
            importance: 0.9,
            evidence: 'Evidence text',
            type: 'observation',
          },
        ],
        hypotheses: [
          {
            id: 'h1',
            title: 'Hypothesis 1',
            description: 'Hypothesis description',
            likelihood: 0.8,
            status: 'pending',
            supporting_findings: ['f1'],
          },
        ],
        topologies: [],
      });
      mockSharedMessagePollingService.poll.mockReturnValue(of(validResponse));

      // Mock batchCreateParagraphs to return created paragraphs
      mockParagraphHooks.batchCreateParagraphs.mockResolvedValue({
        paragraphs: [{ id: 'paragraph-1' }],
      });

      // Mock batchRunParagraphs
      mockParagraphHooks.batchRunParagraphs.mockResolvedValue({});

      // Mock batchDeleteParagraphs
      mockParagraphHooks.batchDeleteParagraphs.mockResolvedValue({});

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify that addError was NOT called for valid response
      expect(mockAddError).not.toHaveBeenCalled();

      // Verify that hypotheses were updated with the valid response
      expect(mockUpdateHypotheses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'h1',
            title: 'Hypothesis 1',
            likelihood: 0.8,
          }),
        ]),
        [], // topologies
        true // replace flag
      );
    });

    it('should clean up "Max Steps Limit [xx] Reached" error message to "Max Steps Limit Reached"', async () => {
      // Mock polling service to return "Max Steps Limit [20] Reached" error
      const maxStepsErrorMessage = 'Max Steps Limit [20] Reached';
      mockSharedMessagePollingService.poll.mockReturnValue(of(maxStepsErrorMessage));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify that addError was called with cleaned up message (without [20])
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: 'Max Steps Limit Reached', // Cleaned up message
            cause: maxStepsErrorMessage, // Original message in cause
          }),
        })
      );
    });

    it('should handle different Max Steps Limit numbers correctly', async () => {
      // Test with different step numbers
      const maxStepsErrorMessage = 'Max Steps Limit [15] Reached';
      mockSharedMessagePollingService.poll.mockReturnValue(of(maxStepsErrorMessage));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      // Verify the message is still cleaned up regardless of the number
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: 'Max Steps Limit Reached',
            cause: maxStepsErrorMessage,
          }),
        })
      );
    });
  });
});
