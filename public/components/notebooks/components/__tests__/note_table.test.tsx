/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { NoteTable } from '../note_table';
import {
  applicationServiceMock,
  chromeServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '../../../../../../../src/core/public/mocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({
    pathname: '/notebooks',
    search: '',
    hash: '',
    state: null,
    key: '',
  }),
  useHistory: jest.fn(),
}));

jest.mock('../../../../../public/services', () => ({
  getDataSourceManagementSetup: jest.fn(() => ({
    dataSourceManagement: {
      ui: {
        DataSourceSelector: () => <div>DataSourceSelector</div>,
      },
    },
  })),
}));

describe('<NoteTable /> spec', () => {
  const applicationMock = applicationServiceMock.createStartContract();

  const props = {
    http: {
      ...httpServiceMock.createStartContract(),
      get: jest.fn().mockResolvedValue({
        body: [],
        saved_objects: [],
        data: [
          {
            path: 'path-1',
            id: 'id-1',
            dateCreated: '2023-01-01 12:00:00',
            dateModified: '2023-01-01 12:00:00',
            NotebookType: 'Agentic',
          },
        ],
      }),
      post: jest.fn().mockResolvedValue({ body: [], saved_objects: [], data: [{}] }),
    },
    dataSource: {},
    savedObjects: {
      get: jest.fn().mockResolvedValue({ body: {}, saved_objects: [], data: [] }),
    } as any,
    notifications: notificationServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    application: {
      ...applicationMock,
      capabilities: {
        ...applicationMock.capabilities,
        investigation: {
          ...applicationMock.capabilities.investigation,
          agenticFeaturesEnabled: true,
        },
      },
    },
  };

  const deleteNotebook = jest.fn();

  const renderNoteTable = async (overrides: { notebooks?: any[] } = {}) => {
    if (overrides.notebooks) {
      props.http.get.mockResolvedValue({
        body: [],
        saved_objects: [],
        data: overrides.notebooks,
      });
    }
    const utils = render(
      <OpenSearchDashboardsContextProvider services={{ ...props, ...overrides }}>
        <NoteTable deleteNotebook={deleteNotebook} />
      </OpenSearchDashboardsContextProvider>
    );
    // Wait for the initial fetch to complete
    await waitFor(() => {
      expect(props.http.get).toHaveBeenCalledWith(`${NOTEBOOKS_API_PREFIX}/savedNotebook`);
    });
    return utils;
  };

  afterEach(() => {
    cleanup(); // Cleanup the rendered component after each test
  });

  it('renders the empty component', async () => {
    const utils = await renderNoteTable({ notebooks: [] });
    expect(utils.container.firstChild).toMatchSnapshot();
  });

  it('renders the component', async () => {
    const notebooks = Array.from({ length: 5 }, (v, k) => ({
      path: `path-${k}`,
      id: `id-${k}`,
      dateCreated: '2023-01-01 12:00:00',
      dateModified: '2023-01-02 12:00:00',
      NotebookType: 'Agentic',
    }));
    const { getByTestId, getAllByText, ...utils } = await renderNoteTable({ notebooks });
    await waitFor(() => {
      expect(utils.container.querySelectorAll('.euiTableRow').length).toEqual(5);
    });
    await utils.findByText(/This table contains /);
    expect(utils.container.firstChild).toMatchSnapshot();
    fireEvent.click(utils.getByText('Add sample notebooks'));
    fireEvent.click(utils.getAllByLabelText('Select this row')[0]);
    fireEvent.click(getByTestId('deleteSelectedNotebooks'));
    expect(getAllByText('Delete 1 notebook')).toHaveLength(2);
    fireEvent.click(utils.getByText('Cancel'));
    fireEvent.click(utils.getAllByLabelText('Select this row')[0]);
  });

  it('create notebook modal', async () => {
    const notebooks = Array.from({ length: 5 }, (v, k) => ({
      path: `path-${k}`,
      id: `id-${k}`,
      dateCreated: 'date-created',
      dateModified: 'date-modified',
      NotebookType: 'Agentic',
    }));
    const utils = await renderNoteTable({ notebooks });
    fireEvent.click(utils.getByText('Create notebook'));
    await waitFor(() => {
      expect(global.window.location.href).toContain('/create');
    });
  });

  it('filters notebooks based on search input', async () => {
    const { getByPlaceholderText, getAllByText, queryByText } = await renderNoteTable({
      notebooks: [
        {
          path: 'path-1',
          id: 'id-1',
          dateCreated: 'date-created',
          dateModified: 'date-modified',
          NotebookType: 'Agentic',
        },
      ],
    });

    const searchInput = getByPlaceholderText('Search notebook name');
    fireEvent.change(searchInput, { target: { value: 'path-1' } });

    // Assert that only the matching notebook is displayed
    expect(getAllByText('path-1')).toHaveLength(1);
    expect(queryByText('path-0')).toBeNull();
    expect(queryByText('path-2')).toBeNull();
  });

  it('displays empty state message and create notebook button', async () => {
    const { getAllByText, getAllByTestId } = await renderNoteTable({ notebooks: [] });

    expect(getAllByText('No notebooks')).toHaveLength(1);

    // Create notebook using the modal
    fireEvent.click(getAllByText('Create notebook')[0]);
    fireEvent.click(getAllByTestId('custom-input-modal-input')[0]);
    fireEvent.input(getAllByTestId('custom-input-modal-input')[0], {
      target: { value: 'test-notebook' },
    });
    fireEvent.click(getAllByText('Create')[0]);
    expect(props.http.post).toHaveBeenCalledWith(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook`, {
      body: JSON.stringify({ name: 'test-notebook', context: { notebookType: 'Classic' } }),
    });
  });

  it('deletes a notebook', async () => {
    const notebooks = [
      {
        path: 'path-1',
        id: 'id-1',
        dateCreated: 'date-created',
        dateModified: 'date-modified',
        NotebookType: 'Agentic',
      },
    ];
    const { getByLabelText, getAllByText, getByTestId } = await renderNoteTable({ notebooks });

    // Select a notebook
    fireEvent.click(getByLabelText('Select this row'));

    // Click the delete button
    fireEvent.click(getByTestId('deleteSelectedNotebooks'));

    // Ensure the modal is open (you may need to adjust based on your modal implementation)
    expect(getAllByText('Delete 1 notebook')).toHaveLength(2);

    // Mock user confirmation and submit
    fireEvent.input(getByTestId('delete-notebook-modal-input'), {
      target: { value: 'delete' },
    });
    fireEvent.click(getByTestId('delete-notebook-modal-delete-button'));

    // Assert that the deleteNotebook function is called
    expect(deleteNotebook).toHaveBeenCalledTimes(1);
    expect(deleteNotebook).toHaveBeenCalledWith(['id-1']);
  });

  it('adds sample notebooks', async () => {
    const { getAllByText, getByTestId } = await renderNoteTable({ notebooks: [] });

    // Add samples
    fireEvent.click(getAllByText('Add sample notebooks')[0]);

    // Ensure the modal is open (you may need to adjust based on your modal implementation)
    expect(getAllByText('Add sample notebooks')).toHaveLength(3);

    // Mock user confirmation and submit
    fireEvent.click(getByTestId('confirmModalConfirmButton'));

    // Assert that the addSampleNotebooks function is called
    expect(props.http.get).toHaveBeenCalledWith(
      '../api/saved_objects/_find',
      expect.objectContaining({
        query: expect.objectContaining({
          type: 'index-pattern',
          search_fields: 'title',
          search: 'opensearch_dashboards_sample_data_flights',
        }),
      })
    );
  });

  it('closes the delete modal', async () => {
    const notebooks = [
      {
        path: 'path-1',
        id: 'id-1',
        dateCreated: 'date-created',
        dateModified: 'date-modified',
        NotebookType: 'Agentic',
      },
    ];
    const { getByText, getByLabelText, getAllByText, getByTestId } = await renderNoteTable({
      notebooks,
    });

    // Select a notebook
    fireEvent.click(getByLabelText('Select this row'));

    // Click the delete button
    fireEvent.click(getByTestId('deleteSelectedNotebooks'));

    // Ensure the modal is open
    expect(getAllByText('Delete 1 notebook')).toHaveLength(2);

    // Close the delete modal
    fireEvent.click(getByText('Cancel'));

    // Ensure the delete modal is closed
    expect(getAllByText('Delete 1 notebook')).toHaveLength(1);
  });

  it('handles pagination correctly with more than 10 notebooks', async () => {
    // Create 25 notebooks to test pagination
    const notebooks = Array.from({ length: 25 }, (v, k) => ({
      path: `notebook-${k}`,
      id: `id-${k}`,
      dateCreated: '2023-01-01 12:00:00',
      dateModified: '2023-01-02 12:00:00',
      NotebookType: 'Classic',
    }));

    const utils = await renderNoteTable({ notebooks });

    await waitFor(() => {
      // Should display 10 rows on first page (default page size)
      expect(utils.container.querySelectorAll('.euiTableRow').length).toBe(10);
    });

    // Verify first notebook is visible on page 1
    expect(utils.queryByText('notebook-0')).toBeInTheDocument();

    // Find and click the next page button
    const nextButton = utils.container.querySelector('[data-test-subj="pagination-button-next"]');
    if (nextButton) {
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should still display 10 rows on second page
        expect(utils.container.querySelectorAll('.euiTableRow').length).toBe(10);
      });

      // Verify we're on a different page - first notebook should not be visible
      expect(utils.queryByText('notebook-0')).not.toBeInTheDocument();
    }
  });

  it('resets pagination when search query changes', async () => {
    // Create 25 notebooks to test pagination reset
    const notebooks = Array.from({ length: 25 }, (v, k) => ({
      path: `notebook-${k}`,
      id: `id-${k}`,
      dateCreated: '2023-01-01 12:00:00',
      dateModified: '2023-01-02 12:00:00',
      NotebookType: 'Classic',
    }));

    const { container, getByPlaceholderText } = await renderNoteTable({ notebooks });

    // Navigate to page 2
    const nextButton = container.querySelector('[data-test-subj="pagination-button-next"]');
    if (nextButton) {
      fireEvent.click(nextButton);
      await waitFor(() => {
        expect(container.querySelectorAll('.euiTableRow').length).toBe(10);
      });
    }

    // Change search query
    const searchInput = getByPlaceholderText('Search notebook name');
    fireEvent.change(searchInput, { target: { value: 'notebook-1' } });

    // Should reset to page 1 and show filtered results
    await waitFor(() => {
      const rows = container.querySelectorAll('.euiTableRow');
      // Should show notebooks matching 'notebook-1' pattern (1, 10-19)
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
