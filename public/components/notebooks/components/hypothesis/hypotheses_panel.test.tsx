/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { useObservable } from 'react-use';
import { HypothesesPanel } from './hypotheses_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { InvestigationPhase } from '../../../../../common/state/notebook_state';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

// Mock the hooks
jest.mock('react-use', () => ({
  useObservable: jest.fn((subject$, defaultValue) => defaultValue),
}));

jest.mock('@osd/i18n', () => ({
  i18n: {
    translate: jest.fn((id: string, options: { defaultMessage: string }) => options.defaultMessage),
  },
}));

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const createMockServices = () => ({
  appName: 'test-app',
  usageCollection: {},
  http: mockHttp,
  application: {
    capabilities: {
      investigation: {
        ownerSupported: true,
      },
    },
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    },
  },
});

const createMockNotebookContext = (overrides = {}) => {
  const defaultState = {
    hypotheses: [],
    context: { value: { dataSourceId: 'test-datasource' } },
    runningMemory: undefined,
    historyMemory: undefined,
    investigationError: undefined,
    isNotebookReadonly: false,
    currentUser: 'test-user',
    investigationPhase: InvestigationPhase.PLANNING,
    ...overrides,
  };

  const state$ = new BehaviorSubject(defaultState);

  return {
    state: {
      getValue$: () => state$,
      value: defaultState,
      updateValue: jest.fn(),
    },
  };
};

describe('HypothesesPanel - Component Rendering', () => {
  let history: ReturnType<typeof createMemoryHistory>;
  let mockServices: ReturnType<typeof createMockServices>;

  beforeEach(() => {
    history = createMemoryHistory();
    mockServices = createMockServices();
    jest.clearAllMocks();
  });

  const renderComponent = (notebookContextOverrides = {}) => {
    const mockContext = createMockNotebookContext(notebookContextOverrides);
    (useObservable as jest.Mock).mockReturnValue(mockContext.state.value);

    return render(
      <OpenSearchDashboardsContextProvider services={mockServices}>
        <Router history={history}>
          <NotebookReactContext.Provider value={mockContext}>
            <HypothesesPanel
              notebookId="test-notebook-123"
              question="What is causing the issue?"
              openReinvestigateModal={jest.fn()}
            />
          </NotebookReactContext.Provider>
        </Router>
      </OpenSearchDashboardsContextProvider>
    );
  };

  it('should render the component with hypotheses accordion', () => {
    renderComponent();

    expect(screen.getByText('Hypotheses')).toBeInTheDocument();
  });

  it('should not render when question is not provided', () => {
    const mockContext = createMockNotebookContext();
    mockUseObservable.mockReturnValue(mockContext.state.value);

    const { container } = render(
      <OpenSearchDashboardsContextProvider services={mockServices}>
        <Router history={history}>
          <NotebookReactContext.Provider value={mockContext}>
            <HypothesesPanel
              notebookId="test-notebook-123"
              question=""
              openReinvestigateModal={jest.fn()}
            />
          </NotebookReactContext.Provider>
        </Router>
      </OpenSearchDashboardsContextProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  describe('Investigation Phase Display', () => {
    it('should display "Planning for your investigation..." during PLANNING phase', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.PLANNING,
      });

      expect(screen.getByText('Planning for your investigation...')).toBeInTheDocument();
      expect(screen.getByText('Under investigation')).toBeInTheDocument();
    });

    it('should display "Retrieving context..." during RETRIEVING_CONTEXT phase', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT,
      });

      expect(screen.getByText('Retrieving context...')).toBeInTheDocument();
      expect(screen.getByText('Under investigation')).toBeInTheDocument();
    });

    it('should display "Gathering data in progress..." during GATHERING_DATA phase', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
      });

      expect(screen.getByText('Gathering data in progress...')).toBeInTheDocument();
      expect(screen.getByText('Under investigation')).toBeInTheDocument();
    });

    it('should display "No hypotheses generated" when COMPLETED with no hypotheses', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.COMPLETED,
        hypotheses: [],
        historyMemory: { executorMemoryId: 'mem-1' },
      });

      expect(screen.getByText('No hypotheses generated')).toBeInTheDocument();
      expect(screen.getByText('No hypotheses')).toBeInTheDocument();
    });

    it('should display "Investigation completed" badge when COMPLETED with hypotheses', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.COMPLETED,
        hypotheses: [{ id: 'hyp-1', title: 'Test Hypothesis' }],
        historyMemory: { executorMemoryId: 'mem-1' },
      });

      expect(screen.getByText('Investigation completed')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should show error badge when investigation fails', () => {
      renderComponent({
        investigationError: 'Test error message',
        investigationPhase: InvestigationPhase.COMPLETED,
      });

      expect(
        screen.getByText('Investigation failed and showing previous hypotheses')
      ).toBeInTheDocument();
    });

    it('should show warning badge when another user is investigating', () => {
      renderComponent({
        runningMemory: { owner: 'other-user', executorMemoryId: 'mem-1' },
        currentUser: 'test-user',
        investigationPhase: InvestigationPhase.GATHERING_DATA,
      });

      expect(
        screen.getByText('Other user is doing investigation, show previous Investigation')
      ).toBeInTheDocument();
    });

    it('should show "Under investigation" badge during active investigation', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
      });

      expect(screen.getByText('Under investigation')).toBeInTheDocument();
    });
  });

  describe('Hypotheses Rendering', () => {
    it('should render multiple hypotheses when investigation is completed', () => {
      const hypotheses = [
        { id: 'hyp-1', title: 'Hypothesis 1', description: 'Description 1' },
        { id: 'hyp-2', title: 'Hypothesis 2', description: 'Description 2' },
      ];

      renderComponent({
        investigationPhase: InvestigationPhase.COMPLETED,
        hypotheses,
        historyMemory: { executorMemoryId: 'mem-1' },
      });

      // The hypotheses should be rendered (actual content depends on HypothesisItem component)
      expect(screen.queryByText('No hypotheses generated')).not.toBeInTheDocument();
    });
  });

  describe('Investigation Steps Visibility', () => {
    it('should not show investigation steps when readonly', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
        isNotebookReadonly: true,
        runningMemory: {
          executorMemoryId: 'mem-1',
          memoryContainerId: 'container-1',
          parentInteractionId: 'parent-1',
          owner: 'test-user',
        },
      });

      expect(screen.queryByText('Investigation Steps')).not.toBeInTheDocument();
    });

    it('should not show investigation steps when user is not owner', () => {
      renderComponent({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
        currentUser: 'test-user',
        runningMemory: {
          executorMemoryId: 'mem-1',
          memoryContainerId: 'container-1',
          parentInteractionId: 'parent-1',
          owner: 'other-user',
        },
      });

      expect(screen.queryByText('Investigation Steps')).not.toBeInTheDocument();
    });
  });

  describe('AI Agent Information', () => {
    it('should display AI agent information text', () => {
      renderComponent();

      expect(
        screen.getByText('AI Agent continuously evaluates and ranks hypotheses based on evidence')
      ).toBeInTheDocument();
    });
  });

  describe('Phase Behavior', () => {
    it('should display correct content for each phase without errors', () => {
      // Test PLANNING phase
      const { rerender } = renderComponent({
        investigationPhase: InvestigationPhase.PLANNING,
      });
      expect(screen.getByText('Planning for your investigation...')).toBeInTheDocument();

      // Test RETRIEVING_CONTEXT phase
      const mockContext1 = createMockNotebookContext({
        investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT,
      });
      mockUseObservable.mockReturnValue(mockContext1.state.value);

      rerender(
        <OpenSearchDashboardsContextProvider services={mockServices}>
          <Router history={history}>
            <NotebookReactContext.Provider value={mockContext1}>
              <HypothesesPanel
                notebookId="test-notebook-123"
                question="What is causing the issue?"
                openReinvestigateModal={jest.fn()}
              />
            </NotebookReactContext.Provider>
          </Router>
        </OpenSearchDashboardsContextProvider>
      );
      expect(screen.getByText('Retrieving context...')).toBeInTheDocument();

      // Test GATHERING_DATA phase
      const mockContext2 = createMockNotebookContext({
        investigationPhase: InvestigationPhase.GATHERING_DATA,
      });
      mockUseObservable.mockReturnValue(mockContext2.state.value);

      rerender(
        <OpenSearchDashboardsContextProvider services={mockServices}>
          <Router history={history}>
            <NotebookReactContext.Provider value={mockContext2}>
              <HypothesesPanel
                notebookId="test-notebook-123"
                question="What is causing the issue?"
                openReinvestigateModal={jest.fn()}
              />
            </NotebookReactContext.Provider>
          </Router>
        </OpenSearchDashboardsContextProvider>
      );
      expect(screen.getByText('Gathering data in progress...')).toBeInTheDocument();
    });
  });
});
