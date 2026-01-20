/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { BehaviorSubject } from 'rxjs';
import { useInvestigation } from './use_investigation';
import { NotebookReactContext } from '../components/notebooks/context_provider/context_provider';
import { InvestigationPhase } from '../../common/state/notebook_state';
import { OpenSearchDashboardsContextProvider } from '../../../../src/plugins/opensearch_dashboards_react/public';

// Mock dependencies
jest.mock('react-use', () => ({
  useObservable: jest.fn((subject$, defaultValue) => {
    if (subject$ && typeof subject$.getValue === 'function') {
      return subject$.getValue();
    }
    return defaultValue;
  }),
}));

jest.mock('./use_notebook', () => ({
  useNotebook: () => ({
    updateHypotheses: jest.fn(),
    updateNotebookContext: jest.fn(),
  }),
}));

jest.mock('./use_toast', () => ({
  useToast: () => ({
    addError: jest.fn(),
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

const createMockNotebookContext = (initialState = {}) => {
  const defaultState = {
    id: 'test-notebook-123',
    hypotheses: [],
    context: {
      value: {
        dataSourceId: 'test-datasource',
        initialGoal: 'Test question',
      },
    },
    runningMemory: undefined,
    historyMemory: undefined,
    investigationError: undefined,
    isNotebookReadonly: false,
    currentUser: 'test-user',
    investigationPhase: undefined,
    title: 'Test Notebook',
    path: 'test-path',
    ...initialState,
  };

  const state$ = new BehaviorSubject(defaultState);
  const paragraphStates$ = new BehaviorSubject([]);

  return {
    state: {
      getValue$: () => state$,
      getParagraphStates$: () => paragraphStates$,
      getParagraphsValue: jest.fn(() => []),
      value: defaultState,
      updateValue: jest.fn((updates) => {
        const newValue = { ...state$.getValue(), ...updates };
        state$.next(newValue);
      }),
    },
    paragraphHooks: {
      createParagraph: jest.fn(),
      batchCreateParagraphs: jest.fn(),
      batchRunParagraphs: jest.fn(),
      runParagraph: jest.fn(),
      batchDeleteParagraphs: jest.fn(),
    },
  };
};

describe('useInvestigation Hook', () => {
  let mockServices: any;

  beforeEach(() => {
    mockServices = createMockServices();
    jest.clearAllMocks();
  });

  const renderUseInvestigation = (contextOverrides = {}) => {
    const context = createMockNotebookContext(contextOverrides);
    const hookResult = renderHook(() => useInvestigation(), {
      wrapper: ({ children }) => (
        <OpenSearchDashboardsContextProvider services={mockServices}>
          <NotebookReactContext.Provider value={context}>{children}</NotebookReactContext.Provider>
        </OpenSearchDashboardsContextProvider>
      ),
    });
    return { ...hookResult, context };
  };

  describe('isInvestigating derived state', () => {
    it('should return true when investigationPhase is PLANNING', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.PLANNING,
      });

      expect(result.current.isInvestigating).toBe(true);
    });

    it('should return true when investigationPhase is RETRIEVING_CONTEXT', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT,
      });

      expect(result.current.isInvestigating).toBe(true);
    });

    it('should return true when investigationPhase is GATHERING_DATA', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
      });

      expect(result.current.isInvestigating).toBe(true);
    });

    it('should return false when investigationPhase is COMPLETED', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.COMPLETED,
      });

      expect(result.current.isInvestigating).toBe(false);
    });

    it('should return false when investigationPhase is undefined', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: undefined,
      });

      expect(result.current.isInvestigating).toBe(false);
    });
  });

  describe('Hook API', () => {
    it('should return all required functions', () => {
      const { result } = renderUseInvestigation();

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

  describe('checkOngoingInvestigation', () => {
    it('should return false when no ongoing investigation', async () => {
      mockHttp.get.mockResolvedValueOnce({
        runningMemory: undefined,
      });

      const { result } = renderUseInvestigation();

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

      const { result } = renderUseInvestigation();

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

      const { result } = renderUseInvestigation();

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

      const { result, context } = renderUseInvestigation();
      context.paragraphHooks.createParagraph.mockResolvedValueOnce(mockParagraph);

      await act(async () => {
        await result.current.addNewFinding({ text: 'Test finding' });
      });

      expect(context.paragraphHooks.createParagraph).toHaveBeenCalledWith({
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

      expect(context.paragraphHooks.runParagraph).toHaveBeenCalledWith({
        id: 'para-123',
      });
    });

    it('should not run paragraph if creation fails', async () => {
      const { result, context } = renderUseInvestigation();
      context.paragraphHooks.createParagraph.mockResolvedValueOnce(null);

      await act(async () => {
        await result.current.addNewFinding({ text: 'Test finding' });
      });

      expect(context.paragraphHooks.runParagraph).not.toHaveBeenCalled();
    });
  });

  describe('Phase transitions', () => {
    it('should have undefined phase initially', () => {
      const { result } = renderUseInvestigation();
      expect(result.current.isInvestigating).toBe(false);
    });

    it('should transition through phases during investigation lifecycle', () => {
      // This test verifies the hook properly derives isInvestigating from different phases
      const phases = [
        { phase: InvestigationPhase.PLANNING, expected: true },
        { phase: InvestigationPhase.RETRIEVING_CONTEXT, expected: true },
        { phase: InvestigationPhase.GATHERING_DATA, expected: true },
        { phase: InvestigationPhase.COMPLETED, expected: false },
      ];

      phases.forEach(({ phase, expected }) => {
        const { result } = renderUseInvestigation({
          investigationPhase: phase,
        });

        expect(result.current.isInvestigating).toBe(expected);
      });
    });
  });

  describe('Error states', () => {
    it('should not be investigating when there is an error', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.COMPLETED,
        investigationError: 'Test error',
      });

      expect(result.current.isInvestigating).toBe(false);
    });

    it('should still show investigating status during error in active phase', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
        investigationError: 'Partial error',
      });

      expect(result.current.isInvestigating).toBe(true);
    });
  });

  describe('Running memory states', () => {
    it('should recognize investigating state with running memory', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
        runningMemory: {
          executorMemoryId: 'mem-123',
          parentInteractionId: 'parent-123',
        },
      });

      expect(result.current.isInvestigating).toBe(true);
    });

    it('should recognize completed state without running memory', () => {
      const { result } = renderUseInvestigation({
        investigationPhase: InvestigationPhase.COMPLETED,
        runningMemory: undefined,
        historyMemory: {
          executorMemoryId: 'mem-123',
          parentInteractionId: 'parent-123',
        },
      });

      expect(result.current.isInvestigating).toBe(false);
    });
  });
});
