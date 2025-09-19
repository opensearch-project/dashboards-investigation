/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiCallOut,
  EuiCard,
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
  EuiSmallButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import CSS from 'csstype';
import React, { useState, useRef } from 'react';

import { useContext } from 'react';
import { useEffectOnce, useObservable } from 'react-use';
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';

import { NoteBookServices } from 'public/types';
import { ParagraphState } from '../../../../common/state/paragraph_state';
import {
  CREATE_NOTE_MESSAGE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
  NOTEBOOKS_API_PREFIX,
} from '../../../../common/constants/notebooks';
import { NoteBookSource, NotebookType } from '../../../../common/types/notebooks';
import { getCustomModal, getDeleteModal } from './helpers/modal_containers';
import { Paragraphs } from './paragraph_components/paragraphs';
import {
  NotebookContextProvider,
  NotebookReactContext,
  getDefaultState,
} from '../context_provider/context_provider';
import { InputPanel } from './input_panel';
import { isValidUUID } from './helpers/notebooks_parser';
import { useNotebook } from '../../../hooks/use_notebook';
import { usePrecheck } from '../../../hooks/use_precheck';
import { useInvestigation } from '../../../hooks/use_investigation';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { AlertPanel } from './alert_panel';
import { GlobalPanel } from './global_panel';
import { NotebookHeader } from './notebook_header';
import { useContextSubscription } from '../../../hooks/use_context_subscription';
import { HypothesesPanel } from './hypotheses_panel';
import { HypothesisDetail } from './hypothesis/hypothesis_detail';
import { HypothesesPanel as HypothesesPanelMock } from './hypothesis/hypotheses_panel';

const panelStyles: CSS.Properties = {
  marginTop: '10px',
};

interface NotebookComponentProps {
  showPageHeader?: boolean;
}

/*
 * "Notebook" component is used to display an open notebook
 *
 * Props taken in as params are:
 * DashboardContainerByValueRenderer - Dashboard container renderer for visualization
 * http object - for making API requests
 */
export interface NotebookProps extends NotebookComponentProps {
  openedNoteId: string;
}

export function NotebookComponent({ showPageHeader }: NotebookComponentProps) {
  const {
    services: { http, notifications, application },
  } = useOpenSearchDashboards<NoteBookServices>();

  const { search } = useLocation();
  const query = parse(search);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);
  const { createParagraph, deleteParagraph } = useContext(NotebookReactContext).paragraphHooks;
  const { loadNotebook: loadNotebookHook } = useNotebook();
  const { start, setInitialGoal } = usePrecheck();

  useContextSubscription();
  const { isInvestigating, doInvestigate, addNewFinding } = useInvestigation({
    question: typeof query.question === 'string' ? query.question : '',
  });

  const notebookContext = useContext(NotebookReactContext);
  const { source } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const { id: openedNoteId, paragraphs: paragraphsStates, path, isLoading } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const { initialGoal, notebookType } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const isSavedObjectNotebook = isValidUUID(openedNoteId);
  const paraDivRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  const scrollToPara = useCallback((index: number) => {
    setTimeout(() => {
      window.scrollTo({
        left: 0,
        top: paraDivRefs.current[index]?.offsetTop,
        behavior: 'smooth',
      });
    }, 0);
  }, []);

  const handleInputPanelParagraphCreated = useCallback(() => {
    scrollToPara(paraDivRefs.current.length - 1);
  }, [scrollToPara]);

  const loadNotebook = useCallback(() => {
    loadNotebookHook()
      .then(async (res) => {
        if (res.context) {
          notebookContext.state.updateContext(res.context);
        }
        notebookContext.state.updateValue({
          dateCreated: res.dateCreated,
          path: res.path,
          vizPrefix: res.vizPrefix,
          paragraphs: res.paragraphs.map((paragraph) => new ParagraphState<unknown>(paragraph)),
          owner: res.owner,
          hypotheses: res.hypotheses,
        });
        await setInitialGoal({
          context: notebookContext.state.value.context.value,
        });
        await start({
          context: notebookContext.state.value.context.value,
          paragraphs: res.paragraphs,
        });
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error fetching notebooks, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  }, [loadNotebookHook, notifications.toasts, notebookContext.state, start, setInitialGoal]);

  useEffectOnce(() => {
    loadNotebook();
  });

  if (
    !isLoading &&
    !application.capabilities.investigation.agenticFeaturesEnabled &&
    notebookType === NotebookType.AGENTIC
  ) {
    return (
      <EuiPage direction="column">
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={<h2>Errro loading Notebook</h2>}
            body={
              <p>
                You have disabled agentic notebook in your Dashboards, please contact to your
                Administrator to open it.
              </p>
            }
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <>
      <EuiPage direction="column">
        <EuiPageBody>
          {showPageHeader && (
            <NotebookHeader
              isSavedObjectNotebook={isSavedObjectNotebook}
              loadNotebook={loadNotebook}
              showUpgradeModal={showUpgradeModal}
            />
          )}
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
          {source === NoteBookSource.ALERTING && (
            <>
              <AlertPanel />
              <EuiSpacer />
              <GlobalPanel />
              <EuiSpacer />
            </>
          )}
          <HypothesesPanel
            question={typeof query.question === 'string' ? query.question : undefined}
            isInvestigating={isInvestigating}
            doInvestigate={doInvestigate}
            addNewFinding={addNewFinding}
          />
          <EuiPageContent style={{ width: 900 }} horizontalPosition="center">
            <HypothesesPanelMock notebookId={openedNoteId} />
            {isLoading ? (
              <EuiEmptyPrompt icon={<EuiLoadingContent />} title={<h2>Loading Notebook</h2>} />
            ) : null}
            {isLoading ? null : paragraphsStates.length > 0 ? (
              paragraphsStates.map((paragraphState, index: number) => (
                <div
                  ref={(ref) => (paraDivRefs.current[index] = ref)}
                  key={`para_div_${paragraphState.value.id}`}
                >
                  {index > 0 && <EuiSpacer size="s" />}
                  <Paragraphs
                    paragraphState={paragraphState}
                    index={index}
                    deletePara={showDeleteParaModal}
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
                              onClick={() =>
                                createParagraph({
                                  index: 0,
                                  input: {
                                    inputText: '%ppl ',
                                    inputType: 'CODE',
                                  },
                                })
                              }
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
                              onClick={() =>
                                createParagraph({
                                  index: 0,
                                  input: {
                                    inputText: '',
                                    inputType: 'VISUALIZATION',
                                  },
                                })
                              }
                              style={{ marginBottom: 17 }}
                            >
                              Add visualization
                            </EuiSmallButton>
                          }
                        />
                      </EuiFlexItem>
                      {initialGoal ? (
                        <EuiFlexItem grow={3}>
                          <EuiCard
                            icon={<EuiIcon size="xxl" type="inspect" />}
                            title="Deep Research"
                            description="Use deep research to analytics question."
                            footer={
                              <EuiSmallButton
                                onClick={() =>
                                  createParagraph({
                                    index: 0,
                                    input: {
                                      inputText: initialGoal,
                                      inputType: DEEP_RESEARCH_PARAGRAPH_TYPE,
                                    },
                                  })
                                }
                                style={{ marginBottom: 17 }}
                              >
                                Add deep research
                              </EuiSmallButton>
                            }
                          />
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem grow={2} />
                    </EuiFlexGroup>
                  )}
                  <EuiSpacer size="xxl" />
                </EuiPanel>
              </div>
            )}
          </EuiPageContent>
        </EuiPageBody>
        <EuiSpacer />
        <InputPanel onParagraphCreated={handleInputPanelParagraphCreated} />
      </EuiPage>
      {isModalVisible && modalLayout}
    </>
  );
}

export const Notebook = ({ openedNoteId, ...rest }: NotebookProps) => {
  const {
    services: { dataSource },
  } = useOpenSearchDashboards<NoteBookServices>();
  const location = useLocation();
  const stateRef = useRef(
    getDefaultState({
      id: openedNoteId,
      dataSourceEnabled: !!dataSource,
    })
  );

  const isHypothesisRoute = location.pathname.includes('/hypothesis/');
  return (
    <NotebookContextProvider state={stateRef.current}>
      <>
        {isHypothesisRoute && <HypothesisDetail />}
        <div style={{ display: isHypothesisRoute ? 'none' : 'block' }}>
          <NotebookComponent {...rest} />
        </div>
      </>
    </NotebookContextProvider>
  );
};
