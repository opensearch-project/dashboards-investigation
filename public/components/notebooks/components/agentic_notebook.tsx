/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
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
  EuiFlyout,
  EuiFlyoutBody,
} from '@elastic/eui';
import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { useEffectOnce, useObservable } from 'react-use';
import { useHistory } from 'react-router-dom';

import { NoteBookServices } from 'public/types';
import { ParagraphState } from '../../../../common/state/paragraph_state';
import {
  InvestigationTimeRange,
  NotebookComponentProps,
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
import { InvestigationResult } from './investigation_result';
import { useChatContextProvider } from '../../../hooks/use_chat_context';
import { HypothesisDetail, AlternativeHypothesesPanel, ReinvestigateModal } from './hypothesis';
import { SubRouter, useSubRouter } from '../../../hooks/use_sub_router';
import { InvestigationPageContext } from './investigation_page_context';
import { migrateFindingParagraphs } from '../../../utils/finding_migration';
import { InvestigationPhase } from '../../../../common/state/notebook_state';
import { useSidecarPadding } from '../../../hooks/use_sidecar_padding';

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
      application,
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
  const { initialGoal, notebookType, timeRange, dataSourceId } = useObservable(
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
        i18n.translate('notebook.agentic.deleteParagraph', {
          defaultMessage: 'Delete paragraph',
        }),
        i18n.translate('notebook.agentic.deleteParagraphConfirm', {
          defaultMessage:
            'Are you sure you want to delete the paragraph? The action cannot be undone.',
        })
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

        const { migratedParagraphs, migratedIds } = migrateFindingParagraphs(res.paragraphs);

        notebookContext.state.updateValue({
          dateCreated: res.dateCreated,
          dateModified: res.dateModified,
          title: res.name,
          path: res.path,
          vizPrefix: res.vizPrefix,
          paragraphs: migratedParagraphs.map((paragraph) => new ParagraphState<unknown>(paragraph)),
          owner: res.owner,
          currentUser: res.currentUser,
          hypotheses: res.hypotheses,
          runningMemory: res.runningMemory,
          historyMemory: res.historyMemory,
          topologies: res.topologies,
        });

        if (migratedIds.length > 0) {
          notifications.toasts.addInfo(
            i18n.translate('notebook.agentic.findingParagraphsMigrated', {
              defaultMessage: 'Finding paragraphs migrated.',
            })
          );
          await notebookContext.paragraphHooks.batchRunParagraphs({
            paragraphIds: migratedIds,
          });
        }

        // Check if there's an ongoing investigation to continue
        const hasOngoingInvestigation = res.runningMemory?.parentInteractionId;

        if (hasOngoingInvestigation) {
          const isOwner = application.capabilities.investigation?.ownerSupported
            ? !!res.currentUser && res.currentUser === res.runningMemory?.owner
            : true;
          if (isOwner) {
            await continueInvestigation();
          } else {
            notifications.toasts.addWarning({
              title: i18n.translate('notebook.agentic.investigationInProgress', {
                defaultMessage: 'Investigation in progress',
              }),
              text: i18n.translate('notebook.agentic.investigationInProgressText', {
                defaultMessage:
                  'User ({owner}) is currently running an investigation. Please wait for it to complete and refresh the page.',
                values: { owner: res.runningMemory?.owner },
              }),
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
          i18n.translate('notebook.agentic.errorFetchingNotebooks', {
            defaultMessage:
              'Error fetching notebooks, please make sure you have the correct permission.',
          })
        );
        console.error(err);
      });
  }, [
    loadNotebookHook,
    notebookContext.paragraphHooks,
    notifications.toasts,
    notebookContext.state,
    start,
    doInvestigate,
    continueInvestigation,
    application.capabilities.investigation?.ownerSupported,
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
      notebookContext.state.updateValue({
        investigationPhase: InvestigationPhase.RETRIEVING_CONTEXT,
      });

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
      updateNotebookContext,
      timeRange,
      rerunInvestigation,
      doInvestigate,
      setIsReinvestigateModalVisible,
      rerunPrecheck,
      checkOngoingInvestigation,
      notebookContext.state,
    ]
  );

  if (!isLoading && notebookType === NotebookType.CLASSIC) {
    return (
      <EuiPage direction="column">
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={
              <h2>
                {i18n.translate('notebook.agentic.errorLoadingNotebook', {
                  defaultMessage: 'Error loading Notebook',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('notebook.agentic.incorrectNotebookType', {
                  defaultMessage: 'Incorrect notebook type',
                })}
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
              isSavedObjectNotebook
              loadNotebook={loadNotebook}
              showUpgradeModal={() => {}}
            />
          )}
          <InvestigationResult
            notebookId={openedNoteId}
            openReinvestigateModal={() => setIsReinvestigateModalVisible(true)}
          />
          <EuiSpacer size="s" />
          <AlternativeHypothesesPanel notebookId={openedNoteId} isInvestigating={isInvestigating} />
          {isLoading ? (
            <EuiEmptyPrompt
              icon={<EuiLoadingContent />}
              title={
                <h2>
                  {i18n.translate('notebook.agentic.loadingNotebook', {
                    defaultMessage: 'Loading Notebook',
                  })}
                </h2>
              }
            />
          ) : null}
          {isLoading
            ? null
            : paragraphsStates.length > 0
            ? paragraphsStates.map((paragraphState, index: number) => {
                if (paragraphState.value.aiGenerated) {
                  return null;
                }
                return (
                  <div
                    ref={(ref) => (paraDivRefs.current[index] = ref)}
                    key={`para_div_${paragraphState.value.id}`}
                  >
                    {index > 0 && <EuiSpacer size="s" />}
                    <EuiPanel>
                      <Paragraph
                        index={index}
                        deletePara={showDeleteParaModal}
                        scrollToPara={scrollToPara}
                        key={paragraphState.value.id}
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
                      {i18n.translate('notebook.agentic.addFinding', {
                        defaultMessage: 'Add Finding',
                      })}
                    </EuiSmallButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </>
          )}
          {isModalVisibleAddFinding && (
            <EuiModal onClose={closeModal}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>
                  {i18n.translate('notebook.agentic.addFinding', {
                    defaultMessage: 'Add Finding',
                  })}
                </EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiTextArea
                  fullWidth
                  placeholder={i18n.translate('notebook.agentic.addFindingPlaceholder', {
                    defaultMessage: 'Please add your finding here',
                  })}
                  value={findingText}
                  onChange={(e) => setFindingText(e.target.value)}
                  rows={5}
                  aria-label={i18n.translate('notebook.agentic.addFindingAriaLabel', {
                    defaultMessage: 'Add finding text area',
                  })}
                />
              </EuiModalBody>

              <EuiModalFooter>
                <EuiButtonEmpty onClick={closeModal}>
                  {i18n.translate('notebook.agentic.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
                <EuiButton fill onClick={handleAddFinding}>
                  {i18n.translate('notebook.agentic.add', {
                    defaultMessage: 'Add',
                  })}
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
    services: { dataSource, application, overlays },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { page } = useSubRouter();
  const stateRef = useRef(
    getDefaultState({
      id: openedNoteId,
      dataSourceEnabled: !!dataSource,
    })
  );
  const history = useHistory();
  const paddingRight = useSidecarPadding(overlays);

  if (!application.capabilities.investigation.agenticFeaturesEnabled) {
    return (
      <EuiPage direction="column">
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={
              <h2>
                {i18n.translate('notebook.agentic.errorLoadingNotebook', {
                  defaultMessage: 'Error loading Notebook',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('notebook.agentic.agenticFeatureDisabled', {
                  defaultMessage: 'Agentic feature is disabled',
                })}
              </p>
            }
          />
        </EuiPageBody>
      </EuiPage>
    );
  }

  return (
    <NotebookContextProvider state={stateRef.current}>
      <>
        <NotebookComponent {...rest} />
        {page === SubRouter.Hypothesis && (
          <EuiFlyout
            onClose={() => {
              const { id: notebookId } = stateRef.current.value;
              history.push(`/agentic/${notebookId}`);
            }}
            style={{ marginRight: paddingRight }}
            size="l"
            paddingSize="none"
            ownFocus={false}
            maxWidth={980}
          >
            <EuiFlyoutBody>
              <HypothesisDetail />
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </>
    </NotebookContextProvider>
  );
};
