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
  addCodeBlockResponse,
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
import { BehaviorSubject } from 'rxjs';
import { DataSourceManagementPluginSetup } from '../../../../../../../src/plugins/data_source_management/public';

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

jest.mock('../bubbleup/bubble_up_container', () => ({
  BubbleUpContainer: () => <div />,
}));

jest.mock('../context_panel', () => ({
  ContextPanel: () => <div />,
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

describe('<Notebook /> spec', () => {
  configure({ adapter: new Adapter() });
  const httpClient = getOSDHttp();
  const location = jest.fn() as any;
  location.search = '';
  const history = jest.fn() as any;
  history.replace = jest.fn();
  history.push = jest.fn();
  const notifications = notificationServiceMock.createStartContract();
  const defaultProps: NotebookProps = {
    openedNoteId: '458e1320-3f05-11ef-bd29-e58626f102c0',
    DashboardContainerByValueRenderer: jest.fn(),
    http: httpClient,
    chrome: chromeServiceMock.createStartContract(),
    dataSourceManagement: ({
      ui: {
        DataSourceSelector: () => <div />,
        getDataSourceMenu: jest.fn(),
      },
      registerAuthenticationMethod: jest.fn(),
      dataSourceSelection: {
        selectedDataSource$: new BehaviorSubject(new Map()),
        removedComponentIds: [],
        selectDataSource: jest.fn(),
        remove: jest.fn(),
        getSelectionValue: jest.fn(),
        getSelection$: () => new BehaviorSubject(new Map()),
      },
      getDefaultDataSourceId: jest.fn(),
      getDefaultDataSourceId$: jest.fn(() => new BehaviorSubject('')),
    } as unknown) as DataSourceManagementPluginSetup,
    dataSourceEnabled: false,
    notifications,
    savedObjectsMDSClient: savedObjectsServiceMock.createStartContract(),
  };

  it('Renders the empty component', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    const utils = render(<Notebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });
    expect(utils.container.firstChild).toMatchSnapshot();
  });

  it('Adds a code block', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    let postFlag = 1;
    httpClient.post = jest.fn(() => {
      if (postFlag === 1) {
        postFlag += 1;
        return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
      } else return Promise.resolve((runCodeBlockResponse as unknown) as HttpResponse);
    });
    const utils = render(<Notebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      utils.getByText('Add code block').click();
    });

    await waitFor(() => {
      expect(utils.getByPlaceholderText(codePlaceholderText)).toBeInTheDocument();
    });
  });

  it('runs a code block and checks the output', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    let postFlag = 1;
    httpClient.post = jest.fn(() => {
      if (postFlag === 1) {
        postFlag += 1;
        return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
      } else return Promise.resolve((runCodeBlockResponse as unknown) as HttpResponse);
    });
    const utils = render(<Notebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      utils.getByText('Add code block').click();
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
      return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
    });

    const utils = render(<Notebook {...defaultProps} />);
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
      return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
    });

    const utils = render(<Notebook {...defaultProps} />);
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
      return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
    });

    const utils = render(<Notebook {...defaultProps} />);
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

    const utils = render(<Notebook {...defaultProps} />);
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    const button = utils.queryByTestId('reporting-actions-button');
    expect(button).toBeInTheDocument();
  });

  it('Checks notebook reporting action absence', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));

    const utils = render(<Notebook {...defaultProps} dataSourceEnabled />);
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
    const utils = render(<Notebook {...defaultProps} openedNoteId="mock-id" />);
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
      return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
    });

    const utils = render(<Notebook {...defaultProps} openedNoteId="mock-id" />);
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
