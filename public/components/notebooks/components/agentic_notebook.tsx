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
import { formatTimeRangeString } from '../../../../public/utils/time';

interface AgenticNotebookProps extends NotebookComponentProps {
  openedNoteId: string;
}

function NotebookComponent({ showPageHeader }: NotebookComponentProps) {
  const {
    services: { notifications, findingService, chrome, chat, uiSettings },
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
  const { initialGoal, source, notebookType, timeRange } = useObservable(
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
    setIsInvestigating,
    doInvestigate,
    addNewFinding,
    rerunInvestigation,
    continueInvestigation,
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
          isNotebookOwner: res.isNotebookOwner,
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
    doInvestigate,
    continueInvestigation,
  ]);

  useEffectOnce(() => {
    loadNotebook();

    // TODO: remove the optional chain after each method
    (chrome as any).setIsNavDrawerLocked?.(false);
    const rafId = window.requestAnimationFrame(() => {
      chat?.chatService?.openWindow?.();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  });

  const handleReinvestigate = useCallback(
    async ({
      question,
      updatedTimeRange,
      isReinvestigate,
    }: {
      question: string;
      updatedTimeRange:
        | {
            selectionFrom: number;
            selectionTo: number;
          }
        | undefined;
      isReinvestigate: boolean;
    }) => {
      const formattedTimeRange = formatTimeRangeString(updatedTimeRange);

      setIsReinvestigateModalVisible(false);
      setIsInvestigating(true);

      if (initialGoal !== question) {
        await updateNotebookContext({ initialGoal: question });
      }

      if (
        updatedTimeRange &&
        (timeRange?.selectionFrom !== updatedTimeRange.selectionFrom ||
          timeRange?.selectionTo !== updatedTimeRange.selectionTo)
      ) {
        await updateNotebookContext({
          // FIXME: when support baseline time
          timeRange: {
            baselineFrom: timeRange?.baselineFrom ?? 0,
            baselineTo: timeRange?.baselineTo ?? 0,
            ...updatedTimeRange,
          },
        });
        await rerunPrecheck(paragraphsStates, formattedTimeRange);
      }

      if (isReinvestigate) {
        rerunInvestigation({
          investigationQuestion: question,
          initialGoal,
          timeRange: formattedTimeRange,
        });
      } else {
        doInvestigate({
          investigationQuestion: question,
          timeRange: formattedTimeRange,
        });
      }
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

          {!isLoading && !isInvestigating && (
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
