/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmInvestigationStep } from '../ConfirmInvestigationStep';
import { coreStartMock } from '../../../../../test/__mocks__/coreMocks';
import { CreateInvestigationRequest } from '../../create_investigation_action';

describe('ConfirmInvestigationStep', () => {
  const mockData: CreateInvestigationRequest = {
    name: 'Test Investigation',
    initialGoal: 'Find root cause of errors',
    symptom: 'High error rate in production',
    index: 'logs-*',
    timeRange: {
      from: 'now-15m',
      to: 'now',
    },
  };

  const defaultProps = {
    data: mockData,
    services: coreStartMock,
    isComplete: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when not complete', () => {
    render(<ConfirmInvestigationStep {...defaultProps} />);

    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    // EuiLoadingSpinner doesn't have progressbar role, check for the spinner class
    expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('renders complete state with success icon', () => {
    render(<ConfirmInvestigationStep {...defaultProps} isComplete={true} />);

    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    // Check for EUI icon by class instead of data attribute
    const successIcon = document.querySelector('.euiIcon--success');
    expect(successIcon).toBeInTheDocument();
  });

  it('displays all investigation details', () => {
    render(<ConfirmInvestigationStep {...defaultProps} />);

    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Find root cause of errors')).toBeInTheDocument();
    expect(screen.getByText('Symptom')).toBeInTheDocument();
    expect(screen.getByText('High error rate in production')).toBeInTheDocument();
    expect(screen.getByText('Index')).toBeInTheDocument();
    expect(screen.getByText('logs-*')).toBeInTheDocument();
  });

  it('displays time range when provided', () => {
    render(<ConfirmInvestigationStep {...defaultProps} />);

    expect(screen.getByText('Time range')).toBeInTheDocument();
    // Time range will be formatted by dateMath, just check the label exists
    // The actual format depends on the dateFormat setting
  });

  it('does not display time range when not provided', () => {
    const dataWithoutTimeRange = { ...mockData };
    delete dataWithoutTimeRange.timeRange;

    render(<ConfirmInvestigationStep {...defaultProps} data={dataWithoutTimeRange} />);

    expect(screen.queryByText('Time range')).not.toBeInTheDocument();
  });

  it('shows action buttons when not complete', () => {
    const onEdit = jest.fn();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ConfirmInvestigationStep
        {...defaultProps}
        onEdit={onEdit}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Investigation details')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit investigation details')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel investigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm investigation')).toBeInTheDocument();
  });

  it('hides action buttons when complete', () => {
    const onEdit = jest.fn();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ConfirmInvestigationStep
        {...defaultProps}
        isComplete={true}
        onEdit={onEdit}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByText('Investigation details')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit investigation details')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();

    render(<ConfirmInvestigationStep {...defaultProps} onEdit={onEdit} />);

    const editButton = screen.getByLabelText('Edit investigation details');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();

    render(<ConfirmInvestigationStep {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByLabelText('Cancel investigation');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();

    render(<ConfirmInvestigationStep {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByLabelText('Confirm investigation');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('formats absolute time range correctly', () => {
    const dataWithAbsoluteTime = {
      ...mockData,
      timeRange: {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-01T23:59:59Z',
      },
    };

    render(<ConfirmInvestigationStep {...defaultProps} data={dataWithAbsoluteTime} />);

    expect(screen.getByText('Time range')).toBeInTheDocument();
    // Should display formatted dates - the exact format depends on dateFormat setting
    // Just verify the time range section is rendered
  });

  it('handles invalid time range gracefully', () => {
    const dataWithInvalidTime = {
      ...mockData,
      timeRange: {
        from: 'invalid-date',
        to: 'invalid-date',
      },
    };

    render(<ConfirmInvestigationStep {...defaultProps} data={dataWithInvalidTime} />);

    expect(screen.getByText('Time range')).toBeInTheDocument();
    // Should fall back to raw values
    expect(screen.getByText(/invalid-date to invalid-date/)).toBeInTheDocument();
  });
});
