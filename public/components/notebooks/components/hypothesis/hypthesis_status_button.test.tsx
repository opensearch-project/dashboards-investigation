/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HypothesisStatusButton } from './hypthesis_status_button';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useNotebook } from '../../../../hooks/use_notebook';

jest.mock('react-use', () => ({
  useObservable: (observable$: any, initialValue: any) => initialValue,
}));

jest.mock('../../../../hooks/use_notebook');
jest.mock('../../../../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  useOpenSearchDashboards: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
    },
  }),
}));

const mockUpdateHypotheses = jest.fn();
const mockUpdateValue = jest.fn();

const createMockContext = (hypotheses: any[]) => ({
  state: {
    getValue$: jest.fn(),
    value: { hypotheses },
    updateValue: mockUpdateValue,
  },
});

describe('HypothesisStatusButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNotebook as jest.Mock).mockReturnValue({
      updateHypotheses: mockUpdateHypotheses,
    });
    mockUpdateHypotheses.mockResolvedValue({});
  });

  it('renders rule out button for active hypothesis', () => {
    const mockContext = createMockContext([{ id: 'h1', status: undefined, likelihood: 8 }]);
    render(
      <NotebookReactContext.Provider value={mockContext as any}>
        <HypothesisStatusButton hypothesisId="h1" hypothesisStatus={undefined} />
      </NotebookReactContext.Provider>
    );

    expect(screen.getByText('Rule out')).toBeInTheDocument();
  });

  it('renders rule in button for ruled out hypothesis', () => {
    const mockContext = createMockContext([{ id: 'h1', status: 'RULED_OUT', likelihood: 8 }]);
    render(
      <NotebookReactContext.Provider value={mockContext as any}>
        <HypothesisStatusButton hypothesisId="h1" hypothesisStatus="RULED_OUT" />
      </NotebookReactContext.Provider>
    );

    expect(screen.getByText('Rule in')).toBeInTheDocument();
  });

  it('reorders hypotheses when ruling out', async () => {
    const hypotheses = [
      { id: 'h1', status: undefined, likelihood: 8 },
      { id: 'h2', status: undefined, likelihood: 9 },
      { id: 'h3', status: undefined, likelihood: 7 },
    ];
    const mockContext = createMockContext(hypotheses);

    render(
      <NotebookReactContext.Provider value={mockContext as any}>
        <HypothesisStatusButton hypothesisId="h1" hypothesisStatus={undefined} />
      </NotebookReactContext.Provider>
    );

    fireEvent.click(screen.getByText('Rule out'));

    await waitFor(() => {
      expect(mockUpdateValue).toHaveBeenCalledWith(
        expect.objectContaining({
          hypotheses: expect.arrayContaining([
            expect.objectContaining({ id: 'h2', likelihood: 9 }),
            expect.objectContaining({ id: 'h3', likelihood: 7 }),
            expect.objectContaining({ id: 'h1', status: 'RULED_OUT' }),
          ]),
        })
      );
    });
  });

  it('promotes highest likelihood hypothesis to first when ruling out', async () => {
    const hypotheses = [
      { id: 'h1', status: undefined, likelihood: 5 },
      { id: 'h2', status: undefined, likelihood: 9 },
      { id: 'h3', status: undefined, likelihood: 7 },
    ];
    const mockContext = createMockContext(hypotheses);

    render(
      <NotebookReactContext.Provider value={mockContext as any}>
        <HypothesisStatusButton hypothesisId="h1" hypothesisStatus={undefined} />
      </NotebookReactContext.Provider>
    );

    fireEvent.click(screen.getByText('Rule out'));

    await waitFor(() => {
      const call = mockUpdateValue.mock.calls[0][0];
      expect(call.hypotheses[0].id).toBe('h2');
      expect(call.hypotheses[0].likelihood).toBe(9);
    });
  });

  it('keeps order when ruling in', async () => {
    const hypotheses = [
      { id: 'h1', status: 'RULED_OUT', likelihood: 8 },
      { id: 'h2', status: undefined, likelihood: 9 },
    ];
    const mockContext = createMockContext(hypotheses);

    render(
      <NotebookReactContext.Provider value={mockContext as any}>
        <HypothesisStatusButton hypothesisId="h1" hypothesisStatus="RULED_OUT" />
      </NotebookReactContext.Provider>
    );

    fireEvent.click(screen.getByText('Rule in'));

    await waitFor(() => {
      expect(mockUpdateHypotheses).toHaveBeenCalledWith({
        hypotheses: [
          { id: 'h1', status: '', likelihood: 8 },
          { id: 'h2', status: undefined, likelihood: 9 },
        ],
      });
    });
  });
});
