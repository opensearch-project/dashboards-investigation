/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReinvestigateModal } from './reinvestigate_modal';
import { HypothesisStatus } from '../../../../../common/types/notebooks';

describe('ReinvestigateModal', () => {
  const mockConfirm = jest.fn();
  const mockCloseModal = jest.fn();

  const defaultProps = {
    initialGoal: 'Test goal',
    timeRange: undefined,
    dateFormat: 'MMM D, YYYY',
    confirm: mockConfirm,
    closeModal: mockCloseModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with initial goal', () => {
    render(<ReinvestigateModal {...defaultProps} />);

    expect(screen.getByText('Reinvestigate the issue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test goal')).toBeInTheDocument();
  });

  it('calls confirm with correct params when Confirm button is clicked', () => {
    render(<ReinvestigateModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Confirm'));

    expect(mockConfirm).toHaveBeenCalledWith({
      question: 'Test goal',
      updatedTimeRange: undefined,
      isReinvestigate: false,
    });
  });

  it('disables Confirm button when goal is empty', () => {
    render(<ReinvestigateModal {...defaultProps} initialGoal="" />);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('does not show warning when no hypotheses have accepted status', () => {
    const hypotheses = [
      { id: 'h1', title: 'H1', description: '', likelihood: 8, status: undefined },
    ];
    render(<ReinvestigateModal {...defaultProps} hypotheses={hypotheses as any} />);

    expect(
      screen.queryByText('Reinvestigating may result in the accepted hypothesis being lost.')
    ).not.toBeInTheDocument();
  });

  it('shows warning when a hypothesis has accepted status', () => {
    const hypotheses = [
      { id: 'h1', title: 'H1', description: '', likelihood: 8, status: HypothesisStatus.ACCEPTED },
    ];
    render(<ReinvestigateModal {...defaultProps} hypotheses={hypotheses as any} />);

    expect(
      screen.getByText('Reinvestigating may result in the accepted hypothesis being lost.')
    ).toBeInTheDocument();
  });
});
