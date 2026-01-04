/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
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
  InvestigationTimeRange,
  NotebookComponentProps,
  NoteBookSource,
  NotebookType,
} from '../../../../common/types/notebooks';
import { getDeleteModal } from './helpers/modal_containers';
import { Paragraph } from './paragraph_components/paragraph';
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
import { NotebookHeader } from './notebook_header';
import { SummaryCard } from './summary_card';
import { useChatContextProvider } from '../../../hooks/use_chat_context';
import { HypothesisDetail, HypothesesPanel, ReinvestigateModal } from './hypothesis';
import { SubRouter, useSubRouter } from '../../../hooks/use_sub_router';
import { InvestigationPageContext } from './investigation_page_context';

interface AgenticNotebookProps extends NotebookComponentProps {
  openedNoteId: string;
}

function NotebookComponent({ showPageHeader }: NotebookComponentProps) {
  const {
    services: {
      notifications,
      findingService,
      chrome,
      chat,
      uiSettings,
      contextProvider,
      workspaces,
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isReinvestigateModalVisible, setIsReinvestigateModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);
  const { deleteParagraph } = useContext(NotebookReactContext).paragraphHooks;
  const { loadNotebook: loadNotebookHook, updateNotebookContext } = useNotebook();
  const { start, rerun: rerunPrecheck } = usePrecheck();

  // provide context to chatbot
  useChatContextProvider();

  const notebookContext = useContext(NotebookReactContext);
  const { initialGoal, source, notebookType, timeRange, dataSourceId } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const {
    id: openedNoteId,
    paragraphs: paragraphsStates,
    isLoading,
    isNotebookReadonly,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);
  const paraDivRefs = useRef<Array<HTMLDivElement | null>>([]);

  const {
    isInvestigating,
    setIsInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
    checkOngoingInvestigation,
  } = useInvestigation();

  const [findingText, setFindingText] = useState('');
  const [isModalVisibleAddFinding, setIsModalVisibleAddFinding] = useState(false);

  const closeModal = () => {
    setIsModalVisibleAddFinding(false);
    setFindingText('');
  };

  const handleAddFinding = async () => {
    await addNewFinding({ text: `%md\n${findingText}` });
    closeModal();
  };

  useEffect(() => {
    const subscription = workspaces.currentWorkspace$.subscribe((currentWorkspace) => {
      notebookContext.state.updateValue({ isNotebookReadonly: currentWorkspace?.readonly });
    });
    return () => subscription.unsubscribe();
  }, [workspaces.currentWorkspace$, notebookContext.state]);

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
          currentUser: res.currentUser,
          hypotheses: res.hypotheses,
          runningMemory: res.runningMemory,
          historyMemory: res.historyMemory,
        });

        // Check if there's an ongoing investigation to continue
        const hasOngoingInvestigation = res.runningMemory?.parentInteractionId;

        if (hasOngoingInvestigation) {
          const isOwner = !!res.currentUser && res.currentUser === res.runningMemory?.owner;
          if (isOwner) {
            await continueInvestigation();
          } else {
            notifications.toasts.addWarning({
              title: 'Investigation in progress',
              text: `User (${res.runningMemory?.owner}) is currently running an investigation. Please wait for it to complete and refresh the page.`,
            });
          }
          return;
        }

        // Only call start() for new notebooks or completed investigations
        await start({
          context: notebookContext.state.value.context.value,
          paragraphs: res.paragraphs,
          hypotheses: res.hypotheses,
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
    doInvestigate,
    continueInvestigation,
  ]);

  useEffectOnce(() => {
    loadNotebook();

    // TODO: remove the optional chain after each method
    (chrome as any).setIsNavDrawerLocked?.(false);
    const rafId = window.requestAnimationFrame(() => {
      (chat as any)?.openWindow?.();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  });

  const handleReinvestigate = useCallback(
    async ({
      question,
      isReinvestigate,
      updatedTimeRange,
    }: {
      question: string;
      isReinvestigate: boolean;
      updatedTimeRange?: Omit<InvestigationTimeRange, 'baselineFrom' | 'baselineTo'>;
    }) => {
      // Check for ongoing investigation by another user before starting
      const hasOngoingInvestigation = await checkOngoingInvestigation();
      if (hasOngoingInvestigation) {
        return;
      }

      setIsReinvestigateModalVisible(false);
      setIsInvestigating(true);

      const updates: { initialGoal?: string; timeRange?: InvestigationTimeRange } = {};

      if (initialGoal !== question) {
        updates.initialGoal = question;
      }

      const newTimeRange = updatedTimeRange
        ? {
            ...updatedTimeRange,
            baselineFrom: timeRange?.baselineFrom ?? 0,
            baselineTo: timeRange?.baselineTo ?? 0,
          }
        : undefined;

      const hasTimeRangeChanged =
        updatedTimeRange &&
        (timeRange?.selectionFrom !== updatedTimeRange.selectionFrom ||
          timeRange?.selectionTo !== updatedTimeRange.selectionTo);

      if (hasTimeRangeChanged) {
        updates.timeRange = newTimeRange;
      }

      if (Object.keys(updates).length > 0) {
        await updateNotebookContext(updates);
      }

      if (hasTimeRangeChanged) {
        await rerunPrecheck(paragraphsStates, newTimeRange);
      }

      (isReinvestigate ? rerunInvestigation : doInvestigate)({
        investigationQuestion: question,
        timeRange: newTimeRange,
        ...(isReinvestigate && { initialGoal }),
      });
    },
    [
      initialGoal,
      paragraphsStates,
      setIsInvestigating,
      updateNotebookContext,
      timeRange,
      rerunInvestigation,
      doInvestigate,
      setIsReinvestigateModalVisible,
      rerunPrecheck,
      checkOngoingInvestigation,
    ]
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
          {isLoading
            ? null
            : paragraphsStates.length > 0
            ? paragraphsStates.map((paragraphState, index: number) => {
                return (
                  <div
                    ref={(ref) => (paraDivRefs.current[index] = ref)}
                    key={`para_div_${paragraphState.value.id}`}
                    // Hidden the agent generated findings during reinvestigation
                    hidden={paragraphState.value.aiGenerated && isInvestigating}
                  >
                    {index > 0 && <EuiSpacer size="s" />}
                    <EuiPanel>
                      <Paragraph
                        index={index}
                        deletePara={showDeleteParaModal}
                        scrollToPara={scrollToPara}
                      />
                    </EuiPanel>
                  </div>
                );
              })
            : null}

          {!isLoading && !isInvestigating && !isNotebookReadonly && (
            <>
              <EuiSpacer size="s" />
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
            </>
          )}
          {isModalVisibleAddFinding && (
            <EuiModal onClose={closeModal}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>Add Finding</EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiTextArea
                  fullWidth
                  placeholder="Please add your finding here"
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
          timeRange={timeRange}
          dateFormat={uiSettings.get('dateFormat')}
          confirm={handleReinvestigate}
          closeModal={() => setIsReinvestigateModalVisible(false)}
        />
      )}
      {contextProvider?.hooks?.usePageContext && (
        <InvestigationPageContext
          usePageContext={contextProvider.hooks.usePageContext}
          dataSourceId={dataSourceId}
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
