/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiCompressedFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSmallButton,
  EuiSpacer,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import truncate from 'lodash/truncate';
import moment from 'moment';
import React, { useEffect, useState, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { CoreStart, HttpStart, SavedObjectsStart } from '../../../../../../src/core/public';
import { DataSourceManagementPluginSetup } from '../../../../../../src/plugins/data_source_management/public';
import {
  CREATE_NOTE_MESSAGE,
  NOTEBOOKS_DOCUMENTATION_URL,
} from '../../../../common/constants/notebooks';
import { UI_DATE_FORMAT } from '../../../../common/constants/shared';
import { setNavBreadCrumbs } from '../../../../common/utils/set_nav_bread_crumbs';
import { HeaderControlledComponentsWrapper } from '../../../../public/plugin_helpers/plugin_headerControl';
import { coreRefs } from '../../../framework/core_refs';
import {
  DeleteNotebookModal,
  getCustomModal,
  getSampleNotebooksModal,
} from './helpers/modal_containers';
import { NotebookType } from './main';
import { NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { toMountPoint } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

const newNavigation = coreRefs.chrome?.navGroup.getNavGroupEnabled();

interface NoteTableProps {
  deleteNotebook: (noteList: string[], toastMessage?: string) => void;
  dataSourceEnabled: boolean;
  dataSourceManagement: DataSourceManagementPluginSetup;
  savedObjectsMDSClient: SavedObjectsStart;
  notifications: CoreStart['notifications'];
  http: HttpStart;
}

export function NoteTable({
  deleteNotebook,
  dataSourceEnabled,
  dataSourceManagement,
  savedObjectsMDSClient,
  notifications,
  http,
}: NoteTableProps) {
  const [notebooks, setNotebooks] = useState<NotebookType[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal Toggle
  const [modalLayout, setModalLayout] = useState(<EuiOverlayMask />); // Modal Layout
  const [selectedNotebooks, setSelectedNotebooks] = useState<NotebookType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const history = useHistory();

  // Fetches path and id for all stored notebooks
  const fetchNotebooks = useCallback(() => {
    // Notebooks plugin only supports savedNotebooks stored in .kibana
    // The support for notebooks in .opensearch-observability is removed in OSD 3.0.0 version
    // Related Issue: https://github.com/opensearch-project/dashboards-observability/issues/2350
    return http
      .get(`${NOTEBOOKS_API_PREFIX}/savedNotebook`)
      .then((savedNotebooksResponse) => {
        setNotebooks(savedNotebooksResponse.data);
      })
      .catch((err) => {
        console.error('Issue in fetching the notebooks', err.body.message);
      });
  }, [http]);

  useEffect(() => {
    setNavBreadCrumbs(
      [],
      [
        {
          text: 'Notebooks',
          href: '#/',
        },
      ],
      notebooks.length
    );
    fetchNotebooks();
  }, [notebooks.length, fetchNotebooks]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);
  const showModal = () => {
    setIsModalVisible(true);
  };

  // Creates a new notebook
  const createNotebook = useCallback(
    async (newNoteName: string) => {
      if (newNoteName.length >= 50 || newNoteName.length === 0) {
        notifications.toasts.addDanger('Invalid notebook name');
        window.location.assign('#/');
        return;
      }
      const newNoteObject = {
        name: newNoteName,
      };

      return http
        .post(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook`, {
          body: JSON.stringify(newNoteObject),
        })
        .then(async (res) => {
          notifications.toasts.addSuccess(`Notebook "${newNoteName}" successfully created!`);
          window.location.assign(`#/${res}`);
        })
        .catch((err) => {
          notifications.toasts.addDanger({
            title: 'Please ask your administrator to enable Notebooks for you.',
            text: toMountPoint(
              <EuiLink href={NOTEBOOKS_DOCUMENTATION_URL} target="_blank">
                Documentation
              </EuiLink>
            ),
          });

          console.error(err);
        });
    },
    [http, notifications]
  );

  const onCreate = useCallback(
    async (newNoteName: string) => {
      createNotebook(newNoteName);
      closeModal();
    },
    [createNotebook, closeModal]
  );

  const onDelete = async () => {
    const toastMessage = `Notebook${
      selectedNotebooks.length > 1 ? 's' : ' "' + selectedNotebooks[0].path + '"'
    } successfully deleted!`;
    await deleteNotebook(
      selectedNotebooks.map((note) => note.id),
      toastMessage
    );
    setNotebooks((prevState) =>
      prevState.filter((notebook) => !selectedNotebooks.includes(notebook))
    );
    closeModal();
  };

  const createNote = useCallback(() => {
    setModalLayout(
      getCustomModal(
        onCreate,
        () => {
          closeModal();
          history.goBack();
        },
        'Name',
        'Create notebook',
        'Cancel',
        'Create',
        undefined,
        CREATE_NOTE_MESSAGE
      )
    );
    showModal();
  }, [onCreate, closeModal, history]);

  useEffect(() => {
    const url = window.location.hash.split('/');
    if (url[url.length - 1] === 'create') {
      createNote();
    }
  }, [location, createNote]);

  const deleteNote = () => {
    const notebookString = `notebook${selectedNotebooks.length > 1 ? 's' : ''}`;
    setModalLayout(
      <DeleteNotebookModal
        onConfirm={onDelete}
        onCancel={closeModal}
        title={`Delete ${selectedNotebooks.length} ${notebookString}`}
        message={`Are you sure you want to delete the selected ${selectedNotebooks.length} ${notebookString}?`}
      />
    );
    showModal();
  };

  const addSampleNotebooks = async (dataSourceMDSId?: string, dataSourceMDSLabel?: string) => {
    try {
      setLoading(true);
      const flights = await http
        .get('../api/saved_objects/_find', {
          query: {
            type: 'index-pattern',
            search_fields: 'title',
            search: 'opensearch_dashboards_sample_data_flights',
          },
        })
        .then((resp) => {
          if (resp.total === 0) {
            return true;
          }
          const hasDataSourceMDSId = resp.saved_objects.some((obj) =>
            obj.references.some((ref) => ref.type === 'data-source' && ref.id === dataSourceMDSId)
          );

          // Return true if dataSourceMDSId is not found in any references
          return !hasDataSourceMDSId;
        });
      const logs = await http
        .get('../api/saved_objects/_find', {
          query: {
            type: 'index-pattern',
            search_fields: 'title',
            search: 'opensearch_dashboards_sample_data_logs',
          },
        })
        .then((resp) => {
          if (resp.total === 0) {
            return true;
          }
          const hasDataSourceMDSId = resp.saved_objects.some((obj) =>
            obj.references.some((ref) => ref.type === 'data-source' && ref.id === dataSourceMDSId)
          );

          // Return true if dataSourceMDSId is not found in any references
          return !hasDataSourceMDSId;
        });
      if (flights) {
        notifications.toasts.addSuccess('Adding sample data for flights. This can take some time.');
        await http.post('../api/sample_data/flights', {
          query: { data_source_id: dataSourceMDSId },
        });
      }
      if (logs) {
        notifications.toasts.addSuccess('Adding sample data for logs. This can take some time.');
        await http.post('../api/sample_data/logs', {
          query: { data_source_id: dataSourceMDSId },
        });
      }
      const visIds: string[] = [];
      await http
        .get('../api/saved_objects/_find', {
          query: {
            type: 'visualization',
            search_fields: 'title',
            search:
              `[Logs] Response Codes Over Time + Annotations` +
              (dataSourceMDSLabel ? `_${dataSourceMDSLabel}` : ''),
          },
        })
        .then((resp) => {
          if (dataSourceEnabled) {
            const searchTitle = `[Logs] Response Codes Over Time + Annotations_${dataSourceMDSLabel}`;
            const savedObjects = resp.saved_objects;

            const foundObject = savedObjects.find((obj) => obj.attributes.title === searchTitle);
            if (foundObject) {
              visIds.push(foundObject.id);
            }
          } else {
            visIds.push(resp.saved_objects[0].id);
          }
        });
      await http
        .get('../api/saved_objects/_find', {
          query: {
            type: 'visualization',
            search_fields: 'title',
            search:
              `[Logs] Unique Visitors vs. Average Bytes` +
              (dataSourceMDSLabel ? `_${dataSourceMDSLabel}` : ''),
          },
        })
        .then((resp) => {
          if (dataSourceEnabled) {
            const searchTitle = `[Logs] Unique Visitors vs. Average Bytes_${dataSourceMDSLabel}`;
            const savedObjects = resp.saved_objects;

            const foundObject = savedObjects.find((obj) => obj.attributes.title === searchTitle);
            if (foundObject) {
              visIds.push(foundObject.id);
            }
          } else {
            visIds.push(resp.saved_objects[0].id);
          }
        });
      await http
        .get('../api/saved_objects/_find', {
          query: {
            type: 'visualization',
            search_fields: 'title',
            search:
              `[Flights] Flight Count and Average Ticket Price` +
              (dataSourceMDSLabel ? `_${dataSourceMDSLabel}` : ''),
          },
        })
        .then((resp) => {
          if (dataSourceEnabled) {
            const searchTitle = `[Flights] Flight Count and Average Ticket Price_${dataSourceMDSLabel}`;
            const savedObjects = resp.saved_objects;

            const foundObject = savedObjects.find((obj) => obj.attributes.title === searchTitle);
            if (foundObject) {
              visIds.push(foundObject.id);
            }
          } else {
            visIds.push(resp.saved_objects[0].id);
          }
        });
      await http
        .post(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/addSampleNotebooks`, {
          body: JSON.stringify({ visIds }),
        })
        .then((res) => {
          const newData = res.body.map((notebook: any) => ({
            path: notebook.name,
            id: notebook.id,
            dateCreated: notebook.dateCreated,
            dateModified: notebook.dateModified,
          }));
          setNotebooks((prevState) => [...prevState, ...newData]);
        });
      notifications.toasts.addSuccess(`Sample notebooks successfully added.`);
    } catch (err: any) {
      notifications.toasts.addDanger('Error adding sample notebooks.');
      console.error(err.body.message);
    } finally {
      setLoading(false);
    }
  };

  const addSampleNotebooksModal = async () => {
    let selectedDataSourceId: string | undefined;
    let selectedDataSourceLabel: string | undefined;
    const handleSelectedDataSourceChange = (id?: string, label?: string) => {
      selectedDataSourceId = id;
      selectedDataSourceLabel = label;
    };
    setModalLayout(
      getSampleNotebooksModal(
        closeModal,
        async () => {
          closeModal();
          await addSampleNotebooks(selectedDataSourceId, selectedDataSourceLabel);
        },
        dataSourceEnabled,
        dataSourceManagement,
        savedObjectsMDSClient,
        notifications,
        handleSelectedDataSourceChange
      )
    );
    showModal();
  };

  const tableColumns = [
    {
      field: 'path',
      name: 'Name',
      sortable: true,
      truncateText: true,
      render: (value, record) => (
        <EuiLink href={`#/${record.id}`}>{truncate(value, { length: 100 })}</EuiLink>
      ),
    },
    {
      field: 'dateModified',
      name: 'Last updated',
      sortable: true,
      render: (value) => moment(value).format(UI_DATE_FORMAT),
    },
    {
      field: 'dateCreated',
      name: 'Created',
      sortable: true,
      render: (value) => moment(value).format(UI_DATE_FORMAT),
    },
  ] as Array<
    EuiTableFieldDataColumnType<{
      path: string;
      id: string;
      dateCreated: string;
      dateModified: string;
    }>
  >;

  return (
    <>
      <EuiPage>
        <EuiPageBody component="div">
          {!newNavigation && (
            <EuiPageHeader>
              <EuiPageHeaderSection>
                <EuiTitle size="l">
                  <h3>Notebooks</h3>
                </EuiTitle>
              </EuiPageHeaderSection>
            </EuiPageHeader>
          )}
          <EuiPageContent id="notebookArea" paddingSize="m">
            {newNavigation ? (
              <HeaderControlledComponentsWrapper
                description={{
                  text:
                    'Use Notebooks to interactively and collaboratively develop rich reports backed by live data. Common use cases for notebooks include creating postmortem reports, designing run books, building live infrastructure reports, or even documentation.',
                  url: NOTEBOOKS_DOCUMENTATION_URL,
                  urlTitle: 'Learn more',
                }}
                components={[
                  <EuiFlexGroup gutterSize="s" key="controls">
                    <EuiFlexItem grow={false}>
                      <EuiSmallButton
                        data-test-subj="notebookEmptyTableAddSamplesBtn"
                        fullWidth={false}
                        onClick={() => addSampleNotebooksModal()}
                      >
                        Add sample notebooks
                      </EuiSmallButton>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSmallButton
                        fill
                        href="#/create"
                        data-test-subj="createNotebookPrimaryBtn"
                        iconType="plus"
                        iconSide="left"
                      >
                        Create notebook
                      </EuiSmallButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>,
                ]}
              />
            ) : (
              <EuiPageContentHeader>
                <EuiPageContentHeaderSection>
                  <EuiTitle size="s" data-test-subj="notebookTableTitle">
                    <h3>
                      Notebooks<span className="panel-header-count"> ({notebooks.length})</span>
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued" data-test-subj="notebookTableDescription">
                    Use Notebooks to interactively and collaboratively develop rich reports backed
                    by live data. Common use cases for notebooks include creating postmortem
                    reports, designing run books, building live infrastructure reports, or even
                    documentation.{' '}
                    <EuiLink external={true} href={NOTEBOOKS_DOCUMENTATION_URL} target="blank">
                      Learn more
                    </EuiLink>
                  </EuiText>
                </EuiPageContentHeaderSection>
                <EuiPageContentHeaderSection>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiSmallButton
                        data-test-subj="notebookEmptyTableAddSamplesBtn"
                        fullWidth={false}
                        onClick={() => addSampleNotebooksModal()}
                      >
                        Add sample notebooks
                      </EuiSmallButton>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSmallButton
                        fill
                        href="#/create"
                        data-test-subj="createNotebookPrimaryBtn"
                        iconType="plus"
                        iconSide="left"
                      >
                        Create notebook
                      </EuiSmallButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPageContentHeaderSection>
              </EuiPageContentHeader>
            )}
            {notebooks.length > 0 ? (
              <>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    {selectedNotebooks.length > 0 && (
                      <EuiSmallButton
                        color="danger"
                        iconType="trash"
                        onClick={deleteNote}
                        data-test-subj="deleteSelectedNotebooks"
                      >
                        Delete {selectedNotebooks.length} notebook
                        {selectedNotebooks.length > 1 ? 's' : ''}
                      </EuiSmallButton>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCompressedFieldSearch
                      fullWidth
                      placeholder="Search notebook name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiInMemoryTable
                  loading={loading}
                  items={
                    searchQuery
                      ? notebooks.filter((notebook) =>
                          notebook.path.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : notebooks
                  }
                  itemId="id"
                  columns={tableColumns}
                  tableLayout="auto"
                  pagination={{
                    initialPageSize: 10,
                    pageSizeOptions: [8, 10, 13],
                  }}
                  sorting={{
                    sort: {
                      field: 'dateModified',
                      direction: 'desc',
                    },
                  }}
                  allowNeutralSort={false}
                  isSelectable={true}
                  selection={{
                    onSelectionChange: (items) => setSelectedNotebooks(items),
                  }}
                />
              </>
            ) : (
              <>
                <EuiSpacer size="xxl" />
                <EuiText textAlign="center" data-test-subj="notebookEmptyTableText">
                  <h2>No notebooks</h2>
                  <EuiSpacer size="m" />
                  <EuiText color="subdued" size="s">
                    Use notebooks to create post-mortem reports, build live infrastructure
                    <br />
                    reports, or foster explorative collaborations with data.
                  </EuiText>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiSmallButton
                      href="#/create"
                      data-test-subj="notebookEmptyTableCreateBtn"
                      fullWidth={false}
                      iconType="plus"
                      iconSide="left"
                    >
                      Create notebook
                    </EuiSmallButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSmallButton
                      data-test-subj="notebookEmptyTableAddSamplesBtn"
                      fullWidth={false}
                      onClick={() => addSampleNotebooksModal()}
                    >
                      Add sample notebooks
                    </EuiSmallButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xxl" />
              </>
            )}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
      {isModalVisible && modalLayout}
    </>
  );
}
