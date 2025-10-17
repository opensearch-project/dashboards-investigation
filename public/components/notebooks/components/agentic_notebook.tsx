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
import { useParagraphs } from '../../../hooks/use_paragraphs';
import { useNotebook } from '../../../hooks/use_notebook';
import { usePrecheck } from '../../../hooks/use_precheck';
import { useNotebookFindingIntegration } from '../../../hooks/use_notebook_finding_integration';
import { useInvestigation } from '../../../hooks/use_investigation';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { AlertPanel } from './alert_panel';
import { GlobalPanel } from './global_panel';
import { NotebookHeader } from './notebook_header';
import { SummaryCard } from './summary_card';
import { useContextSubscription } from '../../../hooks/use_context_subscription';
import { HypothesisDetail } from './hypothesis/hypothesis_detail';
import { HypothesesPanel } from './hypothesis/hypotheses_panel';
import { SubRouter, useSubRouter } from '../../../hooks/use_sub_router';

interface AgenticNotebookProps extends NotebookComponentProps {
  openedNoteId: string;
}

function NotebookComponent({ showPageHeader }: NotebookComponentProps) {
  const {
    services: { notifications, findingService, chrome, assistantDashboards },
  } = useOpenSearchDashboards<NoteBookServices>();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLayout, setModalLayout] = useState<React.ReactNode>(<EuiOverlayMask />);
  const { createParagraph, deleteParagraph } = useParagraphs();
  const { loadNotebook: loadNotebookHook } = useNotebook();
  const { start, setInitialGoal } = usePrecheck();

  useContextSubscription();

  const notebookContext = useContext(NotebookReactContext);
  const { source, notebookType } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const { id: openedNoteId, paragraphs: paragraphsStates, isLoading } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const { initialGoal } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );
  const paraDivRefs = useRef<Array<HTMLDivElement | null>>([]);

  const { isInvestigating, doInvestigate, addNewFinding } = useInvestigation();

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
          title: res.name,
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
    setInitialGoal,
    doInvestigate,
  ]);

  useEffectOnce(() => {
    loadNotebook();

    // TODO: remove the optional chain after each method
    (chrome as any).setIsNavDrawerLocked?.(false);
    (assistantDashboards as any)?.updateChatbotVisible?.(true);
  });

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
              <SummaryCard />
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
            doInvestigate={doInvestigate}
            addNewFinding={addNewFinding}
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
                  <Paragraphs
                    paragraphState={paragraphState}
                    index={index}
                    deletePara={showDeleteParaModal}
                    scrollToPara={scrollToPara}
                  />
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
        </EuiPageBody>
      </EuiPage>
      {isModalVisible && modalLayout}
    </>
  );
}

export const AgenticNotebook = ({ openedNoteId, ...rest }: AgenticNotebookProps) => {
  const {
    services: { dataSource },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { page } = useSubRouter();
  const stateRef = useRef(
    getDefaultState({
      id: openedNoteId,
      dataSourceEnabled: !!dataSource,
    })
  );

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
