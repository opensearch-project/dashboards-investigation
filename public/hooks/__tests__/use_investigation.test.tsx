/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { useInvestigation } from '../use_investigation';
import { useOpenSearchDashboards } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../../components/notebooks/context_provider/context_provider';
import { NotebookState } from '../../../common/state/notebook_state';
import { TopContextState } from '../../../common/state/top_context_state';
import * as mlCommonsApis from '../../utils/ml_commons_apis';
import { useNotebook } from '../use_notebook';
import { useToast } from '../use_toast';

jest.mock('../../../../../src/plugins/opensearch_dashboards_react/public');
jest.mock('../../utils/ml_commons_apis');
jest.mock('../use_notebook');
jest.mock('../use_toast');
jest.mock(
  '../../components/notebooks/components/hypothesis/investigation/services/shared_message_polling_service'
);

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
});
