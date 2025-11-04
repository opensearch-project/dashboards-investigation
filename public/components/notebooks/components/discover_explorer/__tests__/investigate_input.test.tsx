/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { InvestigateInput } from '../investigate_input';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NOTEBOOKS_API_PREFIX } from '../../../../../../common/constants/notebooks';

describe('InvestigateInput', () => {
  const mockNavigateToApp = jest.fn();
  const mockHttpPost = jest.fn();
  const mockGetQuery = jest.fn();
  const mockGetBounds = jest.fn();
  const mockGetFilters = jest.fn();

  const defaultServices = {
    data: {
      query: {
        queryString: {
          getQuery: mockGetQuery,
        },
        timefilter: {
          timefilter: {
            getBounds: mockGetBounds,
          },
        },
        filterManager: {
          getFilters: mockGetFilters,
        },
      },
    },
    http: {
      post: mockHttpPost,
    },
    application: {
      navigateToApp: mockNavigateToApp,
    },
  };

  const defaultQueryResponse = {
    query: 'source=test',
    dataset: {
      dataSource: { id: 'test-datasource-id' },
      timeFieldName: 'timestamp',
      title: 'test-index',
    },
  };

  const defaultBoundsResponse = {
    min: { unix: () => 1609459200 }, // 2021-01-01 00:00:00
    max: { unix: () => 1609545600 }, // 2021-01-02 00:00:00
  };

  const defaultFilters = [{ meta: { key: 'field1', value: 'value1' } }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQuery.mockReturnValue(defaultQueryResponse);
    mockGetBounds.mockReturnValue(defaultBoundsResponse);
    mockGetFilters.mockReturnValue(defaultFilters);
    mockHttpPost.mockResolvedValue('test-notebook-id');
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (props = {}) => {
    return render(
      <OpenSearchDashboardsContextProvider services={defaultServices}>
        <InvestigateInput {...props} />
      </OpenSearchDashboardsContextProvider>
    );
  };

  it('renders input field and search button', () => {
    const { getByPlaceholderText, getByLabelText } = renderComponent();

    expect(
      getByPlaceholderText('Ask about potential privilege escalation attack')
    ).toBeInTheDocument();
    expect(getByLabelText('Investigate')).toBeInTheDocument();
  });

  it('updates input value on change', () => {
    const { getByPlaceholderText } = renderComponent();
    const input = getByPlaceholderText(
      'Ask about potential privilege escalation attack'
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'test investigation query' } });
    expect(input.value).toBe('test investigation query');
  });

  it('creates notebook with correct parameters on button click', async () => {
    const { getByPlaceholderText, getByLabelText } = renderComponent();
    const input = getByPlaceholderText('Ask about potential privilege escalation attack');

    fireEvent.change(input, { target: { value: 'test goal' } });
    fireEvent.click(getByLabelText('Investigate'));

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith(
        `${NOTEBOOKS_API_PREFIX}/note/savedNotebook`,
        expect.objectContaining({
          body: expect.stringContaining('test goal'),
        })
      );
    });

    const callArgs = mockHttpPost.mock.calls[0];
    const bodyContent = JSON.parse(callArgs[1].body);

    expect(bodyContent).toMatchObject({
      name: 'Discover investigation',
      context: {
        dataSourceId: 'test-datasource-id',
        source: 'Discover',
        notebookType: 'Agentic',
        initialGoal: 'test goal',
      },
    });
  });

  it('handles Enter key press to create notebook', async () => {
    const { getByPlaceholderText } = renderComponent();
    const input = getByPlaceholderText('Ask about potential privilege escalation attack');

    fireEvent.change(input, { target: { value: 'enter key test' } });
    fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to notebook after successful creation and includes log when provided', async () => {
    const testLog = { field1: 'value1', field2: 'value2' };
    mockHttpPost.mockResolvedValue('new-notebook-id');

    const { getByLabelText } = renderComponent({ log: testLog });
    fireEvent.click(getByLabelText('Investigate'));

    await waitFor(() => {
      expect(mockNavigateToApp).toHaveBeenCalledWith('investigation-notebooks', {
        path: '#/agentic/new-notebook-id',
      });
    });

    const callArgs = mockHttpPost.mock.calls[0];
    const bodyContent = JSON.parse(callArgs[1].body);
    expect(bodyContent.context.log).toEqual(testLog);
  });
});
