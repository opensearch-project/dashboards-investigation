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

import type { NoteBookServices } from 'public/types';

import { CREATE_NOTE_MESSAGE, NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { UI_DATE_FORMAT } from '../../../../common/constants/shared';
import { HeaderControlledComponentsWrapper } from '../../../plugin_helpers/plugin_headerControl';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NotebookReactContext } from '../context_provider/context_provider';

import { GenerateReportLoadingModal } from './helpers/custom_modals/reporting_loading_modal';
import { DeleteNotebookModal, getCustomModal } from './helpers/modal_containers';
import {
  contextMenuCreateReportDefinition,
  contextMenuViewReports,
  generateInContextReport,
} from './helpers/reporting_context_menu_helper';
import { ToggleSystemPromptSettingModal } from './helpers/custom_modals/toggle_system_prompt_setting_modal';

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
    services: { http, notifications, chrome },
  } = useOpenSearchDashboards<NoteBookServices>();
  const newNavigation = chrome.navGroup.getNavGroupEnabled();
  const notebookContext = useContext(NotebookReactContext);
  const { dataSourceEnabled, id: openedNoteId, path, dateCreated } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const [isReportingPluginInstalled, setIsReportingPluginInstalled] = useState(false);
  const [isReportingActionsPopoverOpen, setIsReportingActionsPopoverOpen] = useState(false);
  const [isReportingLoadingModalOpen, setIsReportingLoadingModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);

  const dataSourceMDSEnabled = useMemo(() => dataSourceEnabled && isSavedObjectNotebook, [
    dataSourceEnabled,
    isSavedObjectNotebook,
  ]);

  const toggleReportingLoadingModal = (show: boolean) => {
    setIsReportingLoadingModalOpen(show);
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

  const noteActionIcons = (
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
  );

  const showLoadingModal = isReportingLoadingModalOpen ? (
    <GenerateReportLoadingModal setShowLoading={toggleReportingLoadingModal} />
  ) : null;

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
    checkIfReportingPluginIsInstalled();
  }, [checkIfReportingPluginIsInstalled, chrome]);

  const header = newNavigation ? (
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
      {header}
      {showLoadingModal}
      {isModalVisible && modalLayout}
    </>
  );
};
