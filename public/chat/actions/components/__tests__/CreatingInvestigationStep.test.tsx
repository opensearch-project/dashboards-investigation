/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CreatingInvestigationStep } from '../CreatingInvestigationStep';
import { coreStartMock } from '../../../../../test/__mocks__/coreMocks';
import { CreateInvestigationResponse } from '../../create_investigation_action';

describe('CreatingInvestigationStep', () => {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when not complete', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={false} />);

    expect(screen.getByText('Creating investigation')).toBeInTheDocument();
    expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('renders complete state with success icon', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={true} result={mockResult} />);

    expect(screen.getByText('Create investigation')).toBeInTheDocument();
    const successIcon = document.querySelector('.euiIcon--success');
    expect(successIcon).toBeInTheDocument();
  });

  it('shows loading content when not complete', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={false} />);

    // EuiLoadingContent renders multiple loading lines
    const loadingContent = document.querySelector('.euiLoadingContent');
    expect(loadingContent).toBeInTheDocument();
  });

  it('shows investigation link panel when complete with result', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={true} result={mockResult} />);

    // The mocked component renders the name as text
    expect(screen.getByText('Test Investigation')).toBeInTheDocument();
  });

  it('does not show investigation link panel when not complete', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={false} result={mockResult} />);

    expect(screen.queryByTestId('investigation-link-panel')).not.toBeInTheDocument();
  });

  it('does not show investigation link panel when complete without result', () => {
    render(<CreatingInvestigationStep {...defaultProps} isComplete={true} />);

    expect(screen.queryByTestId('investigation-link-panel')).not.toBeInTheDocument();
  });

  it('changes text from "Creating" to "Create" when complete', () => {
    const { rerender } = render(<CreatingInvestigationStep {...defaultProps} isComplete={false} />);

    expect(screen.getByText('Creating investigation')).toBeInTheDocument();
    expect(screen.queryByText('Create investigation')).not.toBeInTheDocument();

    rerender(<CreatingInvestigationStep {...defaultProps} isComplete={true} result={mockResult} />);

    expect(screen.getByText('Create investigation')).toBeInTheDocument();
    expect(screen.queryByText('Creating investigation')).not.toBeInTheDocument();
  });
});
