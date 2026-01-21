/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { StartInvestigationModal } from '../start_investigation_modal';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '../../../../../../../../src/core/public/mocks';
import {
  DEFAULT_INVESTIGATION_NAME,
  NOTEBOOKS_API_PREFIX,
} from '../../../../../../common/constants/notebooks';

describe('<StartInvestigationModal /> spec', () => {
  const httpMock = httpServiceMock.createStartContract();
  const applicationMock = applicationServiceMock.createStartContract();
  const notificationsMock = notificationServiceMock.createStartContract();

  const mockDataService = {
    query: {
      queryString: {
        getQuery: jest.fn().mockReturnValue({
          query: 'source=test',
          dataset: {
            dataSource: { id: 'test-datasource-id' },
            title: 'test-index',
            timeFieldName: '@timestamp',
          },
        }),
        getInitialQuery: jest.fn().mockReturnValue({
          query: 'source=test',
        }),
      },
      timefilter: {
        timefilter: {
          getBounds: jest.fn().mockReturnValue({
            min: { unix: () => 1000 },
            max: { unix: () => 2000 },
          }),
        },
      },
      filterManager: {
        getFilters: jest.fn().mockReturnValue([]),
      },
    },
  };

  const mockServices = {
    http: httpMock,
    application: applicationMock,
    notifications: notificationsMock,
    data: mockDataService,
  };

  const closeModalMock = jest.fn();

  const renderModal = (props = {}) => {
    const defaultProps = {
      onProvideNotebookParameters: jest.fn().mockImplementation(async (params) => {
        // Mock the parameter provider to return enhanced parameters
        return {
          ...params,
          context: {
            ...params.context,
            timeRange: { selectionFrom: 1000, selectionTo: 2000 },
            variables: { pplQuery: 'source=test' },
          },
        };
      }),
      ...props,
    };

    return render(
      <OpenSearchDashboardsContextProvider services={mockServices}>
        <StartInvestigationModal closeModal={closeModalMock} {...defaultProps} />
      </OpenSearchDashboardsContextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the modal with all elements', () => {
    renderModal();

    expect(screen.getByText('Start investigation')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Describe the issue you want to investigate.')
    ).toBeInTheDocument();
    expect(screen.getByText('Suggested:')).toBeInTheDocument();
    expect(screen.getByText('Root cause analytics')).toBeInTheDocument();
    expect(screen.getByText('Performance issues')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Start Investigation')).toBeInTheDocument();
  });

  it('updates text area value when user types', () => {
    renderModal();

    const textArea = screen.getByPlaceholderText(
      'Describe the issue you want to investigate.'
    ) as HTMLTextAreaElement;

    fireEvent.change(textArea, { target: { value: 'Test investigation goal' } });

    expect(textArea.value).toBe('Test investigation goal');
  });

  it('populates text area when suggested action button is clicked', () => {
    renderModal();

    const textArea = screen.getByPlaceholderText(
      'Describe the issue you want to investigate.'
    ) as HTMLTextAreaElement;
    const rootCauseButton = screen.getByText('Root cause analytics');

    fireEvent.click(rootCauseButton);

    expect(textArea.value).toBe('Analyze anomaly and root cause in this dataset.');

    const performanceButton = screen.getByText('Performance issues');
    fireEvent.click(performanceButton);

    expect(textArea.value).toBe('Why these request take time?');
  });

  it('creates notebook and navigates when Start Investigation is clicked', async () => {
    const mockNotebookId = 'test-notebook-id-123';
    httpMock.post.mockResolvedValue(mockNotebookId);

    renderModal();

    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Find performance issues' } });

    const startButton = screen.getByText('Start Investigation');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalledWith(
        `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_INVESTIGATION_NAME),
        })
      );
    });

    expect(applicationMock.navigateToApp).toHaveBeenCalledWith('investigation-notebooks', {
      path: `#/agentic/${mockNotebookId}`,
    });

    expect(closeModalMock).toHaveBeenCalled();
  });

  it('displays log data when log prop is provided', () => {
    const mockLog = {
      '@timestamp': '2023-01-01T12:00:00Z',
      message: 'Test log message',
      level: 'ERROR',
    };

    const additionalContent = (
      <div>
        <div>You selected:</div>
        <pre>{JSON.stringify(mockLog, null, 2)}</pre>
      </div>
    );

    renderModal({ log: mockLog, additionalContent });

    expect(screen.getByText('You selected:')).toBeInTheDocument();
    // Check for individual log properties instead of the entire JSON string
    expect(screen.getByText(/"@timestamp"/)).toBeInTheDocument();
    expect(screen.getByText(/"2023-01-01T12:00:00Z"/)).toBeInTheDocument();
    expect(screen.getByText(/"Test log message"/)).toBeInTheDocument();
  });

  it('calls closeModal when Cancel button is clicked', () => {
    renderModal();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(closeModalMock).toHaveBeenCalled();
  });

  it('handles error when notebook creation fails', async () => {
    const errorMessage = 'Failed to create notebook';
    httpMock.post.mockRejectedValue(new Error(errorMessage));

    renderModal();

    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Test goal' } });

    const startButton = screen.getByText('Start Investigation');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(notificationsMock.toasts.addDanger).toHaveBeenCalledWith(
        'Unable to start investigation'
      );
    });

    expect(applicationMock.navigateToApp).not.toHaveBeenCalled();
  });

  it('disables button while creating notebook', async () => {
    httpMock.post.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('test-id'), 100))
    );

    renderModal();

    const startButton = screen
      .getByText('Start Investigation')
      .closest('button') as HTMLButtonElement;
    fireEvent.click(startButton);

    // Button should be disabled during the API call
    await waitFor(() => {
      expect(startButton).toBeDisabled();
    });
  });

  it('triggers investigation on Enter key press', async () => {
    const mockNotebookId = 'test-notebook-id-456';
    httpMock.post.mockResolvedValue(mockNotebookId);

    renderModal();

    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Enter key test' } });
    fireEvent.keyUp(textArea, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalled();
    });

    expect(applicationMock.navigateToApp).toHaveBeenCalledWith('investigation-notebooks', {
      path: `#/agentic/${mockNotebookId}`,
    });
  });

  it('includes log data in notebook context when log prop is provided', async () => {
    const mockLog = {
      '@timestamp': '2023-01-01T12:00:00Z',
      message: 'Test log',
    };
    const mockNotebookId = 'test-id-with-log';
    httpMock.post.mockResolvedValue(mockNotebookId);

    const mockOnProvideNotebookParameters = jest.fn().mockImplementation(async (params) => {
      return {
        ...params,
        context: {
          ...params.context,
          variables: { log: mockLog },
        },
      };
    });

    renderModal({
      log: mockLog,
      onProvideNotebookParameters: mockOnProvideNotebookParameters,
    });

    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Investigate this log' } });

    const startButton = screen.getByText('Start Investigation');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalled();
    });

    expect(mockOnProvideNotebookParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          initialGoal: 'Investigate this log',
        }),
      })
    );
  });

  it('includes time range and query in notebook context when log is not provided', async () => {
    const mockNotebookId = 'test-id-without-log';
    httpMock.post.mockResolvedValue(mockNotebookId);

    const mockOnProvideNotebookParameters = jest.fn().mockImplementation(async (params) => {
      return {
        ...params,
        context: {
          ...params.context,
          timeRange: { selectionFrom: 1000, selectionTo: 2000 },
          variables: { pplQuery: 'source=test' },
        },
      };
    });

    renderModal({ onProvideNotebookParameters: mockOnProvideNotebookParameters });

    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Test without log' } });

    const startButton = screen.getByText('Start Investigation');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalled();
    });

    // Verify the onProvideNotebookParameters was called with the correct parameters
    expect(mockOnProvideNotebookParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          initialGoal: 'Test without log',
        }),
      })
    );

    // Verify the POST call includes the enhanced parameters
    expect(httpMock.post).toHaveBeenCalledWith(
      `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
      expect.objectContaining({
        body: expect.stringContaining('timeRange'),
      })
    );

    expect(httpMock.post).toHaveBeenCalledWith(
      `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
      expect.objectContaining({
        body: expect.stringContaining('variables'),
      })
    );
  });

  it('disables Start Investigation button when input is empty', () => {
    renderModal();

    const startButton = screen
      .getByText('Start Investigation')
      .closest('button') as HTMLButtonElement;

    // Button should be disabled initially when input is empty
    expect(startButton).toBeDisabled();

    // Type some text
    const textArea = screen.getByPlaceholderText('Describe the issue you want to investigate.');
    fireEvent.change(textArea, { target: { value: 'Test investigation' } });

    // Button should be enabled with valid input
    expect(startButton).not.toBeDisabled();

    // Clear the input
    fireEvent.change(textArea, { target: { value: '' } });

    // Button should be disabled again when input is empty
    expect(startButton).toBeDisabled();

    // Type only whitespace
    fireEvent.change(textArea, { target: { value: '   ' } });

    // Button should remain disabled with only whitespace
    expect(startButton).toBeDisabled();
  });
});
