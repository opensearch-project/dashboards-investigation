/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiOverlayMask,
  EuiPopover,
  EuiSmallButton,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { useHistory } from 'react-router-dom';
import moment from 'moment';
import { useObservable } from 'react-use';
import { i18n } from '@osd/i18n';
import { isEmpty } from 'lodash';

import type { NoteBookServices } from 'public/types';

import { CREATE_NOTE_MESSAGE, NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { investigationNotebookID, UI_DATE_FORMAT } from '../../../../common/constants/shared';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../context_provider/context_provider';
import { setNavBreadCrumbs } from '../../../../common/utils/set_nav_bread_crumbs';
import { HeaderVariant } from '../../../../../../src/core/public';

import { GenerateReportLoadingModal } from './helpers/custom_modals/reporting_loading_modal';
import { DeleteNotebookModal, getCustomModal } from './helpers/modal_containers';
import {
  contextMenuCreateReportDefinition,
  contextMenuViewReports,
  generateInContextReport,
} from './helpers/reporting_context_menu_helper';
import { ToggleSystemPromptSettingModal } from './helpers/custom_modals/toggle_system_prompt_setting_modal';
import { TopNavMenuIconData } from '../../../../../../src/plugins/navigation/public';
import { SystemPromptSettingModal } from './helpers/custom_modals/system_prompt_setting_modal';
import { NotebookDataSourceSelector } from './data_source_selector/notebook_data_source_selector';

export const NotebookHeader = ({
  loadNotebook,
  showUpgradeModal,
  isSavedObjectNotebook,
}: {
  loadNotebook: () => void;
  showUpgradeModal: () => void;
  isSavedObjectNotebook: boolean;
}) => {
  const history = useHistory();
  const {
    services: {
      http,
      notifications,
      chrome,
      navigation: {
        ui: { TopNavMenu, HeaderControl },
      },
      appMountService,
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const newNavigation = chrome.navGroup.getNavGroupEnabled();
  const notebookContext = useContext(NotebookReactContext);
  const {
    dataSourceEnabled,
    id: openedNoteId,
    path,
    dateCreated,
    dateModified,
    context,
    isLoading,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);
  const contextValue = useObservable(context.getValue$());
  const { dataSourceId } = contextValue || {};

  const [isReportingPluginInstalled, setIsReportingPluginInstalled] = useState(false);
  const [isReportingActionsPopoverOpen, setIsReportingActionsPopoverOpen] = useState(false);
  const [isReportingLoadingModalOpen, setIsReportingLoadingModalOpen] = useState(false);
  const [isSystemPromptsModalOpen, setIsSystemPromptsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);

  const dataSourceMDSEnabled = useMemo(() => dataSourceEnabled && isSavedObjectNotebook, [
    dataSourceEnabled,
    isSavedObjectNotebook,
  ]);

  const toggleReportingLoadingModal = useCallback((show: boolean) => {
    setIsReportingLoadingModalOpen(show);
  }, []);
  // Renames an existing notebook
  const renameNotebook = useCallback(
    async (editedNoteName: string, editedNoteID: string): Promise<any> => {
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
    },
    [http, notifications.toasts]
  );

  const showRenameModal = useCallback(() => {
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
  }, [renameNotebook, openedNoteId, loadNotebook, path]);
  // Clones an existing notebook, return new notebook's id
  const cloneNotebook = useCallback(
    async (clonedNoteName: string, clonedNoteID: string): Promise<string> => {
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
    },
    [http, notifications.toasts]
  );

  const showCloneModal = useCallback(() => {
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
  }, [cloneNotebook, openedNoteId, loadNotebook, path]);

  // Delete a single notebook
  const deleteSingleNotebook = useCallback(
    async (notebookId: string, toastMessage?: string) => {
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
    },
    [http, notifications.toasts, isSavedObjectNotebook]
  );

  const showDeleteNotebookModal = useCallback(() => {
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
  }, [path, deleteSingleNotebook, openedNoteId, history]);

  const reportingActionPanels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
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
    ],
    [http, notifications, toggleReportingLoadingModal]
  );

  const showReportingContextMenu = useMemo(
    () =>
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
      ) : null,
    [
      isReportingPluginInstalled,
      dataSourceMDSEnabled,
      isReportingActionsPopoverOpen,
      reportingActionPanels,
    ]
  );

  const reportingTopButton = useMemo(
    () =>
      !isSavedObjectNotebook ? (
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            fill
            data-test-subj="upgrade-notebook-callout"
            onClick={() => showUpgradeModal()}
          >
            Upgrade Notebook
          </EuiSmallButton>
        </EuiFlexItem>
      ) : null,
    [isSavedObjectNotebook, showUpgradeModal]
  );

  const noteActionIcons = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s">
        {isSavedObjectNotebook ? (
          <>
            <EuiFlexItem grow={false}>
              <ToggleSystemPromptSettingModal />
            </EuiFlexItem>
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
    ),
    [isSavedObjectNotebook, showDeleteNotebookModal, showRenameModal, showCloneModal]
  );

  const showLoadingModal = useMemo(
    () =>
      isReportingLoadingModalOpen ? (
        <GenerateReportLoadingModal setShowLoading={toggleReportingLoadingModal} />
      ) : null,
    [isReportingLoadingModalOpen, toggleReportingLoadingModal]
  );

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

  useEffect(() => {
    checkIfReportingPluginIsInstalled();
  }, [checkIfReportingPluginIsInstalled]);

  useEffect(() => {
    setBreadcrumbs(path);
  }, [setBreadcrumbs, path]);

  useEffect(() => {
    if (newNavigation) {
      chrome.setHeaderVariant(HeaderVariant.APPLICATION);
      return () => {
        chrome.setHeaderVariant(HeaderVariant.PAGE);
      };
    }
  }, [chrome, newNavigation]);

  const header = useMemo(
    () =>
      newNavigation ? (
        <>
          {appMountService && (
            <>
              <TopNavMenu
                appName={investigationNotebookID}
                config={[
                  {
                    tooltip: i18n.translate('notebook.systemPromptSettingButton.tooltip', {
                      defaultMessage: 'Edit system prompt',
                    }),
                    ariaLabel: i18n.translate('notebook.systemPromptSettingButton.tooltip', {
                      defaultMessage: 'Edit system prompt',
                    }),
                    testId: 'notebook-system-prompt-icon',
                    run: () => {
                      setIsSystemPromptsModalOpen(true);
                    },
                    iconType: 'setting',
                    controlType: 'icon',
                  } as TopNavMenuIconData,
                  ...(isSavedObjectNotebook
                    ? [
                        {
                          tooltip: i18n.translate('notebook.editButton.tooltip', {
                            defaultMessage: 'Edit name',
                          }),
                          ariaLabel: i18n.translate('notebook.editButton.tooltip', {
                            defaultMessage: 'Edit name',
                          }),
                          testId: 'notebook-edit-icon',
                          run: showRenameModal,
                          iconType: 'pencil',
                          controlType: 'icon',
                        } as TopNavMenuIconData,
                      ]
                    : []),
                  ...(isReportingPluginInstalled && !dataSourceMDSEnabled
                    ? [
                        {
                          tooltip: i18n.translate('notebook.header.downloadPDFTooltip', {
                            defaultMessage: 'Download PDF',
                          }),
                          ariaLabel: i18n.translate('notebook.header.downloadPDFTooltip', {
                            defaultMessage: 'Download PDF',
                          }),
                          testId: 'notebook-download-pdf-icon',
                          run: () => {
                            generateInContextReport(
                              'pdf',
                              { http, notifications },
                              toggleReportingLoadingModal
                            );
                          },
                          iconType: 'download',
                          controlType: 'icon',
                        } as TopNavMenuIconData,
                      ]
                    : []),
                  {
                    tooltip: i18n.translate('notebook.deleteButton.tooltip', {
                      defaultMessage: 'Delete',
                    }),
                    ariaLabel: i18n.translate('notebook.deleteButton.tooltip', {
                      defaultMessage: 'Delete',
                    }),
                    testId: 'notebook-delete-icon',
                    run: showDeleteNotebookModal,
                    iconType: 'trash',
                    controlType: 'icon',
                  } as TopNavMenuIconData,
                ]}
                screenTitle={path}
                setMenuMountPoint={appMountService.setHeaderActionMenu}
              />
              <HeaderControl
                controls={[
                  {
                    renderComponent: (
                      <NotebookDataSourceSelector
                        dataSourceId={dataSourceId}
                        isNotebookLoading={isLoading}
                      />
                    ),
                  },
                  {
                    text: i18n.translate('notebook.header.lastUpdated', {
                      defaultMessage: 'Last updated: {time}',
                      values: {
                        time: moment(dateModified).format('MM/DD/YYYY@ h:mma'),
                      },
                    }),
                    color: 'subdued',
                  },
                ]}
                setMountPoint={appMountService.setHeaderRightControls}
              />
            </>
          )}
        </>
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
      ),
    [
      newNavigation,
      appMountService,
      isLoading,
      notifications,
      dataSourceId,
      isSavedObjectNotebook,
      showRenameModal,
      isReportingPluginInstalled,
      dataSourceMDSEnabled,
      http,
      toggleReportingLoadingModal,
      showDeleteNotebookModal,
      path,
      dateModified,
      dateCreated,
      noteActionIcons,
      showReportingContextMenu,
      reportingTopButton,
    ]
  );

  if (isEmpty(contextValue) || path === '') {
    return null;
  }

  return (
    <>
      {header}
      {showLoadingModal}
      {isModalVisible && modalLayout}
      {isSystemPromptsModalOpen && (
        <SystemPromptSettingModal
          closeModal={() => {
            setIsSystemPromptsModalOpen(false);
          }}
          dataSourceId={contextValue?.dataSourceId}
        />
      )}
    </>
  );
};
