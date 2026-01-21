/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useReplaceAsPrimary } from './use_replace_primary_hypothesis';
import { useOpenSearchDashboards } from '../../../../src/plugins/opensearch_dashboards_react/public';
import { useNotebook } from './use_notebook';
import React from 'react';

jest.mock('../../../../src/plugins/opensearch_dashboards_react/public');
jest.mock('./use_notebook');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

describe('useReplaceAsPrimary', () => {
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();
  const mockUpdateHypotheses = jest.fn();
  const mockUpdateValue = jest.fn();

  const mockHypotheses = [
    { id: 'hyp1', title: 'Hypothesis 1', likelihood: 0.9 },
    { id: 'hyp2', title: 'Hypothesis 2', likelihood: 0.7 },
    { id: 'hyp3', title: 'Hypothesis 3', likelihood: 0.5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useOpenSearchDashboards as jest.Mock).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addDanger: mockAddDanger,
          },
        },
      },
    });

    (useNotebook as jest.Mock).mockReturnValue({
      updateHypotheses: mockUpdateHypotheses,
    });

    (React.useContext as jest.Mock).mockReturnValue({
      state: {
        value: {
          hypotheses: mockHypotheses,
        },
        updateValue: mockUpdateValue,
      },
    });
  });

  it('should reorder hypotheses and move target to first position', async () => {
    mockUpdateHypotheses.mockResolvedValue({});

    const { result } = renderHook(() => useReplaceAsPrimary());

    await act(async () => {
      await result.current.replaceAsPrimary('hyp2');
    });

    expect(mockUpdateHypotheses).toHaveBeenCalledWith({
      hypotheses: [
        { id: 'hyp2', title: 'Hypothesis 2', likelihood: 0.7 },
        { id: 'hyp1', title: 'Hypothesis 1', likelihood: 0.9 },
        { id: 'hyp3', title: 'Hypothesis 3', likelihood: 0.5 },
      ],
    });
    expect(mockUpdateValue).toHaveBeenCalledWith({ isPromoted: true });
    expect(mockAddSuccess).toHaveBeenCalled();
  });

  it('should not update if hypothesis not found', async () => {
    const { result } = renderHook(() => useReplaceAsPrimary());

    await act(async () => {
      await result.current.replaceAsPrimary('nonexistent');
    });

    expect(mockUpdateHypotheses).not.toHaveBeenCalled();
    expect(mockUpdateValue).not.toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    mockUpdateHypotheses.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useReplaceAsPrimary());

    await act(async () => {
      await result.current.replaceAsPrimary('hyp2');
    });

    expect(mockAddDanger).toHaveBeenCalled();
    expect(mockUpdateValue).not.toHaveBeenCalled();
  });
});
