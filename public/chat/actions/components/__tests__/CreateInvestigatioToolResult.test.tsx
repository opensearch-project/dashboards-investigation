/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CreateInvestigationToolResult } from '../CreateInvestigationToolResult';
import { coreStartMock } from '../../../../../test/__mocks__/coreMocks';
import {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
} from '../../create_investigation_action';
import type { ToolStatus } from '../../../../../../../src/plugins/context_provider/public';

describe('CreateInvestigationToolResult', () => {
  const mockArgs: CreateInvestigationRequest = {
    name: 'Test Investigation',
    initialGoal: 'Find root cause',
    symptom: 'High error rate',
    index: 'logs-*',
  };

  const mockResult: CreateInvestigationResponse = {
    success: true,
    notebookId: 'test-notebook-123',
    name: 'Test Investigation',
    initialGoal: 'Find root cause',
    symptom: 'High error rate',
    index: 'logs-*',
  };

  const defaultProps = {
    services: coreStartMock,
    status: 'executing' as ToolStatus,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no args and no result', () => {
    const { container } = render(<CreateInvestigationToolResult {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders confirm step when executing without confirmation', () => {
    render(<CreateInvestigationToolResult {...defaultProps} args={mockArgs} />);

    // Check for actual UI elements
    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Find root cause')).toBeInTheDocument();
  });

  it('renders confirm and creating steps when executing with confirmation', () => {
    const confirmedArgs = { ...mockArgs, confirmed: true };

    render(<CreateInvestigationToolResult {...defaultProps} args={confirmedArgs} />);

    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    expect(screen.getByText('Creating investigation')).toBeInTheDocument();
  });

  it('calls onApprove when confirm button is clicked', () => {
    const onApprove = jest.fn();

    render(
      <CreateInvestigationToolResult {...defaultProps} args={mockArgs} onApprove={onApprove} />
    );

    const confirmButton = screen.getByLabelText('Confirm investigation');
    fireEvent.click(confirmButton);

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when cancel button is clicked', () => {
    const onReject = jest.fn();

    render(<CreateInvestigationToolResult {...defaultProps} args={mockArgs} onReject={onReject} />);

    const cancelButton = screen.getByLabelText('Cancel investigation');
    fireEvent.click(cancelButton);

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('renders success state when complete', () => {
    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    expect(screen.getByText('2 tasks performed summary')).toBeInTheDocument();
    const successIcon = document.querySelector('.euiIcon--success');
    expect(successIcon).toBeInTheDocument();
  });

  it('shows collapsed view by default when complete', () => {
    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    // Check for link panel content
    expect(screen.getByText('Test Investigation')).toBeInTheDocument();
    // Confirm and creating steps should not be visible when collapsed
    expect(screen.queryByText('Investigation details')).not.toBeInTheDocument();
  });

  it('expands to show all steps when arrow is clicked', () => {
    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    const arrowIcon = document.querySelector('.euiIcon--subdued');
    expect(arrowIcon).toBeInTheDocument();

    fireEvent.click(arrowIcon!);

    // After expanding, should see the confirm step details
    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    expect(screen.getByText('Create investigation')).toBeInTheDocument();
  });

  it('collapses when arrow is clicked again', () => {
    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    const arrowIcon = document.querySelector('.euiIcon--subdued');
    fireEvent.click(arrowIcon!);

    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();

    const arrowDownIcon = document.querySelector('.euiIcon--subdued');
    fireEvent.click(arrowDownIcon!);

    // After collapsing, confirm step should not be visible
    expect(screen.queryByText('Investigation details')).not.toBeInTheDocument();
    expect(screen.getByText('Test Investigation')).toBeInTheDocument();
  });

  it('renders error state when failed', () => {
    const errorResult = {
      ...mockResult,
      success: false,
      error: 'Failed to create notebook',
    };

    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="failed"
        args={mockArgs}
        result={errorResult}
      />
    );

    expect(screen.getByText('Failed to create investigation')).toBeInTheDocument();
    expect(screen.getByText('Failed to create notebook')).toBeInTheDocument();
    const errorIcon = document.querySelector('.euiIcon--danger');
    expect(errorIcon).toBeInTheDocument();
  });

  it('renders error state without error message', () => {
    const errorResult = {
      ...mockResult,
      success: false,
    };

    render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="failed"
        args={mockArgs}
        result={errorResult}
      />
    );

    expect(screen.getByText('Failed to create investigation')).toBeInTheDocument();
    expect(screen.queryByText('Failed to create notebook')).not.toBeInTheDocument();
  });

  it('returns null for pending status', () => {
    const { container } = render(
      <CreateInvestigationToolResult {...defaultProps} status="pending" args={mockArgs} />
    );

    expect(container.firstChild).toBeNull();
  });
});
