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

    // Check that accordion is collapsed
    const accordionButton = document.querySelector('.euiAccordion__button');
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');

    // Check for link panel with URL (visible when collapsed)
    expect(
      screen.getByText(/http:\/\/localhost\/app\/investigation-notebooks/)
    ).toBeInTheDocument();
  });

  it('expands to show all steps when accordion button is clicked', () => {
    const { container } = render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    // Find the accordion button by its class
    const accordionButton = container.querySelector('.euiAccordion__button');
    expect(accordionButton).toBeInTheDocument();

    fireEvent.click(accordionButton!);

    // Check accordion is expanded
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

    // After expanding, should see the confirm step details
    expect(screen.getByText('Confirm investigation details')).toBeInTheDocument();
    expect(screen.getByText('Create investigation')).toBeInTheDocument();

    // Link panel with URL should be hidden when expanded
    expect(
      container.querySelector('.euiPanel .euiLink[href*="investigation-notebooks"]')
    ).not.toBeInTheDocument();
  });

  it('collapses when accordion button is clicked again', () => {
    const { container } = render(
      <CreateInvestigationToolResult
        {...defaultProps}
        status="complete"
        args={mockArgs}
        result={mockResult}
      />
    );

    const accordionButton = container.querySelector('.euiAccordion__button');

    // Expand the accordion
    fireEvent.click(accordionButton!);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

    // Collapse the accordion
    fireEvent.click(accordionButton!);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');

    // Link panel with URL should be visible again when collapsed
    expect(
      screen.getByText(/http:\/\/localhost\/app\/investigation-notebooks/)
    ).toBeInTheDocument();
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
