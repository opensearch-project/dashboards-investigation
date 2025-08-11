/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCard,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingContent,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiPopover,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import CSS from 'csstype';
import moment from 'moment';
import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';

import { useContext } from 'react';
import { useObservable } from 'react-use';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { i18n } from '@osd/i18n';
import { NoteBookServices } from 'public/types';
import { ParagraphState } from '../../../../common/state/paragraph_state';
import { CREATE_NOTE_MESSAGE, NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { UI_DATE_FORMAT } from '../../../../common/constants/shared';
import { NotebookContext, ParaType } from '../../../../common/types/notebooks';
import { setNavBreadCrumbs } from '../../../../common/utils/set_nav_bread_crumbs';
import { HeaderControlledComponentsWrapper } from '../../../plugin_helpers/plugin_headerControl';
import { GenerateReportLoadingModal } from './helpers/custom_modals/reporting_loading_modal';
import { defaultParagraphParser } from './helpers/default_parser';
import { DeleteNotebookModal, getCustomModal, getDeleteModal } from './helpers/modal_containers';
import {
  contextMenuCreateReportDefinition,
  contextMenuViewReports,
  generateInContextReport,
} from './helpers/reporting_context_menu_helper';
import { Paragraphs } from './paragraph_components/paragraphs';
import { ContextPanel } from './context_panel';
import {
  NotebookContextProvider,
  NotebookReactContext,
  getDefaultState,
} from '../context_provider/context_provider';
import { InputPanel } from './input_panel';
import { useParagraphs } from '../../../hooks/use_paragraphs';
import { isValidUUID } from './helpers/notebooks_parser';
import { useNotebook } from '../../../hooks/use_notebook';
import { usePrecheck } from '../../../hooks/use_precheck';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

const ParagraphTypeDeepResearch = 'DEEP_RESEARCH';

const panelStyles: CSS.Properties = {
  marginTop: '10px',
};

/*
 * "Notebook" component is used to display an open notebook
 *
 * Props taken in as params are:
 * DashboardContainerByValueRenderer - Dashboard container renderer for visualization
 * http object - for making API requests
 */
export interface NotebookProps {
  openedNoteId: string;
}

export function NotebookComponent() {
  const history = useHistory();
  const {
    services: { http, notifications, chrome },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [selectedViewId] = useState('view_both');
  const [isReportingPluginInstalled, setIsReportingPluginInstalled] = useState(false);
  const [isReportingActionsPopoverOpen, setIsReportingActionsPopoverOpen] = useState(false);
  const [isReportingLoadingModalOpen, setIsReportingLoadingModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);
  const [dataSourceMDSId, setDataSourceMDSId] = useState<string | undefined | null>(null);
  const [context] = useState<NotebookContext | undefined>(undefined);
  const { createParagraph, deleteParagraph } = useParagraphs();
  const { loadNotebook: loadNotebookHook } = useNotebook();
  const { start } = usePrecheck();
  const newNavigation = chrome.navGroup.getNavGroupEnabled();

  const notebookContext = useContext(NotebookReactContext);
  const {
    dataSourceEnabled,
    id: openedNoteId,
    paragraphs: paragraphsStates,
    path,
    dateCreated,
    isLoading,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);
  const isSavedObjectNotebook = isValidUUID(openedNoteId);
  const paragraphs = paragraphsStates.map((item) => item.value);

  // parse paragraphs based on backend
  const parseParagraphs = useCallback(
    (paragraphsProp: any[]): ParaType[] => {
      try {
        const newParsedPara = defaultParagraphParser(paragraphsProp || []);
        newParsedPara.forEach((para: ParaType) => {
          para.paraDivRef = React.createRef<HTMLDivElement>();
        });
        return newParsedPara;
      } catch (err) {
        notifications.toasts.addDanger(
          'Error parsing paragraphs, please make sure you have the correct permission.'
        );
        return [];
      }
    },
    [notifications.toasts]
  );

  const parsedPara = useMemo(() => parseParagraphs(paragraphs), [paragraphs, parseParagraphs]);
  const dataSourceMDSEnabled = useMemo(() => dataSourceEnabled && isSavedObjectNotebook, [
    dataSourceEnabled,
    isSavedObjectNotebook,
  ]);

  const toggleReportingLoadingModal = (show: boolean) => {
    setIsReportingLoadingModalOpen(show);
  };

  const showDeleteParaModal = (index: number) => {
    setModalLayout(
      getDeleteModal(
        () => setIsModalVisible(false),
        () => {
          deleteParagraph(index);
          setIsModalVisible(false);
        },
        'Delete paragraph',
        'Are you sure you want to delete the paragraph? The action cannot be undone.'
      )
    );
    setIsModalVisible(true);
  };

  // Renames an existing notebook
  const renameNotebook = async (editedNoteName: string, editedNoteID: string): Promise<any> => {
    if (editedNoteName.length >= 50 || editedNoteName.length === 0) {
      notifications.toasts.addDanger('Invalid notebook name');
      return;
    }
    const renameNoteObject = {
      name: editedNoteName,
      noteId: editedNoteID,
    };

    return http
      .put(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/rename`, {
        body: JSON.stringify(renameNoteObject),
      })
      .then((res) => {
        notifications.toasts.addSuccess(`Notebook successfully renamed into "${editedNoteName}"`);
        return res;
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error renaming notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  const showRenameModal = () => {
    setModalLayout(
      getCustomModal(
        (newName: string) => {
          renameNotebook(newName, openedNoteId).then((res) => {
            setIsModalVisible(false);
            window.location.assign(`#/${res.id}`);
            setTimeout(() => {
              loadNotebook();
            }, 300);
          });
        },
        () => setIsModalVisible(false),
        'Name',
        'Rename notebook',
        'Cancel',
        'Rename',
        path,
        CREATE_NOTE_MESSAGE
      )
    );
    setIsModalVisible(true);
  };

  // Clones an existing notebook, return new notebook's id
  const cloneNotebook = async (clonedNoteName: string, clonedNoteID: string): Promise<string> => {
    if (clonedNoteName.length >= 50 || clonedNoteName.length === 0) {
      notifications.toasts.addDanger('Invalid notebook name');
      return Promise.reject();
    }
    const cloneNoteObject = {
      name: clonedNoteName,
      noteId: clonedNoteID,
    };

    return http
      .post(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/clone`, {
        body: JSON.stringify(cloneNoteObject),
      })
      .then((res) => {
        notifications.toasts.addSuccess(`Notebook "${clonedNoteName}" successfully created!`);
        return res.id;
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error cloning notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  const migrateNotebook = async (
    migrateNoteName: string,
    migrateNoteID: string
  ): Promise<string> => {
    if (migrateNoteName.length >= 50 || migrateNoteName.length === 0) {
      notifications.toasts.addDanger('Invalid notebook name');
      return Promise.reject();
    }
    const migrateNoteObject = {
      name: migrateNoteName,
      noteId: migrateNoteID,
    };
    return http
      .post(`${NOTEBOOKS_API_PREFIX}/note/migrate`, {
        body: JSON.stringify(migrateNoteObject),
      })
      .then((res) => {
        notifications.toasts.addSuccess(`Notebook "${migrateNoteName}" successfully created!`);
        return res.id;
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error migrating notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  const showCloneModal = () => {
    setModalLayout(
      getCustomModal(
        (newName: string) => {
          cloneNotebook(newName, openedNoteId).then((id: string) => {
            window.location.assign(`#/${id}`);
            setTimeout(() => {
              loadNotebook();
            }, 300);
          });
          setIsModalVisible(false);
        },
        () => setIsModalVisible(false),
        'Name',
        'Duplicate notebook',
        'Cancel',
        'Duplicate',
        path + ' (copy)',
        CREATE_NOTE_MESSAGE
      )
    );
    setIsModalVisible(true);
  };

  const showUpgradeModal = () => {
    setModalLayout(
      getCustomModal(
        (newName: string) => {
          migrateNotebook(newName, openedNoteId).then((id: string) => {
            window.location.assign(`#/${id}`);
            setTimeout(() => {
              loadNotebook();
            }, 300);
          });
          setIsModalVisible(false);
        },
        () => setIsModalVisible(false),
        'Name',
        'Upgrade notebook',
        'Cancel',
        'Upgrade',
        path + ' (upgraded)',
        CREATE_NOTE_MESSAGE
      )
    );
    setIsModalVisible(true);
  };

  // Delete a single notebook
  const deleteSingleNotebook = async (notebookId: string, toastMessage?: string) => {
    const route = isSavedObjectNotebook
      ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${notebookId}`
      : `${NOTEBOOKS_API_PREFIX}/note/${notebookId}`;

    try {
      await http.delete(route);
      const message = toastMessage || 'Notebook successfully deleted!';
      notifications.toasts.addSuccess(message);
    } catch (err) {
      notifications.toasts.addDanger(
        'Error deleting notebook, please make sure you have the correct permission.'
      );
      console.error(err.body.message);
    }
  };

  const showDeleteNotebookModal = () => {
    setModalLayout(
      <DeleteNotebookModal
        onConfirm={async () => {
          const toastMessage = `Notebook "${path}" successfully deleted!`;
          await deleteSingleNotebook(openedNoteId, toastMessage);
          setIsModalVisible(false);
          setTimeout(() => {
            history.push('.');
          }, 1000);
        }}
        onCancel={() => setIsModalVisible(false)}
        title={`Delete notebook "${path}"`}
        message="Delete notebook will remove all contents in the paragraphs."
      />
    );
    setIsModalVisible(true);
  };

  const scrollToPara = (index: number) => {
    setTimeout(() => {
      window.scrollTo({
        left: 0,
        top: parsedPara[index].paraDivRef.current?.offsetTop,
        behavior: 'smooth',
      });
    }, 0);
  };

  const setBreadcrumbs = useCallback(
    (notePath: string) => {
      setNavBreadCrumbs(
        [],
        [
          {
            text: 'Notebooks',
            href: '#/',
          },
          {
            text: notePath,
            href: `#/${openedNoteId}`,
          },
        ],
        chrome
      );
    },
    [openedNoteId, chrome]
  );

  const loadNotebook = useCallback(async () => {
    loadNotebookHook()
      .then(async (res) => {
        setBreadcrumbs(res.path);
        notebookContext.state.updateValue({
          paragraphs: res.paragraphs.map((paragraph) => new ParagraphState<unknown>(paragraph)),
        });
        await start({
          context: res.context,
          paragraphs: res.paragraphs,
        });
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error fetching notebooks, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  }, [loadNotebookHook, setBreadcrumbs, notifications.toasts, notebookContext.state, start]);

  const handleSelectedDataSourceChange = (id: string | undefined) => {
    setDataSourceMDSId(id);
  };

  const checkIfReportingPluginIsInstalled = useCallback(() => {
    fetch('../api/status', {
      headers: {
        'Content-Type': 'application/json',
        'osd-xsrf': 'true',
        'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,zh-TW;q=0.6',
        pragma: 'no-cache',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      method: 'GET',
      referrerPolicy: 'strict-origin-when-cross-origin',
      mode: 'cors',
      credentials: 'include',
    })
      .then(function (response) {
        return response.json();
      })
      .then((data) => {
        for (let i = 0; i < data.status.statuses.length; ++i) {
          if (data.status.statuses[i].id.includes('plugin:reportsDashboards')) {
            setIsReportingPluginInstalled(true);
          }
        }
      })
      .catch((error) => {
        notifications.toasts.addDanger('Error checking Reporting Plugin Installation status.');
        console.error(error);
      });
  }, [notifications.toasts]);

  useEffect(() => {
    setBreadcrumbs('');
    loadNotebook();
    checkIfReportingPluginIsInstalled();
  }, [setBreadcrumbs, loadNotebook, checkIfReportingPluginIsInstalled]);

  const reportingActionPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: 'Reporting',
      items: [
        {
          name: 'Download PDF',
          icon: <EuiIcon type="download" data-test-subj="download-notebook-pdf" />,
          onClick: () => {
            setIsReportingActionsPopoverOpen(false);
            generateInContextReport('pdf', { http, notifications }, toggleReportingLoadingModal);
          },
        },
        {
          name: 'Download PNG',
          icon: <EuiIcon type="download" />,
          onClick: () => {
            setIsReportingActionsPopoverOpen(false);
            generateInContextReport('png', { http, notifications }, toggleReportingLoadingModal);
          },
        },
        {
          name: 'Create report definition',
          icon: <EuiIcon type="calendar" />,
          onClick: () => {
            setIsReportingActionsPopoverOpen(false);
            contextMenuCreateReportDefinition(window.location.href);
          },
        },
        {
          name: 'View reports',
          icon: <EuiIcon type="document" />,
          onClick: () => {
            setIsReportingActionsPopoverOpen(false);
            contextMenuViewReports();
          },
        },
      ],
    },
  ];

  const showReportingContextMenu =
    isReportingPluginInstalled && !dataSourceMDSEnabled ? (
      <div>
        <EuiPopover
          panelPaddingSize="none"
          button={
            <EuiSmallButton
              data-test-subj="reporting-actions-button"
              id="reportingActionsButton"
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setIsReportingActionsPopoverOpen(!isReportingActionsPopoverOpen)}
            >
              Reporting
            </EuiSmallButton>
          }
          isOpen={isReportingActionsPopoverOpen}
          closePopover={() => setIsReportingActionsPopoverOpen(false)}
        >
          <EuiContextMenu initialPanelId={0} panels={reportingActionPanels} size="s" />
        </EuiPopover>
      </div>
    ) : null;

  const showLoadingModal = isReportingLoadingModalOpen ? (
    <GenerateReportLoadingModal setShowLoading={toggleReportingLoadingModal} />
  ) : null;

  const noteActionIcons = (
    <EuiFlexGroup gutterSize="s">
      {isSavedObjectNotebook ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage id="notebook.deleteButton.tooltip" defaultMessage="Delete" />
              }
            >
              <EuiButtonIcon
                color="danger"
                display="base"
                iconType="trash"
                size="s"
                onClick={showDeleteNotebookModal}
                data-test-subj="notebook-delete-icon"
                aria-label={i18n.translate('notebook.deleteButton.tooltip', {
                  defaultMessage: 'Delete',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage id="notebook.editButton.tooltip" defaultMessage="Edit name" />
              }
            >
              <EuiButtonIcon
                display="base"
                iconType="pencil"
                size="s"
                onClick={showRenameModal}
                data-test-subj="notebook-edit-icon"
                aria-label={i18n.translate('notebook.editButton.tooltip', {
                  defaultMessage: 'Edit name',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage
                  id="notebook.duplicateButton.tooltip"
                  defaultMessage="Duplicate"
                />
              }
            >
              <EuiButtonIcon
                iconType="copy"
                display="base"
                size="s"
                onClick={showCloneModal}
                data-test-subj="notebook-duplicate-icon"
                aria-label={i18n.translate('notebook.duplicateButton.tooltip', {
                  defaultMessage: 'Duplicate',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </>
      ) : (
        <>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                <FormattedMessage id="notebook.deleteButton.tooltip" defaultMessage="Delete" />
              }
            >
              <EuiButtonIcon
                color="danger"
                display="base"
                iconType="trash"
                size="s"
                onClick={showDeleteNotebookModal}
                data-test-subj="notebook-delete-icon"
                aria-label={i18n.translate('notebook.deleteButton.tooltip', {
                  defaultMessage: 'Delete',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );

  const handleCreateParagraph = async (paragraphInput: string, inputType: string) => {
    // Add paragraph at the end
    await createParagraph(paragraphs.length, paragraphInput, inputType);
  };

  const reportingTopButton = !isSavedObjectNotebook ? (
    <EuiFlexItem grow={false}>
      <EuiSmallButton
        fill
        data-test-subj="upgrade-notebook-callout"
        onClick={() => showUpgradeModal()}
      >
        Upgrade Notebook
      </EuiSmallButton>
    </EuiFlexItem>
  ) : null;

  const notebookHeader = newNavigation ? (
    <HeaderControlledComponentsWrapper
      description={`Created on ${moment(dateCreated).format(UI_DATE_FORMAT)}`}
      components={[
        noteActionIcons,
        <EuiFlexItem grow={false}>{showReportingContextMenu}</EuiFlexItem>,
        <EuiFlexItem grow={false}>{reportingTopButton}</EuiFlexItem>,
      ]}
    />
  ) : (
    <div>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiTitle size="l">
          <h3 data-test-subj="notebookTitle">{path}</h3>
        </EuiTitle>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {noteActionIcons}
            <EuiFlexItem grow={false}>{showReportingContextMenu}</EuiFlexItem>
            <EuiFlexItem grow={false}>{reportingTopButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <p>{`Created on ${moment(dateCreated).format(UI_DATE_FORMAT)}`}</p>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </div>
  );

  return (
    <>
      <EuiPage direction="column">
        <EuiPageBody>
          {notebookHeader}
          {!isSavedObjectNotebook && (
            <EuiFlexItem>
              <EuiCallOut color="primary" iconType="iInCircle">
                Upgrade this notebook to take full advantage of the latest features
                <EuiSpacer size="s" />
                <EuiSmallButton
                  data-test-subj="upgrade-notebook"
                  onClick={() => showUpgradeModal()}
                >
                  Upgrade Notebook
                </EuiSmallButton>
              </EuiCallOut>
            </EuiFlexItem>
          )}
          <EuiPageContent style={{ width: 900 }} horizontalPosition="center">
            {isLoading ? (
              <EuiEmptyPrompt icon={<EuiLoadingContent />} title={<h2>Loading Notebook</h2>} />
            ) : null}
            {/* Temporarily determine whether to display the context panel based on datasource id */}
            {context?.dataSourceId && <ContextPanel />}
            {isLoading ? null : parsedPara.length > 0 ? (
              parsedPara.map((para: ParaType, index: number) => (
                <div ref={parsedPara[index].paraDivRef} key={`para_div_${para.uniqueId}`}>
                  <Paragraphs
                    para={para}
                    index={index}
                    selectedViewId={selectedViewId}
                    deletePara={showDeleteParaModal}
                    handleSelectedDataSourceChange={handleSelectedDataSourceChange}
                    scrollToPara={scrollToPara}
                  />
                </div>
              ))
            ) : (
              // show default paragraph if no paragraphs in this notebook
              <div style={panelStyles}>
                <EuiPanel>
                  <EuiSpacer size="xxl" />
                  <EuiText textAlign="center">
                    <h2>No paragraphs</h2>
                    <EuiText size="s">
                      Add a paragraph to compose your document or story. Notebooks now support two
                      types of input:
                    </EuiText>
                  </EuiText>
                  <EuiSpacer size="xl" />
                  {isSavedObjectNotebook && (
                    <EuiFlexGroup justifyContent="spaceEvenly">
                      <EuiFlexItem grow={2} />
                      <EuiFlexItem grow={3}>
                        <EuiCard
                          icon={<EuiIcon size="xxl" type="editorCodeBlock" />}
                          title="Query"
                          description="Write contents directly using markdown, SQL or PPL."
                          footer={
                            <EuiSmallButton
                              data-test-subj="emptyNotebookAddCodeBlockBtn"
                              onClick={() => createParagraph(0, '%ppl ', 'CODE')}
                              style={{ marginBottom: 17 }}
                            >
                              Add query
                            </EuiSmallButton>
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={3}>
                        <EuiCard
                          icon={<EuiIcon size="xxl" type="visArea" />}
                          title="Visualization"
                          description="Import OpenSearch Dashboards or Observability visualizations to the notes."
                          footer={
                            <EuiSmallButton
                              onClick={() => createParagraph(0, '', 'VISUALIZATION')}
                              style={{ marginBottom: 17 }}
                            >
                              Add visualization
                            </EuiSmallButton>
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={3}>
                        <EuiCard
                          icon={<EuiIcon size="xxl" type="inspect" />}
                          title="Deep Research"
                          description="Use deep research to analytics question."
                          footer={
                            <EuiSmallButton
                              onClick={() => createParagraph(0, '', ParagraphTypeDeepResearch)}
                              style={{ marginBottom: 17 }}
                            >
                              Add deep research
                            </EuiSmallButton>
                          }
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={2} />
                    </EuiFlexGroup>
                  )}
                  <EuiSpacer size="xxl" />
                </EuiPanel>
              </div>
            )}
            {showLoadingModal}
          </EuiPageContent>
        </EuiPageBody>
        <EuiSpacer />
        <InputPanel onCreateParagraph={handleCreateParagraph} dataSourceId={dataSourceMDSId} />
      </EuiPage>
      {isModalVisible && modalLayout}
    </>
  );
}

export const Notebook = ({ openedNoteId }: NotebookProps) => {
  const {
    services: { dataSource },
  } = useOpenSearchDashboards<NoteBookServices>();
  const stateRef = useRef(
    getDefaultState({
      id: openedNoteId,
      dataSourceEnabled: !!dataSource,
    })
  );
  return (
    <NotebookContextProvider state={stateRef.current}>
      <NotebookComponent />
    </NotebookContextProvider>
  );
};
