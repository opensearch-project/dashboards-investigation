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
  sampleNotebook1,
} from '../../../../../test/notebooks_constants';
import { sampleSavedVisualization } from '../../../../../test/panels_constants';
import PPLService from '../../../../services/requests/ppl';
import { SavedObjectsActions } from '../../../../services/saved_objects/saved_object_client/saved_objects_actions';
import { Notebook } from '../notebook';
import { notificationServiceMock } from '../../../../../../../src/core/public/mocks';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

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
  const pplService = new PPLService(httpClient);
  const setBreadcrumbs = jest.fn();
  const renameNotebook = jest.fn();
  const cloneNotebook = jest.fn();
  const deleteNotebook = jest.fn();
  const setToast = jest.fn();
  const location = jest.fn() as any;
  location.search = '';
  const history = jest.fn() as any;
  history.replace = jest.fn();
  history.push = jest.fn();
  const notifications = notificationServiceMock.createStartContract();

  it('Renders the empty component', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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
    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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

  it('toggles show input in code block', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    let postFlag = 1;
    httpClient.post = jest.fn(() => {
      if (postFlag === 1) {
        postFlag += 1;
        return Promise.resolve((addCodeBlockResponse as unknown) as HttpResponse);
      } else return Promise.resolve((runCodeBlockResponse as unknown) as HttpResponse);
    });
    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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
      utils.getByLabelText('Toggle show input').click();
    });

    await waitFor(() => {
      expect(utils.queryByPlaceholderText(codePlaceholderText)).toBeNull();
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
    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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
      fireEvent.click(utils.getByText('Run'));
    });

    await waitFor(() => {
      expect(utils.queryByText('Run')).toBeNull();
      expect(utils.getByText('hello')).toBeInTheDocument();
    });
  });

  it('toggles between input/output only views', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));
    const utils = render(
      <Notebook
        pplService={pplService}
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        parentBreadcrumb={{ href: 'parent-href', text: 'parent-text' }}
        setBreadcrumbs={setBreadcrumbs}
        renameNotebook={renameNotebook}
        cloneNotebook={cloneNotebook}
        deleteNotebook={deleteNotebook}
        setToast={setToast}
        location={location}
        history={history}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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
      utils.getByLabelText('Toggle show input').click();
    });

    await waitFor(() => {
      expect(utils.queryByPlaceholderText(codePlaceholderText)).toBeNull();
    });

    act(() => {
      utils.getByLabelText('Toggle show input').click();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('input_only'));
    });

    await waitFor(() => {
      expect(utils.queryByText('Refresh')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('output_only'));
    });

    await waitFor(() => {
      expect(utils.queryByText('Refresh')).toBeNull();
      expect(utils.getByText('hello')).toBeInTheDocument();
    });
  });

  it('Renders a notebook and checks paragraph actions', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((codeBlockNotebook as unknown) as HttpResponse));
    httpClient.put = jest.fn(() =>
      Promise.resolve((clearOutputNotebook as unknown) as HttpResponse)
    );
    httpClient.delete = jest.fn(() =>
      Promise.resolve(({ paragraphs: [] } as unknown) as HttpResponse)
    );

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByText('Clear all outputs'));
    });

    await waitFor(() => {
      expect(
        utils.queryByText(
          'Are you sure you want to clear all outputs? The action cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(utils.queryByText('hello')).toBeNull();
    });

    act(() => {
      fireEvent.click(utils.getByText('Delete all paragraphs'));
    });

    await waitFor(() => {
      expect(
        utils.queryByText(
          'Are you sure you want to delete all paragraphs? The action cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
    });

    await waitFor(() => {
      expect(utils.queryByText('No paragraphs')).toBeInTheDocument();
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

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });

    const button = utils.queryByTestId('reporting-actions-button');
    expect(button).toBeInTheDocument();
  });

  it('Checks notebook reporting action absence', async () => {
    httpClient.get = jest.fn(() => Promise.resolve((emptyNotebook as unknown) as HttpResponse));

    const utils = render(
      <Notebook
        openedNoteId="458e1320-3f05-11ef-bd29-e58626f102c0"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={true}
        notifications={notifications}
      />
    );
    await waitFor(() => {
      expect(utils.getByText('sample-notebook-1')).toBeInTheDocument();
    });
    const button = utils.queryByTestId('reporting-actions-button');
    expect(button).not.toBeInTheDocument();
  });

  it('Renders the visualization component', async () => {
    SavedObjectsActions.getBulk = jest.fn().mockResolvedValue({
      observabilityObjectList: [{ savedVisualization: sampleSavedVisualization }],
    });

    httpClient.get = jest.fn(() =>
      Promise.resolve(({
        ...sampleNotebook1,
        path: sampleNotebook1.name,
        visualizations: [
          {
            id: 'oiuccXwBYVazWqOO1e06',
            name: 'Flight Count by Origin',
            query:
              'source=opensearch_dashboards_sample_data_flights | fields Carrier,FlightDelayMin | stats sum(FlightDelayMin) as delays by Carrier',
            type: 'bar',
            timeField: 'timestamp',
          },
        ],
        savedVisualizations: Array.from({ length: 5 }, (v, k) => ({
          label: `vis-${k}`,
          key: `vis-${k}`,
        })),
      } as unknown) as HttpResponse)
    );
    const utils = render(
      <Notebook
        openedNoteId={sampleNotebook1.id}
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        notifications={notifications}
      />
    );

    await waitFor(() => {
      expect(utils.container.firstChild).toMatchSnapshot();
    });
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
    const utils = render(
      <Notebook
        openedNoteId="mock-id"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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

    const utils = render(
      <Notebook
        openedNoteId="mock-id"
        DashboardContainerByValueRenderer={jest.fn()}
        http={httpClient}
        dataSourceManagement={{
          ui: { DataSourceSelector: () => <div /> },
          getDataSourceMenu: () => jest.fn(),
        }}
        setActionMenu={jest.fn()}
        dataSourceEnabled={false}
        notifications={notifications}
      />
    );
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
