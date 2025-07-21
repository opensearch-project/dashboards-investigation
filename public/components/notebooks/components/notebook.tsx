/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiButtonGroup,
  EuiButtonGroupOptionProps,
  EuiButtonIcon,
  EuiCallOut,
  EuiCard,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
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
import queryString from 'query-string';
import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import {
  ChromeBreadcrumb,
  CoreStart,
  MountPoint,
  SavedObjectsStart,
} from '../../../../../../src/core/public';
import { DashboardStart } from '../../../../../../src/plugins/dashboard/public';
import { DataSourceManagementPluginSetup } from '../../../../../../src/plugins/data_source_management/public';
import { CREATE_NOTE_MESSAGE, NOTEBOOKS_API_PREFIX } from '../../../../common/constants/notebooks';
import { UI_DATE_FORMAT } from '../../../../common/constants/shared';
import { NotebookContext, ParaType } from '../../../../common/types/notebooks';
import { setNavBreadCrumbs } from '../../../../common/utils/set_nav_bread_crumbs';
import { HeaderControlledComponentsWrapper } from '../../../../public/plugin_helpers/plugin_headerControl';
import { coreRefs } from '../../../framework/core_refs';
import { GenerateReportLoadingModal } from './helpers/custom_modals/reporting_loading_modal';
import { defaultParagraphParser } from './helpers/default_parser';
import { DeleteNotebookModal, getCustomModal, getDeleteModal } from './helpers/modal_containers';
import { isValidUUID } from './helpers/notebooks_parser';
import {
  contextMenuCreateReportDefinition,
  contextMenuViewReports,
  generateInContextReport,
} from './helpers/reporting_context_menu_helper';
import { Paragraphs } from './paragraph_components/paragraphs';
import { ContextPanel } from './context_panel';
import { NotebookContextProvider } from '../context_provider/context_provider';
import { getMLCommonsTask } from '../../../utils/ml_commons_apis';
import { parseParagraphOut } from '../../../utils/paragraph';
import { isStateCompletedOrFailed } from '../../../utils/task';
import { constructDeepResearchParagraphOut } from '../../../../common/utils/paragraph';

const ParagraphTypeDeepResearch = 'DEEP_RESEARCH';

const newNavigation = coreRefs.chrome?.navGroup.getNavGroupEnabled();

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
interface NotebookProps {
  openedNoteId: string;
  DashboardContainerByValueRenderer: DashboardStart['DashboardContainerByValueRenderer'];
  http: CoreStart['http'];
  deleteNotebook: (noteList: string[], toastMessage?: string) => void;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
  dataSourceManagement: DataSourceManagementPluginSetup;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  notifications: CoreStart['notifications'];
  dataSourceEnabled: boolean;
  savedObjectsMDSClient: SavedObjectsStart;
}

interface NotebookState {
  selectedViewId: string;
  path: string;
  dateCreated: string;
  dateModified: string;
  paragraphs: any; // notebook paragraphs fetched from API
  parsedPara: ParaType[]; // paragraphs parsed to a common format
  vizPrefix: string; // prefix for visualizations in Zeppelin Adaptor
  isAddParaPopoverOpen: boolean;
  isParaActionsPopoverOpen: boolean;
  isNoteActionsPopoverOpen: boolean;
  isReportingPluginInstalled: boolean;
  isReportingActionsPopoverOpen: boolean;
  isReportingLoadingModalOpen: boolean;
  isModalVisible: boolean;
  modalLayout: React.ReactNode;
  showQueryParagraphError: boolean;
  queryParagraphErrorMessage: string;
  savedObjectNotebook: boolean;
  dataSourceMDSId: string | undefined | null;
  dataSourceMDSLabel: string | undefined | null;
  dataSourceMDSEnabled: boolean;
  context?: NotebookContext;
}
export class Notebook extends Component<NotebookProps, NotebookState> {
  private _taskSubscriptions = new Map<string, Subscription>();

  constructor(props: Readonly<NotebookProps>) {
    super(props);
    this.state = {
      selectedViewId: 'view_both',
      path: '',
      dateCreated: '',
      dateModified: '',
      paragraphs: [],
      parsedPara: [],
      vizPrefix: '',
      isAddParaPopoverOpen: false,
      isParaActionsPopoverOpen: false,
      isNoteActionsPopoverOpen: false,
      isReportingPluginInstalled: false,
      isReportingActionsPopoverOpen: false,
      isReportingLoadingModalOpen: false,
      isModalVisible: false,
      modalLayout: <EuiOverlayMask />,
      showQueryParagraphError: false,
      queryParagraphErrorMessage: '',
      savedObjectNotebook: true,
      dataSourceMDSId: null,
      dataSourceMDSLabel: null,
      dataSourceMDSEnabled: false,
      context: undefined,
    };
  }

  toggleReportingLoadingModal = (show: boolean) => {
    this.setState({ isReportingLoadingModalOpen: show });
  };

  parseAllParagraphs = () => {
    const parsedPara = this.parseParagraphs(this.state.paragraphs);
    this.setState({ parsedPara });
  };

  // parse paragraphs based on backend
  parseParagraphs = (paragraphs: any[]): ParaType[] => {
    try {
      const parsedPara = defaultParagraphParser(paragraphs);
      parsedPara.forEach((para: ParaType) => {
        para.isInputExpanded = this.state.selectedViewId === 'input_only';
        para.paraRef = React.createRef();
        para.paraDivRef = React.createRef<HTMLDivElement>();
      });
      return parsedPara;
    } catch (err) {
      this.props.notifications.toasts.addDanger(
        'Error parsing paragraphs, please make sure you have the correct permission.'
      );
      this.setState({ parsedPara: [] });
      return [];
    }
  };

  // Assigns Loading, Running & inQueue for paragraphs in current notebook
  showParagraphRunning = (param: number | string) => {
    const parsedPara = this.state.parsedPara;
    this.state.parsedPara.map((_: ParaType, index: number) => {
      if (param === 'queue') {
        parsedPara[index].inQueue = true;
        parsedPara[index].isOutputHidden = true;
      } else if (param === 'loading') {
        parsedPara[index].isRunning = true;
        parsedPara[index].isOutputHidden = true;
      } else if (param === index) {
        parsedPara[index].isRunning = true;
        parsedPara[index].isOutputHidden = true;
      }
    });
    this.setState({ parsedPara });
  };

  // Sets a paragraph to selected and deselects all others
  paragraphSelector = (index: number) => {
    const parsedPara = this.state.parsedPara;
    this.state.parsedPara.map((_: ParaType, idx: number) => {
      if (index === idx) parsedPara[idx].isSelected = true;
      else parsedPara[idx].isSelected = false;
    });
    this.setState({ parsedPara });
  };

  // Function for delete a Notebook button
  deleteParagraphButton = (para: ParaType, index: number) => {
    if (index !== -1) {
      return this.props.http
        .delete(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
          query: {
            noteId: this.props.openedNoteId,
            paragraphId: para.uniqueId,
          },
        })
        .then((_res) => {
          const paragraphs = [...this.state.paragraphs];
          paragraphs.splice(index, 1);
          const parsedPara = [...this.state.parsedPara];
          parsedPara.splice(index, 1);
          this.setState({ paragraphs, parsedPara });
        })
        .catch((err) => {
          this.props.notifications.toasts.addDanger(
            'Error deleting paragraph, please make sure you have the correct permission.'
          );
          console.error(err);
        });
    }
  };

  showDeleteParaModal = (para: ParaType, index: number) => {
    this.setState({
      modalLayout: getDeleteModal(
        () => this.setState({ isModalVisible: false }),
        () => {
          this.deleteParagraphButton(para, index);
          this.setState({ isModalVisible: false });
        },
        'Delete paragraph',
        'Are you sure you want to delete the paragraph? The action cannot be undone.'
      ),
    });
    this.setState({ isModalVisible: true });
  };

  showDeleteAllParaModal = () => {
    this.setState({
      modalLayout: getDeleteModal(
        () => this.setState({ isModalVisible: false }),
        async () => {
          this.setState({ isModalVisible: false });
          await this.props.http
            .delete(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
              query: {
                noteId: this.props.openedNoteId,
              },
            })
            .then((res) => {
              this.setState({ paragraphs: res.paragraphs });
              this.parseAllParagraphs();
              this.props.notifications.toasts.addSuccess('Paragraphs successfully deleted!');
            })
            .catch((err) => {
              this.props.notifications.toasts.addDanger(
                'Error deleting paragraph, please make sure you have the correct permission.'
              );
              console.error(err);
            });
        },
        'Delete all paragraphs',
        'Are you sure you want to delete all paragraphs? The action cannot be undone.'
      ),
    });
    this.setState({ isModalVisible: true });
  };

  showClearOutputsModal = () => {
    this.setState({
      modalLayout: getDeleteModal(
        () => this.setState({ isModalVisible: false }),
        () => {
          this.clearParagraphButton();
          this.setState({ isModalVisible: false });
        },
        'Clear all outputs',
        'Are you sure you want to clear all outputs? The action cannot be undone.',
        'Clear'
      ),
    });
    this.setState({ isModalVisible: true });
  };

  // Renames an existing notebook
  renameNotebook = async (editedNoteName: string, editedNoteID: string): Promise<any> => {
    if (editedNoteName.length >= 50 || editedNoteName.length === 0) {
      this.props.notifications.toasts.addDanger('Invalid notebook name');
      return;
    }
    const renameNoteObject = {
      name: editedNoteName,
      noteId: editedNoteID,
    };

    return this.props.http
      .put(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/rename`, {
        body: JSON.stringify(renameNoteObject),
      })
      .then((res) => {
        this.props.notifications.toasts.addSuccess(
          `Notebook successfully renamed into "${editedNoteName}"`
        );
        return res;
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error renaming notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  showRenameModal = () => {
    this.setState({
      modalLayout: getCustomModal(
        (newName: string) => {
          this.renameNotebook(newName, this.props.openedNoteId).then((res) => {
            this.setState({ isModalVisible: false });
            window.location.assign(`#/${res.id}`);
            setTimeout(() => {
              this.loadNotebook();
            }, 300);
          });
        },
        () => this.setState({ isModalVisible: false }),
        'Name',
        'Rename notebook',
        'Cancel',
        'Rename',
        this.state.path,
        CREATE_NOTE_MESSAGE
      ),
    });
    this.setState({ isModalVisible: true });
  };

  // Clones an existing notebook, return new notebook's id
  cloneNotebook = async (clonedNoteName: string, clonedNoteID: string): Promise<string> => {
    if (clonedNoteName.length >= 50 || clonedNoteName.length === 0) {
      this.props.notifications.toasts.addDanger('Invalid notebook name');
      return Promise.reject();
    }
    const cloneNoteObject = {
      name: clonedNoteName,
      noteId: clonedNoteID,
    };

    return this.props.http
      .post(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook/clone`, {
        body: JSON.stringify(cloneNoteObject),
      })
      .then((res) => {
        this.props.notifications.toasts.addSuccess(
          `Notebook "${clonedNoteName}" successfully created!`
        );
        return res.id;
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error cloning notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  migrateNotebook = async (migrateNoteName: string, migrateNoteID: string): Promise<string> => {
    if (migrateNoteName.length >= 50 || migrateNoteName.length === 0) {
      this.props.notifications.toasts.addDanger('Invalid notebook name');
      return Promise.reject();
    }
    const migrateNoteObject = {
      name: migrateNoteName,
      noteId: migrateNoteID,
    };
    return this.props.http
      .post(`${NOTEBOOKS_API_PREFIX}/note/migrate`, {
        body: JSON.stringify(migrateNoteObject),
      })
      .then((res) => {
        this.props.notifications.toasts.addSuccess(
          `Notebook "${migrateNoteName}" successfully created!`
        );
        return res.id;
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error migrating notebook, please make sure you have the correct permission.'
        );
        console.error(err.body.message);
      });
  };

  showCloneModal = () => {
    this.setState({
      modalLayout: getCustomModal(
        (newName: string) => {
          this.cloneNotebook(newName, this.props.openedNoteId).then((id: string) => {
            window.location.assign(`#/${id}`);
            setTimeout(() => {
              this.loadNotebook();
            }, 300);
          });
          this.setState({ isModalVisible: false });
        },
        () => this.setState({ isModalVisible: false }),
        'Name',
        'Duplicate notebook',
        'Cancel',
        'Duplicate',
        this.state.path + ' (copy)',
        CREATE_NOTE_MESSAGE
      ),
    });
    this.setState({ isModalVisible: true });
  };

  showUpgradeModal = () => {
    this.setState({
      modalLayout: getCustomModal(
        (newName: string) => {
          this.migrateNotebook(newName, this.props.openedNoteId).then((id: string) => {
            window.location.assign(`#/${id}`);
            setTimeout(() => {
              this.loadNotebook();
            }, 300);
          });
          this.setState({ isModalVisible: false });
        },
        () => this.setState({ isModalVisible: false }),
        'Name',
        'Upgrade notebook',
        'Cancel',
        'Upgrade',
        this.state.path + ' (upgraded)',
        CREATE_NOTE_MESSAGE
      ),
    });
    this.setState({ isModalVisible: true });
  };

  showDeleteNotebookModal = () => {
    this.setState({
      modalLayout: (
        <DeleteNotebookModal
          onConfirm={async () => {
            const toastMessage = `Notebook "${this.state.path}" successfully deleted!`;
            await this.props.deleteNotebook([this.props.openedNoteId], toastMessage);
            this.setState({ isModalVisible: false }, () =>
              setTimeout(() => {
                this.props.history.push('.');
              }, 1000)
            );
          }}
          onCancel={() => this.setState({ isModalVisible: false })}
          title={`Delete notebook "${this.state.path}"`}
          message="Delete notebook will remove all contents in the paragraphs."
        />
      ),
    });
    this.setState({ isModalVisible: true });
  };

  // Function for delete Visualization from notebook
  deleteVizualization = (uniqueId: string) => {
    this.props.http
      .delete(
        `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph/` +
          this.props.openedNoteId +
          '/' +
          uniqueId
      )
      .then((res) => {
        this.setState({ paragraphs: res.paragraphs });
        this.parseAllParagraphs();
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error deleting visualization, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  // Backend call to add a paragraph, switch to "view both" if in output only view
  addPara = (index: number, newParaContent: string, inpType: string) => {
    const addParaObj = {
      noteId: this.props.openedNoteId,
      paragraphIndex: index,
      paragraphInput: newParaContent,
      inputType: inpType,
    };

    return this.props.http
      .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
        body: JSON.stringify(addParaObj),
      })
      .then((res) => {
        const paragraphs = [...this.state.paragraphs];
        paragraphs.splice(index, 0, res);
        const newPara = this.parseParagraphs([res])[0];
        newPara.isInputExpanded = true;
        const parsedPara = [...this.state.parsedPara];
        parsedPara.splice(index, 0, newPara);

        this.setState({ paragraphs, parsedPara });
        this.paragraphSelector(index);
        if (this.state.selectedViewId === 'output_only')
          this.setState({ selectedViewId: 'view_both' });
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error adding paragraph, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  // Function to clone a paragraph
  cloneParaButton = (para: ParaType, index: number) => {
    let inputType = 'CODE';
    if (para.typeOut[0] === 'VISUALIZATION') {
      inputType = 'VISUALIZATION';
    }
    if (para.typeOut[0] === 'OBSERVABILITY_VISUALIZATION') {
      inputType = 'OBSERVABILITY_VISUALIZATION';
    }
    if (index !== -1) {
      return this.addPara(index, para.inp, inputType);
    }
  };

  // Function to move a paragraph
  movePara = (index: number, targetIndex: number) => {
    const paragraphs = [...this.state.paragraphs];
    paragraphs.splice(targetIndex, 0, paragraphs.splice(index, 1)[0]);
    const parsedPara = [...this.state.parsedPara];
    parsedPara.splice(targetIndex, 0, parsedPara.splice(index, 1)[0]);

    const moveParaObj = {
      noteId: this.props.openedNoteId,
      paragraphs,
    };

    return this.props.http
      .post(`${NOTEBOOKS_API_PREFIX}/savedNotebook/set_paragraphs`, {
        body: JSON.stringify(moveParaObj),
      })
      .then((_res) => this.setState({ paragraphs, parsedPara }))
      .then((_res) => this.scrollToPara(targetIndex))
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error moving paragraphs, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  scrollToPara(index: number) {
    setTimeout(() => {
      window.scrollTo({
        left: 0,
        top: this.state.parsedPara[index].paraDivRef.current?.offsetTop,
        behavior: 'smooth',
      });
    }, 0);
  }

  // Function for clearing outputs button
  clearParagraphButton = () => {
    this.showParagraphRunning('loading');
    const clearParaObj = {
      noteId: this.props.openedNoteId,
    };
    this.props.http
      .put(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph/clearall`, {
        body: JSON.stringify(clearParaObj),
      })
      .then((res) => {
        this.setState({ paragraphs: res.paragraphs });
        this.parseAllParagraphs();
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error clearing paragraphs, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  updateBubbleParagraph = async (index: number, paraUniqueId: string, result: string) => {
    try {
      const response = await this.props.http.put(
        `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`,
        {
          body: JSON.stringify({
            noteId: this.props.openedNoteId,
            paragraphId: paraUniqueId,
            paragraphOutput: [
              {
                outputType: 'ANOMALY_VISUALIZATION_ANALYSIS',
                result,
              },
            ],
          }),
        }
      );

      const paragraphs = this.state.paragraphs;
      paragraphs[index] = response;
      const parsedPara = [...this.state.parsedPara];
      parsedPara[index] = this.parseParagraphs([response])[0];

      this.setState({ paragraphs, parsedPara });
      return response;
    } catch (error) {
      console.error('Failed to update bubble paragraph:', error);
      throw error;
    }
  };

  updateNotebookContext = async (newContext: any) => {
    try {
      const response = await this.props.http.put(
        `${NOTEBOOKS_API_PREFIX}/note/updateNotebookContext`,
        {
          body: JSON.stringify({
            notebookId: this.props.openedNoteId,
            context: newContext,
          }),
        }
      );

      return response;
    } catch (error) {
      console.error('Error updating notebook context:', error);
      throw error;
    }
  };

  private _registerDeepResearchParagraphUpdater = ({
    taskId,
    paraUniqueId,
    agentId,
    baseMemoryId,
  }: {
    taskId: string;
    paraUniqueId: string;
    agentId: string;
    baseMemoryId?: string | undefined;
  }) => {
    const cleanTaskSubscription = () => {
      this._taskSubscriptions.get(taskId)?.unsubscribe();
      this._taskSubscriptions.delete(taskId);
    };
    this._taskSubscriptions.set(
      taskId,
      timer(0, 5000)
        .pipe(
          switchMap(() => {
            const parsePara = this.state.parsedPara.find((para) => para.uniqueId === paraUniqueId);
            if (!parsePara) {
              return 'STOP';
            }
            return getMLCommonsTask({
              http: this.props.http,
              taskId,
              dataSourceId: parsePara.dataSourceMDSId,
            });
          })
        )
        .pipe(takeWhile((res) => res !== 'STOP' && !isStateCompletedOrFailed(res.state), true))
        .subscribe({
          next: (payload) => {
            if (payload === 'STOP') {
              cleanTaskSubscription();
              return;
            }
            const currentParsedParaIndex = this.state.parsedPara.findIndex(
              (para) => para.uniqueId === paraUniqueId
            );
            const result = JSON.stringify(
              constructDeepResearchParagraphOut({
                task: payload,
                taskId,
                agentId,
                baseMemoryId,
              })
            );
            if (
              !isStateCompletedOrFailed(payload.state) &&
              result === this.state.parsedPara[currentParsedParaIndex]?.out[0]
            ) {
              return;
            }
            if (isStateCompletedOrFailed(payload.state)) {
              cleanTaskSubscription();
            }
            const out = [result];
            this.setState({
              parsedPara: [
                ...this.state.parsedPara.slice(0, currentParsedParaIndex),
                {
                  ...this.state.parsedPara[currentParsedParaIndex],
                  out,
                  isRunning: false,
                },
                ...this.state.parsedPara.slice(currentParsedParaIndex + 1),
              ],
            });
            this.props.http.put(`${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph`, {
              body: JSON.stringify({
                noteId: this.props.openedNoteId,
                paragraphId: paraUniqueId,
                paragraphOutput: [
                  {
                    outputType: 'DEEP_RESEARCH',
                    result,
                  },
                ],
              }),
            });
          },
          error: (...args) => {
            console.log('Failed to fetch task status', ...args);
            cleanTaskSubscription();
          },
        })
    );
  };

  // Backend call to update and run contents of paragraph
  updateRunParagraph = (
    para: ParaType,
    index: number,
    vizObjectInput?: string,
    paraType?: string,
    _dataSourceMDSId?: string,
    deepResearchAgentId?: string,
    deepResearchBaseMemoryId?: string
  ) => {
    this.showParagraphRunning(index);
    if (vizObjectInput) {
      para.inp = this.state.vizPrefix + vizObjectInput; // "%sh check"
    }

    const paraUpdateObject = {
      noteId: this.props.openedNoteId,
      paragraphId: para.uniqueId,
      paragraphInput: para.inp,
      paragraphType: paraType || '',
      dataSourceMDSId: this.state.dataSourceMDSId || '',
      dataSourceMDSLabel: this.state.dataSourceMDSLabel || '',
      deepResearchAgentId,
      deepResearchBaseMemoryId,
    };
    const isValid = isValidUUID(this.props.openedNoteId);
    const route = isValid
      ? `${NOTEBOOKS_API_PREFIX}/savedNotebook/paragraph/update/run`
      : `${NOTEBOOKS_API_PREFIX}/paragraph/update/run/`;
    return this.props.http
      .post(route, {
        body: JSON.stringify(paraUpdateObject),
      })
      .then(async (res) => {
        if (res.output[0]?.outputType === 'QUERY') {
          await this.loadQueryResultsFromInput(res, this.state.dataSourceMDSId);
          const checkErrorJSON = JSON.parse(res.output[0].result);
          if (this.checkQueryOutputError(checkErrorJSON)) {
            return;
          }
        }
        const legacyParsedParagraphData = this.state.parsedPara[index];
        const paragraphs = this.state.paragraphs;
        paragraphs[index] = res;
        const parsedPara = [...this.state.parsedPara];
        parsedPara[index] = this.parseParagraphs([res])[0];

        if (res.output[0]?.outputType === 'DEEP_RESEARCH') {
          parsedPara[index].isRunning = true;
          const legacyParsedParagraphOut = parseParagraphOut(legacyParsedParagraphData)[0];
          const legacyTaskId = legacyParsedParagraphOut?.task_id;
          if (legacyTaskId) {
            this._taskSubscriptions.get(legacyTaskId)?.unsubscribe();
            this._taskSubscriptions.delete(legacyTaskId);
          }
          const taskId = parseParagraphOut(parsedPara[index])[0]?.task_id;
          this._registerDeepResearchParagraphUpdater({
            taskId,
            paraUniqueId: para.uniqueId,
            agentId: deepResearchAgentId ?? '',
            baseMemoryId: deepResearchBaseMemoryId,
          });
        }
        this.setState({ paragraphs, parsedPara });
      })
      .catch((err) => {
        console.log(err);
        if (err.body.statusCode === 413)
          this.props.notifications.toasts.addDanger(`Error running paragraph: ${err.body.message}`);
        else
          this.props.notifications.toasts.addDanger(
            'Error running paragraph, please make sure you have the correct permission.'
          );
      });
  };

  checkQueryOutputError = (checkErrorJSON: JSON) => {
    // if query output has error output
    if (checkErrorJSON.hasOwnProperty('error')) {
      this.setState({
        showQueryParagraphError: true,
        queryParagraphErrorMessage: checkErrorJSON.error.reason,
      });
      return true;
    }
    // query ran successfully, reset error variables if currently set to true
    else if (this.state.showQueryParagraphError) {
      this.setState({
        showQueryParagraphError: false,
        queryParagraphErrorMessage: '',
      });
      return false;
    }
  };

  runForAllParagraphs = (reducer: (para: ParaType, _index: number) => Promise<any>) => {
    return this.state.parsedPara
      .map((para: ParaType, _index: number) => () => reducer(para, _index))
      .reduce((chain, func) => chain.then(func), Promise.resolve());
  };

  // Handles text editor value and syncs with paragraph input
  textValueEditor = (evt: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    if (!(evt.key === 'Enter' && evt.shiftKey)) {
      const parsedPara = this.state.parsedPara;
      parsedPara[index].inp = evt.target.value;
      this.setState({ parsedPara });
    }
  };

  // Handles run paragraph shortcut "Shift+Enter"
  handleKeyPress = (evt: React.KeyboardEvent<Element>, para: ParaType, index: number) => {
    if (evt.key === 'Enter' && evt.shiftKey) {
      this.updateRunParagraph(para, index);
    }
  };

  // update view mode, scrolls to paragraph and expands input if scrollToIndex is given
  updateView = (selectedViewId: string, scrollToIndex?: number) => {
    this.configureViewParameter(selectedViewId);
    const parsedPara = [...this.state.parsedPara];
    this.state.parsedPara.map((para: ParaType, index: number) => {
      parsedPara[index].isInputExpanded = selectedViewId === 'input_only';
    });

    if (scrollToIndex !== undefined) {
      parsedPara[scrollToIndex].isInputExpanded = true;
      this.scrollToPara(scrollToIndex);
    }
    this.setState({ parsedPara, selectedViewId });
    this.paragraphSelector(scrollToIndex !== undefined ? scrollToIndex : -1);
  };

  loadNotebook = async () => {
    this.showParagraphRunning('queue');
    const isValid = isValidUUID(this.props.openedNoteId);
    this.setState({
      savedObjectNotebook: isValid,
      dataSourceMDSEnabled: isValid && this.props.dataSourceEnabled,
    });
    const route = isValid
      ? `${NOTEBOOKS_API_PREFIX}/note/savedNotebook/${this.props.openedNoteId}`
      : `${NOTEBOOKS_API_PREFIX}/note/${this.props.openedNoteId}`;
    this.props.http
      .get(route)
      .then(async (res) => {
        this.setBreadcrumbs(res.path);
        let index = 0;
        for (index = 0; index < res.paragraphs.length; ++index) {
          // if the paragraph is a query, load the query output
          if (
            res.paragraphs[index].output[0]?.outputType === 'QUERY' &&
            this.props.dataSourceEnabled &&
            res.paragraphs[index].dataSourceMDSId
          ) {
            await this.loadQueryResultsFromInput(
              res.paragraphs[index],
              res.paragraphs[index].dataSourceMDSId
            );
          } else if (
            res.paragraphs[index].output[0]?.outputType === 'QUERY' &&
            !this.props.dataSourceEnabled &&
            res.paragraphs[index].dataSourceMDSId
          ) {
            res.paragraphs[index].output[0] = [];
            this.props.notifications.toasts.addDanger(
              `Data source ${res.paragraphs[index].dataSourceMDSLabel} is not available. Please configure your dataSources`
            );
          } else if (
            res.paragraphs[index].output[0]?.outputType === 'QUERY' &&
            !this.state.savedObjectNotebook
          ) {
            await this.loadQueryResultsFromInput(res.paragraphs[index]);
          } else if (res.paragraphs[index].output[0]?.outputType === 'QUERY') {
            await this.loadQueryResultsFromInput(res.paragraphs[index], '');
          } else if (res.paragraphs[index].output[0]?.outputType === 'DEEP_RESEARCH') {
            const currentResult = res.paragraphs[index].output[0]?.result;
            if (!currentResult) {
              continue;
            }
            const {
              task_id: taskId,
              agent_id: agentId,
              state,
              base_memory_id: baseMemoryId,
            } = JSON.parse(currentResult);
            const paragraphId = res.paragraphs[index].id;

            if (isStateCompletedOrFailed(state)) {
              continue;
            }

            this._registerDeepResearchParagraphUpdater({
              taskId,
              agentId,
              paraUniqueId: paragraphId,
              baseMemoryId,
            });
          }
        }
        this.setState(res, this.parseAllParagraphs);
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger(
          'Error fetching notebooks, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  };

  handleSelectedDataSourceChange = (id: string | undefined, label: string | undefined) => {
    this.setState({ dataSourceMDSId: id, dataSourceMDSLabel: label });
  };

  loadQueryResultsFromInput = async (paragraph: any, dataSourceMDSId?: any) => {
    const queryType =
      paragraph.input.inputText.substring(0, 4) === '%sql' ? 'sqlquery' : 'pplquery';
    const query = {
      dataSourceMDSId,
    };
    await this.props.http
      .post(`/api/investigation/sql/${queryType}`, {
        body: JSON.stringify(paragraph.output[0].result),
        ...(this.props.dataSourceEnabled && { query }),
      })
      .then((response) => {
        paragraph.output[0].result = response.data.resp || JSON.stringify({ error: 'no response' });
        return paragraph;
      })
      .catch((err) => {
        this.props.notifications.toasts.addDanger('Error getting query output');
        console.error(err);
      });
  };

  setPara = (para: ParaType, index: number) => {
    const parsedPara = [...this.state.parsedPara];
    parsedPara.splice(index, 1, para);
    this.setState({ parsedPara });
  };

  setBreadcrumbs(path: string) {
    setNavBreadCrumbs(
      [],
      [
        {
          text: 'Notebooks',
          href: '#/',
        },
        {
          text: path,
          href: `#/${this.props.openedNoteId}`,
        },
      ]
    );
  }

  checkIfReportingPluginIsInstalled() {
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
            this.setState({ isReportingPluginInstalled: true });
          }
        }
      })
      .catch((error) => {
        this.props.notifications.toasts.addDanger(
          'Error checking Reporting Plugin Installation status.'
        );
        console.error(error);
      });
  }

  configureViewParameter(id: string) {
    this.props.history.replace({
      ...this.props.location,
      search: `view=${id}`,
    });
  }

  componentDidMount() {
    this.setBreadcrumbs('');
    this.loadNotebook();
    this.checkIfReportingPluginIsInstalled();
    const searchParams = queryString.parse(this.props.location.search);
    const view = searchParams.view;
    if (!view) {
      this.configureViewParameter('view_both');
    }
    if (view === 'output_only') {
      this.setState({ selectedViewId: 'output_only' });
    } else if (view === 'input_only') {
      this.setState({ selectedViewId: 'input_only' });
    }
  }

  render() {
    const viewOptions: EuiButtonGroupOptionProps[] = [
      {
        id: 'view_both',
        label: 'View both',
      },
      {
        id: 'input_only',
        label: 'Input only',
      },
      {
        id: 'output_only',
        label: 'Output only',
      },
    ];
    const addParaPanels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Type',
        items: [
          {
            name: 'Code block',
            onClick: () => {
              this.setState({ isAddParaPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', 'CODE');
            },
            'data-test-subj': 'AddCodeBlockBtn',
          },
          {
            name: 'Visualization',
            onClick: () => {
              this.setState({ isAddParaPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', 'VISUALIZATION');
            },
            'data-test-subj': 'AddVisualizationBlockBtn',
          },
          {
            name: 'Deep Research',
            onClick: () => {
              this.setState({ isAddParaPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', ParagraphTypeDeepResearch);
            },
            'data-test-subj': 'AddDeepSearchBlockBtn',
          },
        ],
      },
    ];

    const renderParaActionButtons = () => {
      const { parsedPara, selectedViewId } = this.state;

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSmallButton
              onClick={() => {
                this.setState({ isParaActionsPopoverOpen: false });
                this.showDeleteAllParaModal();
              }}
              isDisabled={parsedPara.length === 0}
            >
              Delete all paragraphs
            </EuiSmallButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSmallButton
              onClick={() => {
                this.setState({ isParaActionsPopoverOpen: false });
                this.showClearOutputsModal();
              }}
              isDisabled={parsedPara.length === 0}
            >
              Clear all outputs
            </EuiSmallButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSmallButton
              onClick={() => {
                this.setState({ isParaActionsPopoverOpen: false });
                this.runForAllParagraphs((para: ParaType, _index: number) => {
                  return para.paraRef.current?.runParagraph();
                });
                if (selectedViewId === 'input_only') {
                  this.updateView('view_both');
                }
              }}
              isDisabled={parsedPara.length === 0}
            >
              Run all paragraphs
            </EuiSmallButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    const paraActionsPanels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Add paragraph',
        items: [
          {
            name: 'To top',
            panel: 1,
          },
          {
            name: 'To bottom',
            panel: 2,
          },
        ],
      },
      {
        id: 1,
        title: 'Add to top',
        items: [
          {
            name: 'Code block',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(0, '', 'CODE');
            },
          },
          {
            name: 'Visualization',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(0, '', 'VISUALIZATION');
            },
          },
          {
            name: 'DeepResearch',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(0, '', ParagraphTypeDeepResearch);
            },
          },
        ],
      },
      {
        id: 2,
        title: 'Add to bottom',
        items: [
          {
            name: 'Code block',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', 'CODE');
            },
          },
          {
            name: 'Visualization',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', 'VISUALIZATION');
            },
          },
          {
            name: 'DeepResearch',
            onClick: () => {
              this.setState({ isParaActionsPopoverOpen: false });
              this.addPara(this.state.paragraphs.length, '', ParagraphTypeDeepResearch);
            },
          },
        ],
      },
    ];

    const reportingActionPanels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: 'Reporting',
        items: [
          {
            name: 'Download PDF',
            icon: <EuiIcon type="download" data-test-subj="download-notebook-pdf" />,
            onClick: () => {
              this.setState({ isReportingActionsPopoverOpen: false });
              generateInContextReport('pdf', this.props, this.toggleReportingLoadingModal);
            },
          },
          {
            name: 'Download PNG',
            icon: <EuiIcon type="download" />,
            onClick: () => {
              this.setState({ isReportingActionsPopoverOpen: false });
              generateInContextReport('png', this.props, this.toggleReportingLoadingModal);
            },
          },
          {
            name: 'Create report definition',
            icon: <EuiIcon type="calendar" />,
            onClick: () => {
              this.setState({ isReportingActionsPopoverOpen: false });
              contextMenuCreateReportDefinition(window.location.href);
            },
          },
          {
            name: 'View reports',
            icon: <EuiIcon type="document" />,
            onClick: () => {
              this.setState({ isReportingActionsPopoverOpen: false });
              contextMenuViewReports();
            },
          },
        ],
      },
    ];

    const showReportingContextMenu =
      this.state.isReportingPluginInstalled && !this.state.dataSourceMDSEnabled ? (
        <div>
          <EuiPopover
            panelPaddingSize="none"
            button={
              <EuiSmallButton
                data-test-subj="reporting-actions-button"
                id="reportingActionsButton"
                iconType="arrowDown"
                iconSide="right"
                onClick={() =>
                  this.setState({
                    isReportingActionsPopoverOpen: !this.state.isReportingActionsPopoverOpen,
                  })
                }
              >
                Reporting
              </EuiSmallButton>
            }
            isOpen={this.state.isReportingActionsPopoverOpen}
            closePopover={() => this.setState({ isReportingActionsPopoverOpen: false })}
          >
            <EuiContextMenu initialPanelId={0} panels={reportingActionPanels} size="s" />
          </EuiPopover>
        </div>
      ) : null;

    const showLoadingModal = this.state.isReportingLoadingModalOpen ? (
      <GenerateReportLoadingModal setShowLoading={this.toggleReportingLoadingModal} />
    ) : null;

    const noteActionIcons = (
      <EuiFlexGroup gutterSize="s">
        {this.state.savedObjectNotebook ? (
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
                  onClick={this.showDeleteNotebookModal}
                  data-test-subj="notebook-delete-icon"
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
                  onClick={this.showRenameModal}
                  data-test-subj="notebook-edit-icon"
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
                  onClick={this.showCloneModal}
                  data-test-subj="notebook-duplicate-icon"
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
                  onClick={this.showDeleteNotebookModal}
                  data-test-subj="notebook-delete-icon"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    );

    const reportingTopButton = !this.state.savedObjectNotebook ? (
      <EuiFlexItem grow={false}>
        <EuiSmallButton
          fill
          data-test-subj="upgrade-notebook-callout"
          onClick={() => this.showUpgradeModal()}
        >
          Upgrade Notebook
        </EuiSmallButton>
      </EuiFlexItem>
    ) : null;

    const notebookHeader = newNavigation ? (
      <HeaderControlledComponentsWrapper
        description={`Created on ${moment(this.state.dateCreated).format(UI_DATE_FORMAT)}`}
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
            <h3 data-test-subj="notebookTitle">{this.state.path}</h3>
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
            <p>{`Created on ${moment(this.state.dateCreated).format(UI_DATE_FORMAT)}`}</p>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </div>
    );

    return (
      <NotebookContextProvider contextInput={this.state.context}>
        <>
          <EuiPage>
            <EuiPageBody component="div">
              {notebookHeader}
              {!this.state.savedObjectNotebook && (
                <EuiFlexItem>
                  <EuiCallOut color="primary" iconType="iInCircle">
                    Upgrade this notebook to take full advantage of the latest features
                    <EuiSpacer size="s" />
                    <EuiSmallButton
                      data-test-subj="upgrade-notebook"
                      onClick={() => this.showUpgradeModal()}
                    >
                      Upgrade Notebook
                    </EuiSmallButton>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
              {!this.state.savedObjectNotebook && <EuiSpacer size="s" />}
              <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
                {this.state.parsedPara.length > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      buttonSize="s"
                      options={viewOptions}
                      idSelected={this.state.selectedViewId}
                      onChange={(id) => {
                        this.updateView(id);
                      }}
                      legend="notebook view buttons"
                    />
                  </EuiFlexItem>
                ) : (
                  <EuiFlexItem />
                )}
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    {this.state.savedObjectNotebook && renderParaActionButtons()}
                    {this.state.savedObjectNotebook && (
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          panelPaddingSize="none"
                          button={
                            <EuiSmallButton
                              fill
                              data-test-subj="notebook-paragraph-actions-button"
                              iconType="arrowDown"
                              iconSide="right"
                              onClick={() =>
                                this.setState({
                                  isParaActionsPopoverOpen: !this.state.isParaActionsPopoverOpen,
                                })
                              }
                            >
                              Add paragraph
                            </EuiSmallButton>
                          }
                          isOpen={this.state.isParaActionsPopoverOpen}
                          closePopover={() => this.setState({ isParaActionsPopoverOpen: false })}
                        >
                          <EuiContextMenu initialPanelId={0} panels={paraActionsPanels} size="s" />
                        </EuiPopover>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <ContextPanel addPara={this.addPara} />
              {this.state.parsedPara.length > 0 ? (
                <>
                  {this.state.parsedPara.map((para: ParaType, index: number) => (
                    <div
                      ref={this.state.parsedPara[index].paraDivRef}
                      key={`para_div_${para.uniqueId}`}
                      style={panelStyles}
                    >
                      <Paragraphs
                        ref={this.state.parsedPara[index].paraRef}
                        para={para}
                        setPara={(pr: ParaType) => this.setPara(pr, index)}
                        dateModified={this.state.paragraphs[index]?.dateModified}
                        index={index}
                        paraCount={this.state.parsedPara.length}
                        paragraphSelector={this.paragraphSelector}
                        textValueEditor={this.textValueEditor}
                        handleKeyPress={this.handleKeyPress}
                        addPara={this.addPara}
                        DashboardContainerByValueRenderer={
                          this.props.DashboardContainerByValueRenderer
                        }
                        deleteVizualization={this.deleteVizualization}
                        http={this.props.http}
                        selectedViewId={this.state.selectedViewId}
                        setSelectedViewId={this.updateView}
                        deletePara={this.showDeleteParaModal}
                        runPara={this.updateRunParagraph}
                        clonePara={this.cloneParaButton}
                        movePara={this.movePara}
                        showQueryParagraphError={this.state.showQueryParagraphError}
                        queryParagraphErrorMessage={this.state.queryParagraphErrorMessage}
                        dataSourceManagement={this.props.dataSourceManagement}
                        setActionMenu={this.props.setActionMenu}
                        notifications={this.props.notifications}
                        dataSourceEnabled={this.state.dataSourceMDSEnabled}
                        savedObjectsMDSClient={this.props.savedObjectsMDSClient}
                        handleSelectedDataSourceChange={this.handleSelectedDataSourceChange}
                        paradataSourceMDSId={this.state.parsedPara[index].dataSourceMDSId}
                        dataSourceMDSLabel={this.state.parsedPara[index].dataSourceMDSLabel}
                        paragraphs={this.state.parsedPara}
                        updateBubbleParagraph={this.updateBubbleParagraph}
                        updateNotebookContext={this.updateNotebookContext}
                      />
                    </div>
                  ))}
                  {this.state.selectedViewId !== 'output_only' && this.state.savedObjectNotebook && (
                    <>
                      <EuiSpacer />
                      <EuiPopover
                        panelPaddingSize="none"
                        button={
                          <EuiSmallButton
                            data-test-subj="AddParagraphButton"
                            iconType="arrowDown"
                            iconSide="right"
                            onClick={() => this.setState({ isAddParaPopoverOpen: true })}
                          >
                            Add paragraph
                          </EuiSmallButton>
                        }
                        isOpen={this.state.isAddParaPopoverOpen}
                        closePopover={() => this.setState({ isAddParaPopoverOpen: false })}
                      >
                        <EuiContextMenu initialPanelId={0} panels={addParaPanels} size="s" />
                      </EuiPopover>
                    </>
                  )}
                </>
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
                    {this.state.savedObjectNotebook && (
                      <EuiFlexGroup justifyContent="spaceEvenly">
                        <EuiFlexItem grow={2} />
                        <EuiFlexItem grow={3}>
                          <EuiCard
                            icon={<EuiIcon size="xxl" type="editorCodeBlock" />}
                            title="Code block"
                            description="Write contents directly using markdown, SQL or PPL."
                            footer={
                              <EuiSmallButton
                                data-test-subj="emptyNotebookAddCodeBlockBtn"
                                onClick={() => this.addPara(0, '', 'CODE')}
                                style={{ marginBottom: 17 }}
                              >
                                Add code block
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
                                onClick={() => this.addPara(0, '', 'VISUALIZATION')}
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
                                onClick={() => this.addPara(0, '', ParagraphTypeDeepResearch)}
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
            </EuiPageBody>
          </EuiPage>
          {this.state.isModalVisible && this.state.modalLayout}
        </>
      </NotebookContextProvider>
    );
  }
}
