/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import { HttpResponse } from '../../../../../../../src/core/public';
import { getOSDHttp } from '../../../../../common/utils';
import {
  addQueryResponse,
  clearOutputNotebook,
  codeBlockNotebook,
  codePlaceholderText,
  emptyNotebook,
  migrateBlockNotebook,
  notebookPutResponse,
  runCodeBlockResponse,
} from '../../../../../test/notebooks_constants';
import { Notebook, NotebookProps } from '../notebook';
import {
  chromeServiceMock,
  notificationServiceMock,
  savedObjectsServiceMock,
} from '../../../../../../../src/core/public/mocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

jest.mock('../../../../../../../src/plugins/embeddable/public', () => ({
  ViewMode: {
    EDIT: 'edit',
    VIEW: 'view',
  },
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({
    pathname: '/notebooks',
    search: '',
    hash: '',
    state: null,
    key: '',
  }),
  useHistory: jest.fn().mockReturnValue({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../data_distribution/data_distribution_container', () => ({
  DataDistributionContainer: () => <div />,
}));

jest.mock('../alert_panel', () => ({
  AlertPanel: () => <div />,
}));

jest.mock('../input_panel.tsx', () => ({
  InputPanel: () => <div />,
}));

// @ts-ignore
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        status: {
          statuses: [{ id: 'plugin:reportsDashboards' }],
        },
      }),
  })
);

const mockBehaviorSubject = jest.fn().mockImplementation(() => ({
  getValue: jest.fn(),
  subscribe: jest.fn(),
  next: jest.fn(),
}));

jest.mock('../../../../../public/services', () => ({
  getDataSourceManagementSetup: jest.fn(() => ({
    dataSourceManagement: {
      ui: {
        DataSourceSelector: () => <div />,
        getDataSourceMenu: jest.fn(),
      },
      registerAuthenticationMethod: jest.fn(),
      dataSourceSelection: {
        selectedDataSource$: new mockBehaviorSubject(),
        removedComponentIds: [],
        selectDataSource: jest.fn(),
        remove: jest.fn(),
        getSelectionValue: jest.fn(),
        getSelection$: () => new mockBehaviorSubject(),
      },
      getDefaultDataSourceId: jest.fn(),
      getDefaultDataSourceId$: jest.fn(() => new mockBehaviorSubject()),
    },
  })),
}));

const ContextAwareNotebook = (props: NotebookProps & { dataSourceEnabled?: boolean }) => {
  return (
    <OpenSearchDashboardsContextProvider
      services={{
        http: getOSDHttp(),
        dashboard: {
          DashboardContainerByValueRenderer: jest.fn(),
        },
        dataSource: props.dataSourceEnabled ? {} : undefined,
        chrome: chromeServiceMock.createStartContract(),
        savedObjects: savedObjectsServiceMock.createStartContract(),
        notifications: notificationServiceMock.createStartContract(),
      }}
    >
      <Notebook {...props} />
    </OpenSearchDashboardsContextProvider>
  );
};

describe('<Notebook /> spec', () => {
  configure({ adapter: new Adapter() });
  const httpClient = getOSDHttp();
  const location = jest.fn() as any;
  location.search = '';
  const history = jest.fn() as any;
  history.replace = jest.fn();
  history.push = jest.fn();
  const defaultProps: NotebookProps = {
    openedNoteId: '458e1320-3f05-11ef-bd29-e58626f102c0',
  };

  it('Renders the empty component', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });
    expect(utils.container.firstChild).toMatchSnapshot();
  });

  it('Adds a query', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    let postFlag = 1;
    httpClient.post = jest.fn(() => {
      if (postFlag === 1) {
        postFlag += 1;
        return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
      } else return Promise.resolve((runCodeBlockResponse as unknown) as HttpResponse);
    });
    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      utils.getByText('Add query').click();
    });

    await waitFor(() => {
      expect(utils.getByPlaceholderText(codePlaceholderText)).toBeInTheDocument();
    });
  });

  it('runs a query and checks the output', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    let postFlag = 1;
    httpClient.post = jest.fn(() => {
      if (postFlag === 1) {
        postFlag += 1;
        return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
      } else return Promise.resolve((runCodeBlockResponse as unknown) as HttpResponse);
    });
    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      utils.getByText('Add query').click();
    });

    await waitFor(() => {
      expect(utils.getByPlaceholderText(codePlaceholderText)).toBeInTheDocument();
    });

    act(() => {
      fireEvent.input(utils.getByPlaceholderText(codePlaceholderText), {
        target: { value: '%md \\n hello' },
      });
    });

    act(() => {
      // wait sometime to rerender
    });

    act(() => {
      fireEvent.click(utils.getByText('Run'));
    });

    await waitFor(() => {
      expect(utils.getByText('hello')).toBeInTheDocument();
    });
  });

  it('Checks notebook rename action', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));

    httpClient.put = jest.fn(() => {
      return Promise.resolve((notebookPutResponse as unknown) as HttpResponse);
    });

    httpClient.post = jest.fn(() => {
      return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
    });

    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('notebook-edit-icon'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('custom-input-modal-input')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.input(utils.getByTestId('custom-input-modal-input'), {
        target: { value: 'test-notebook-newname' },
      });
      fireEvent.click(utils.getByTestId('custom-input-modal-confirm-button'));
    });

    await waitFor(() => {
      expect(httpClient.put).toHaveBeenCalledWith(
        `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/rename`,
        {
          body: JSON.stringify({
            name: 'sample-notebook-1',
            noteId: '458e1320-3f05-11ef-bd29-e58626f102c0',
          }),
        }
      );
    });
  });

  it('Checks notebook clone action', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));

    httpClient.put = jest.fn(() => {
      return Promise.resolve((notebookPutResponse as unknown) as HttpResponse);
    });

    httpClient.post = jest.fn(() => {
      return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
    });

    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('notebook-duplicate-icon'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('custom-input-modal-input')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('custom-input-modal-confirm-button'));
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/clone`,
      {
        body: JSON.stringify({
          name: 'sample-notebook-1 (copy)',
          noteId: '458e1320-3f05-11ef-bd29-e58626f102c0',
        }),
      }
    );
  });

  it('Checks notebook delete action', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));

    httpClient.put = jest.fn(() => {
      return Promise.resolve((notebookPutResponse as unknown) as HttpResponse);
    });

    httpClient.post = jest.fn(() => {
      return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
    });

    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('notebook-delete-icon'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('delete-notebook-modal-input')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.input(utils.getByTestId('delete-notebook-modal-input'), {
        target: { value: 'delete' },
      });
    });

    act(() => {
      fireEvent.click(utils.getByTestId('delete-notebook-modal-delete-button'));
    });

    expect(httpClient.delete).toHaveBeenCalledWith(
      `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/458e1320-3f05-11ef-bd29-e58626f102c0`
    );
  });

  it('Checks notebook reporting action presence', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));

    const utils = render(<ContextAwareNotebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    const button = utils.queryByTestId('reporting-actions-button');
    expect(button).toBeInTheDocument();
  });

  it('Checks notebook reporting action absence', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));

    const utils = render(<ContextAwareNotebook {...defaultProps} dataSourceEnabled />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });
    const button = utils.queryByTestId('reporting-actions-button');
    expect(button).not.toBeInTheDocument();
  });

  it('Renders a old notebook and migrates it', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));
    httpClient.put = jest.fn(() =>
      Promise.resolve((clearOutputNotebook as unknown) as HttpResponse)
    );
    httpClient.delete = jest.fn(() =>
      Promise.resolve(({ paragraphs: [] } as unknown) as HttpResponse)
    );
    httpClient.get = jest.fn(() =>
      Promise.resolve((migrateBlockNotebook as unknown) as HttpResponse)
    );
    const utils = render(<ContextAwareNotebook {...defaultProps} openedNoteId="mock-id" />);
    await waitFor(() => {
      expect(
        utils.getByText('Upgrade this notebook to take full advantage of the latest features')
      ).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('upgrade-notebook'));
    });

    act(() => {
      fireEvent.click(utils.getByTestId('custom-input-modal-confirm-button'));
    });

    expect(httpClient.post).toHaveBeenCalledWith(`${NOTEBOOKS_API_PREFIX}/note/migrate`, {
      body: JSON.stringify({
        name: 'sample-notebook-1 (upgraded)',
        noteId: 'mock-id',
      }),
    });
  });

  it('Checks old notebook delete action', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));

    httpClient.put = jest.fn(() => {
      return Promise.resolve((notebookPutResponse as unknown) as HttpResponse);
    });

    httpClient.post = jest.fn(() => {
      return Promise.resolve((addQueryResponse as unknown) as HttpResponse);
    });

    const utils = render(<ContextAwareNotebook {...defaultProps} openedNoteId="mock-id" />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('notebook-delete-icon'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('delete-notebook-modal-input')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.input(utils.getByTestId('delete-notebook-modal-input'), {
        target: { value: 'delete' },
      });
    });

    act(() => {
      fireEvent.click(utils.getByTestId('delete-notebook-modal-delete-button'));
    });

    expect(httpClient.delete).toHaveBeenCalledWith(`${NOTEBOOKS_API_PREFIX}/note/mock-id`);
  });
});
