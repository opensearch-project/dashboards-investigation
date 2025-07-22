/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import { NoteTable } from '../note_table';
import {
  httpServiceMock,
  notificationServiceMock,
} from '../../../../../../../src/core/public/mocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

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

describe('<NoteTable /> spec', () => {
  configure({ adapter: new Adapter() });

  const props = {
    deleteNotebook: jest.fn(),
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
          },
        ],
      }),
      post: jest.fn().mockResolvedValue({ body: [], saved_objects: [], data: [{}] }),
    },
    dataSourceEnabled: true,
    dataSourceManagement: {
      ui: {
        DataSourceSelector: () => <div>DataSourceSelector</div>,
      },
    } as any,
    savedObjectsMDSClient: {
      get: jest.fn().mockResolvedValue({ body: {}, saved_objects: [], data: [] }),
    } as any,
    notifications: notificationServiceMock.createStartContract(),
  };

  const renderNoteTable = async (overrides: { notebooks?: any[] } = {}) => {
    if (overrides.notebooks) {
      props.http.get.mockResolvedValue({
        body: [],
        saved_objects: [],
        data: overrides.notebooks,
      });
    }
    const utils = render(<NoteTable {...props} {...overrides} />);
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
    }));
    const { getByTestId, getAllByText, ...utils } = await renderNoteTable({ notebooks });
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
      body: JSON.stringify({ name: 'test-notebook' }),
    });
  });

  it('deletes a notebook', async () => {
    const notebooks = [
      {
        path: 'path-1',
        id: 'id-1',
        dateCreated: 'date-created',
        dateModified: 'date-modified',
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
    expect(props.deleteNotebook).toHaveBeenCalledTimes(1);
    expect(props.deleteNotebook).toHaveBeenCalledWith(['id-1'], expect.any(String));
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
});
