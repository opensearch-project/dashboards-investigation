/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { of } from 'rxjs';
import { useInvestigation } from './use_investigation';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { InvestigationPhase, NotebookState } from '../../common/state/notebook_state';
import { TopContextState } from '../../common/state/top_context_state';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import * as mlCommonsApis from '../utils/ml_commons_apis';
import { useNotebook } from './use_notebook';
import { useToast } from './use_toast';
import { isValidPERAgentInvestigationResponse } from '../../common/utils/per_agent';
import { SharedMessagePollingService } from '../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service';

jest.mock('../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: jest.fn(),
  OpenSearchDashboardsContextProvider: ({ children }: any) => children,
}));
jest.mock('../utils/ml_commons_apis');
jest.mock('./use_notebook');
jest.mock('./use_toast');
jest.mock(
  '../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service'
);
jest.mock('../../common/utils/per_agent');
jest.mock('react-use', () => ({
  useObservable: jest.fn((subject$, defaultValue) => {
    if (subject$ && typeof subject$.subscribe === 'function') {
      let value = defaultValue;
      subject$.subscribe((v: any) => {
        value = v;
      });
      return value;
    }
    if (subject$ && typeof subject$.getValue === 'function') {
      return subject$.getValue();
    }
    return defaultValue;
  }),
}));

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockParagraphService = {
  getParagraph: jest.fn(),
};

const createMockServices = () => ({
  http: mockHttp,
  paragraphService: mockParagraphService,
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addWarning: jest.fn(),
    },
  },
  application: {
    capabilities: {
      investigation: {
        ownerSupported: true,
      },
    },
  },
});

describe('useInvestigation', () => {
  let mockServices: any;
  let mockNotebookState: NotebookState;
  let mockParagraphHooks: any;
  let mockAddError: jest.Mock;
  let mockUpdateHypotheses: jest.Mock;
  let mockUpdateNotebookContext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServices = createMockServices();
    mockAddError = jest.fn();
    mockUpdateHypotheses = jest.fn().mockResolvedValue(undefined);
    mockUpdateNotebookContext = jest.fn().mockResolvedValue(undefined);

    (useToast as jest.Mock).mockReturnValue({ addError: mockAddError });
    (useNotebook as jest.Mock).mockReturnValue({
      updateHypotheses: mockUpdateHypotheses,
      updateNotebookContext: mockUpdateNotebookContext,
    });

    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: mockServices,
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

  describe('Hook API', () => {
    it('should return all required functions', () => {
      const { result } = renderHook(() => useInvestigation(), { wrapper });

      expect(result.current).toHaveProperty('isInvestigating');
      expect(result.current).toHaveProperty('doInvestigate');
      expect(result.current).toHaveProperty('addNewFinding');
      expect(result.current).toHaveProperty('rerunInvestigation');
      expect(result.current).toHaveProperty('continueInvestigation');
      expect(result.current).toHaveProperty('checkOngoingInvestigation');

      expect(typeof result.current.doInvestigate).toBe('function');
      expect(typeof result.current.addNewFinding).toBe('function');
      expect(typeof result.current.rerunInvestigation).toBe('function');
      expect(typeof result.current.continueInvestigation).toBe('function');
      expect(typeof result.current.checkOngoingInvestigation).toBe('function');
    });
  });

  describe('isInvestigating state', () => {
    it('should return true for active investigation phases', () => {
      const phases = [
        { phase: InvestigationPhase.PLANNING, expected: true },
        { phase: InvestigationPhase.RETRIEVING_CONTEXT, expected: true },
        { phase: InvestigationPhase.GATHERING_DATA, expected: true },
      ];

      phases.forEach(({ phase, expected }) => {
        const state = new NotebookState({
          ...mockNotebookState.value,
          investigationPhase: phase,
        });
        const hooks = mockParagraphHooks;
        const { result } = renderHook(() => useInvestigation(), {
          wrapper: ({ children }) => (
            <NotebookReactContext.Provider value={{ state, paragraphHooks: hooks }}>
              {children}
            </NotebookReactContext.Provider>
          ),
        });
        expect(result.current.isInvestigating).toBe(expected);
      });
    });

    it('should return false for completed or undefined phases', () => {
      const phases = [
        { phase: InvestigationPhase.COMPLETED, expected: false },
        { phase: undefined, expected: false },
      ];

      phases.forEach(({ phase, expected }) => {
        const state = new NotebookState({
          ...mockNotebookState.value,
          investigationPhase: phase,
        });
        const hooks = mockParagraphHooks;
        const { result } = renderHook(() => useInvestigation(), {
          wrapper: ({ children }) => (
            <NotebookReactContext.Provider value={{ state, paragraphHooks: hooks }}>
              {children}
            </NotebookReactContext.Provider>
          ),
        });
        expect(result.current.isInvestigating).toBe(expected);
      });
    });

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

  describe('checkOngoingInvestigation', () => {
    it('should return false when no ongoing investigation', async () => {
      mockHttp.get.mockResolvedValueOnce({
        runningMemory: undefined,
      });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      let hasOngoing;
      await act(async () => {
        hasOngoing = await result.current.checkOngoingInvestigation();
      });

      expect(hasOngoing).toBe(false);
      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/investigation/note/savedNotebook/')
      );
    });

    it('should return true and show warning when another user is investigating', async () => {
      mockHttp.get.mockResolvedValueOnce({
        runningMemory: {
          parentInteractionId: 'interaction-123',
          owner: 'other-user',
        },
      });

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      let hasOngoing;
      await act(async () => {
        hasOngoing = await result.current.checkOngoingInvestigation();
      });

      expect(hasOngoing).toBe(true);
      expect(mockServices.notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: 'Investigation in progress',
        text: expect.stringContaining('other-user'),
      });
    });

    it('should return true on error', async () => {
      mockHttp.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      let hasOngoing;
      await act(async () => {
        hasOngoing = await result.current.checkOngoingInvestigation();
      });

      expect(hasOngoing).toBe(true);
    });
  });

  describe('addNewFinding', () => {
    it('should create and run a new finding paragraph', async () => {
      const mockParagraph = {
        value: { id: 'para-123' },
      };

      mockParagraphHooks.createParagraph.mockResolvedValueOnce(mockParagraph);

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.addNewFinding({ text: 'Test finding' });
      });

      expect(mockParagraphHooks.createParagraph).toHaveBeenCalledWith({
        index: expect.any(Number),
        input: {
          inputText: 'Test finding',
          inputType: 'MARKDOWN',
          parameters: {
            finding: {},
          },
        },
        aiGenerated: false,
      });

      expect(mockParagraphHooks.runParagraph).toHaveBeenCalledWith({
        id: 'para-123',
      });
    });

    it('should not run paragraph if creation fails', async () => {
      mockParagraphHooks.createParagraph.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.addNewFinding({ text: 'Test finding' });
      });

      expect(mockParagraphHooks.runParagraph).not.toHaveBeenCalled();
    });
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

    it('should retry when executorMemoryId starts with - or _', async () => {
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

  describe('response validation error handling', () => {
    let mockIsValidPERAgentInvestigationResponse: jest.Mock;
    let mockSharedMessagePollingService: any;

    beforeEach(() => {
      mockIsValidPERAgentInvestigationResponse = (isValidPERAgentInvestigationResponse as unknown) as jest.Mock;

      mockSharedMessagePollingService = {
        poll: jest.fn(),
      };

      (SharedMessagePollingService.getInstance as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockSharedMessagePollingService);

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
      mockIsValidPERAgentInvestigationResponse.mockReturnValue(false);

      const invalidResponse = '{"findings": [], "hypotheses": []}';
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

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
      const invalidJsonResponse = '{"invalid": json}';
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidJsonResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to parse response',
          error: expect.objectContaining({
            message: '',
            cause: invalidJsonResponse,
          }),
        })
      );
    });

    it('should update investigation error state when response validation fails', async () => {
      mockIsValidPERAgentInvestigationResponse.mockReturnValue(false);

      const invalidResponse = '{"some": "data"}';
      mockSharedMessagePollingService.poll.mockReturnValue(of(invalidResponse));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

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

      expect(mockUpdateHypotheses).toHaveBeenCalled();
    });

    it('should handle successful response validation and parsing', async () => {
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

      mockParagraphHooks.batchCreateParagraphs.mockResolvedValue({
        paragraphs: [{ id: 'paragraph-1' }],
      });

      mockParagraphHooks.batchRunParagraphs.mockResolvedValue({});

      mockParagraphHooks.batchDeleteParagraphs.mockResolvedValue({});

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

      expect(mockAddError).not.toHaveBeenCalled();

      expect(mockUpdateHypotheses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'h1',
            title: 'Hypothesis 1',
            likelihood: 0.8,
          }),
        ]),
        [],
        true
      );
    });

    it('should clean up "Max Steps Limit (xx) Reached" error message to "Max Steps Limit Reached"', async () => {
      const maxStepsErrorMessage = 'Max Steps Limit (20) Reached';
      mockSharedMessagePollingService.poll.mockReturnValue(of(maxStepsErrorMessage));

      const { result } = renderHook(() => useInvestigation(), { wrapper });

      await act(async () => {
        await result.current.doInvestigate({
          investigationQuestion: 'Test question',
        });
      });

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
