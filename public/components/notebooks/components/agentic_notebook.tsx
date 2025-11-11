/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingContent,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiTextArea,
} from '@elastic/eui';
import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { useEffectOnce, useObservable } from 'react-use';

import { NoteBookServices } from 'public/types';
import { ParagraphState } from '../../../../common/state/paragraph_state';
import {
  NotebookComponentProps,
  NoteBookSource,
  NotebookType,
} from '../../../../common/types/notebooks';
import { getDeleteModal } from './helpers/modal_containers';
import { Paragraphs } from './paragraph_components/paragraphs';
import {
  NotebookContextProvider,
  NotebookReactContext,
  getDefaultState,
} from '../context_provider/context_provider';
import { useNotebook } from '../../../hooks/use_notebook';
import { usePrecheck } from '../../../hooks/use_precheck';
import { useNotebookFindingIntegration } from '../../../hooks/use_notebook_finding_integration';
import { useInvestigation } from '../../../hooks/use_investigation';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { AlertPanel } from './alert_panel';
import { GlobalPanel } from './global_panel';
import { NotebookHeader } from './notebook_header';
import { SummaryCard } from './summary_card';
import { useChatContextProvider } from '../../../hooks/use_chat_context';
import { HypothesisDetail, HypothesesPanel, ReinvestigateModal } from './hypothesis';
import { SubRouter, useSubRouter } from '../../../hooks/use_sub_router';

interface AgenticNotebookProps extends NotebookComponentProps {
  openedNoteId: string;
}

function NotebookComponent({ showPageHeader }: NotebookComponentProps) {
  const {
    services: { notifications, findingService, chrome },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isReinvestigateModalVisible, setIsReinvestigateModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);
  const { createParagraph, deleteParagraph } = useContext(NotebookReactContext).paragraphHooks;
  const { loadNotebook: loadNotebookHook } = useNotebook();
  const { start, setInitialGoal } = usePrecheck();

  // provide context to chatbot
  useChatContextProvider();

  const notebookContext = useContext(NotebookReactContext);
  const { initialGoal, source, notebookType } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const { id: openedNoteId, paragraphs: paragraphsStates, isLoading } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const paraDivRefs = useRef<Array<HTMLDivElement | null>>([]);

  const {
    isInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
  } = useInvestigation();

  const [findingText, setFindingText] = useState('%md Please add your finding here');
  const [isModalVisibleAddFinding, setIsModalVisibleAddFinding] = useState(false);

  const closeModal = () => {
    setIsModalVisibleAddFinding(false);
    setFindingText('%md Please add your finding here');
  };

  const handleAddFinding = async () => {
    await addNewFinding({ text: findingText });
    closeModal();
  };

  // Initialize finding integration for automatic UI updates when findings are added
  useNotebookFindingIntegration({
    findingService,
    notebookId: openedNoteId,
  });

  useEffect(() => {
    findingService.initialize(openedNoteId);
  }, [findingService, openedNoteId]);

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

  const scrollToPara = useCallback((index: number) => {
    setTimeout(() => {
      window.scrollTo({
        left: 0,
        top: paraDivRefs.current[index]?.offsetTop,
        behavior: 'smooth',
      });
    }, 0);
  }, []);

  const loadNotebook = useCallback(() => {
    loadNotebookHook()
      .then(async (res) => {
        if (res.context) {
          notebookContext.state.updateContext(res.context);
        }
        notebookContext.state.updateValue({
          dateCreated: res.dateCreated,
          dateModified: res.dateModified,
          title: res.name,
          path: res.path,
          vizPrefix: res.vizPrefix,
          paragraphs: res.paragraphs.map((paragraph) => new ParagraphState<unknown>(paragraph)),
          owner: res.owner,
          hypotheses: res.hypotheses,
          runningMemory: res.runningMemory,
          historyMemory: res.historyMemory,
        });
        await setInitialGoal({
          context: notebookContext.state.value.context.value,
        });

        // Check if there's an ongoing investigation to continue BEFORE calling start
        // This prevents start() from triggering a new investigation when we should continue the existing one
        const hasOngoingInvestigation = res.runningMemory;

        if (res.runningMemory) {
          try {
            await continueInvestigation();
          } catch (error) {
            console.error('Failed to continue investigation:', error);
          }
        }

        // Pass a dummy hypothesis array to prevent start() from auto-triggering investigation
        // when we're continuing an existing one
        await start({
          context: notebookContext.state.value.context.value,
          paragraphs: res.paragraphs,
          hypotheses: hasOngoingInvestigation ? [{ id: 'placeholder' } as any] : res.hypotheses,
          doInvestigate,
        });
      })
      .catch((err) => {
        notifications.toasts.addDanger(
          'Error fetching notebooks, please make sure you have the correct permission.'
        );
        console.error(err);
      });
  }, [
    loadNotebookHook,
    notifications.toasts,
    notebookContext.state,
    start,
    setInitialGoal,
    doInvestigate,
    continueInvestigation,
  ]);

  useEffectOnce(() => {
    loadNotebook();

    // TODO: remove the optional chain after each method
    (chrome as any).setIsNavDrawerLocked?.(false);
    // (assistantDashboards as any)?.updateChatbotVisible?.(true);
  });

  const handleReinvestigate = useCallback(
    async (value: string, isReinvestigate: boolean) => {
      if (isReinvestigate) {
        rerunInvestigation({ investigationQuestion: value });
      } else {
        doInvestigate({ investigationQuestion: value });
      }

      setIsReinvestigateModalVisible(false);
    },
    [rerunInvestigation, doInvestigate, setIsReinvestigateModalVisible]
  );

  if (!isLoading && notebookType === NotebookType.CLASSIC) {
    return (
      <EuiPage direction="column">
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={<h2>Error loading Notebook</h2>}
            body={<p>Incorrect notebook type</p>}
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
              isSavedObjectNotebook
              loadNotebook={loadNotebook}
              showUpgradeModal={() => {}}
            />
          )}
          {source === NoteBookSource.DISCOVER && (
            <>
              <SummaryCard
                isInvestigating={isInvestigating}
                openReinvestigateModal={() => setIsReinvestigateModalVisible(true)}
              />
              <EuiSpacer />
            </>
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
            notebookId={openedNoteId}
            question={initialGoal}
            isInvestigating={isInvestigating}
            openReinvestigateModal={() => setIsReinvestigateModalVisible(true)}
          />
          <EuiSpacer />
          {isLoading ? (
            <EuiEmptyPrompt icon={<EuiLoadingContent />} title={<h2>Loading Notebook</h2>} />
          ) : null}
          {isLoading ? null : paragraphsStates.length > 0 ? (
            paragraphsStates.map((paragraphState, index: number) => {
              return (
                <div
                  ref={(ref) => (paraDivRefs.current[index] = ref)}
                  key={`para_div_${paragraphState.value.id}`}
                >
                  {index > 0 && <EuiSpacer size="s" />}
                  <EuiPanel>
                    <Paragraphs
                      index={index}
                      deletePara={showDeleteParaModal}
                      scrollToPara={scrollToPara}
                    />
                  </EuiPanel>
                </div>
              );
            })
          ) : (
            // show default paragraph if no paragraphs in this notebook
            <div
              style={{
                marginTop: '10px',
              }}
            >
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
                  <EuiFlexItem grow={2} />
                </EuiFlexGroup>

                <EuiSpacer size="xxl" />
              </EuiPanel>
            </div>
          )}

          {!isLoading && !isInvestigating && (
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexGroup justifyContent="flexStart" direction="row">
                <EuiFlexItem grow={false}>
                  <EuiSmallButton
                    disabled={isInvestigating}
                    onClick={() => {
                      setIsModalVisibleAddFinding(true);
                    }}
                  >
                    Add Finding
                  </EuiSmallButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          )}
          {isModalVisibleAddFinding && (
            <EuiModal onClose={closeModal}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>Add Finding</EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiTextArea
                  fullWidth
                  placeholder="Enter your finding here"
                  value={findingText}
                  onChange={(e) => setFindingText(e.target.value)}
                  rows={5}
                  aria-label="Add finding text area"
                />
              </EuiModalBody>

              <EuiModalFooter>
                <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>
                <EuiButton fill onClick={handleAddFinding}>
                  Add
                </EuiButton>
              </EuiModalFooter>
            </EuiModal>
          )}
        </EuiPageBody>
      </EuiPage>
      {isModalVisible && modalLayout}
      {isReinvestigateModalVisible && (
        <ReinvestigateModal
          initialGoal={initialGoal || ''}
          confirm={handleReinvestigate}
          closeModal={() => setIsReinvestigateModalVisible(false)}
        />
      )}
    </>
  );
}

export const AgenticNotebook = ({ openedNoteId, ...rest }: AgenticNotebookProps) => {
  const {
    services: { dataSource, application },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { page } = useSubRouter();
  const stateRef = useRef(
    getDefaultState({
      id: openedNoteId,
      dataSourceEnabled: !!dataSource,
    })
  );

  if (!application.capabilities.investigation.agenticFeaturesEnabled) {
    return (
      <EuiPage direction="column">
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={<h2>Error loading Notebook</h2>}
            body={<p>Agentic feature is disabled</p>}
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <NotebookContextProvider state={stateRef.current}>
      <>
        {page === SubRouter.Hypothesis && <HypothesisDetail />}
        <div style={{ display: page === SubRouter.Hypothesis ? 'none' : 'block' }}>
          <NotebookComponent {...rest} />
        </div>
      </>
    </NotebookContextProvider>
  );
};
