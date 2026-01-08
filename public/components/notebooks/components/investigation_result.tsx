/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiLink,
  EuiCode,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiLoadingSpinner,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiAccordion,
  EuiBeacon,
  EuiPanel,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { FindingParagraphParameters } from 'common/types/notebooks';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { BehaviorSubject } from 'rxjs';
import { useHistory } from 'react-router-dom';
import { NotebookReactContext } from '../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getDataSourceById } from '../../../utils/data_source_utils';
import { HypothesesFeedback, HypothesisBadge, HypothesisItem } from './hypothesis';
import { HypothesesStep } from './hypothesis/hypotheses_step';
import { PERAgentMessageService } from './hypothesis/investigation/services/per_agent_message_service';
import { PERAgentMemoryService } from './hypothesis/investigation/services/per_agent_memory_service';
import { MessageTraceFlyout } from './hypothesis/investigation/message_trace_flyout';
import { Paragraph } from './paragraph_components/paragraph';

interface InvestigationResultProps {
  notebookId: string;
  isInvestigating: boolean;
  openReinvestigateModal: () => void;
}

export const InvestigationResult: React.FC<InvestigationResultProps> = ({
  notebookId,
  isInvestigating,
  openReinvestigateModal,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: {
      uiSettings,
      notifications,
      savedObjects,
      appName,
      usageCollection,
      http,
      application,
    },
  } = useOpenSearchDashboards<NoteBookServices>();
  const history = useHistory();

  const {
    isNotebookReadonly,
    paragraphs: paragraphsStates,
    hypotheses,
    context,
    runningMemory,
    historyMemory,
    investigationError,
    currentUser,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);

  const {
    dataSourceId = '',
    index = '',
    timeRange,
    source,
    timeField,
    initialGoal,
    variables,
    log,
  } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );

  const [dataSourceTitle, setDataSourceTitle] = useState(dataSourceId);
  const [showSteps, setShowSteps] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();
  const [showAllFindings, setShowAllFindings] = useState(false);

  const dateFormat = uiSettings.get('dateFormat');
  const activeMemory = useMemo(() => {
    return isInvestigating ? runningMemory : historyMemory;
  }, [isInvestigating, runningMemory, historyMemory]);

  const PERAgentServices = useMemo(() => {
    if (!activeMemory?.executorMemoryId || !activeMemory?.memoryContainerId || isNotebookReadonly) {
      return null;
    }

    const executorMemoryId$ = new BehaviorSubject(activeMemory.executorMemoryId);
    const messageService = new PERAgentMessageService(http, activeMemory.memoryContainerId);

    const executorMemoryService = new PERAgentMemoryService(
      http,
      executorMemoryId$,
      () => {
        if (!isInvestigating && activeMemory) {
          return false;
        }
        return !messageService.getMessageValue();
      },
      activeMemory.memoryContainerId
    );

    return {
      message: messageService,
      executorMemory: executorMemoryService,
    };
  }, [http, activeMemory, isInvestigating, isNotebookReadonly]);

  const executorMessages$ = useMemo(
    () => PERAgentServices?.executorMemory.getMessages$() ?? new BehaviorSubject<any[]>([]),
    [PERAgentServices]
  );

  const executorMessages = useObservable(executorMessages$, []);

  useEffect(() => {
    const fetchDataSourceDetailsByID = async () => {
      if (!dataSourceId) {
        return;
      }
      try {
        const response = await getDataSourceById(dataSourceId, savedObjects.client);
        setDataSourceTitle(response?.title || dataSourceId);
      } catch (e) {
        setDataSourceTitle(dataSourceId);
      }
    };

    fetchDataSourceDetailsByID();
  }, [dataSourceId, savedObjects.client]);

  useEffect(() => {
    setShowSteps(isInvestigating);
  }, [isInvestigating]);

  useEffect(() => {
    if (PERAgentServices) {
      if (!activeMemory?.executorMemoryId || !activeMemory?.parentInteractionId) {
        return;
      }

      PERAgentServices.message.setup({
        messageId: activeMemory.parentInteractionId,
        dataSourceId: context.value.dataSourceId,
      });

      PERAgentServices.executorMemory.setup({
        dataSourceId: context.value.dataSourceId,
      });

      return () => {
        PERAgentServices.message.stop();
        PERAgentServices.executorMemory.stop('Component unmount');
      };
    }
  }, [
    PERAgentServices,
    context.value.dataSourceId,
    activeMemory?.executorMemoryId,
    activeMemory?.parentInteractionId,
  ]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notifications.toasts.addSuccess(
        i18n.translate('notebook.summary.card.copiedToClipboard', {
          defaultMessage: '{label} copied to clipboard',
          values: { label },
        })
      );
    });
  };

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  const statusBadge = useMemo(() => {
    if (investigationError) {
      return (
        <HypothesisBadge
          label={i18n.translate('notebook.summary.card.investigationFailed', {
            defaultMessage: 'Investigation failed and showing previous hypotheses',
          })}
          color={euiThemeVars.euiColorDanger}
          icon="cross"
        />
      );
    }

    if (runningMemory?.owner && runningMemory.owner !== currentUser) {
      return (
        <HypothesisBadge
          label={i18n.translate('notebook.summary.card.otherUserInvestigating', {
            defaultMessage: 'Other user is doing investigation, show previous Investigation',
          })}
          color={euiThemeVars.euiColorWarning}
          icon="check"
        />
      );
    }

    if (isInvestigating || !historyMemory) {
      return (
        <HypothesisBadge
          label={i18n.translate('notebook.summary.card.underInvestigation', {
            defaultMessage: 'Under investigation',
          })}
          color={euiThemeVars.euiColorPrimary}
          icon="pulse"
        />
      );
    }

    return (
      <HypothesisBadge
        label={
          hypotheses && hypotheses.length > 0
            ? i18n.translate('notebook.summary.card.investigationCompleted', {
                defaultMessage: 'Investigation completed',
              })
            : i18n.translate('notebook.summary.card.noHypotheses', {
                defaultMessage: 'No hypotheses',
              })
        }
        color={euiThemeVars.euiColorSuccess}
        icon="check"
      />
    );
  }, [
    investigationError,
    isInvestigating,
    historyMemory,
    hypotheses,
    currentUser,
    runningMemory?.owner,
  ]);

  const renderInvestigationSteps = () => {
    // Only show investigation steps if current user is the owner of the active memory (investigation trigger user)
    const isOwner = application.capabilities.investigation?.ownerSupported
      ? !!currentUser && currentUser === activeMemory?.owner
      : true;

    if (!PERAgentServices || isNotebookReadonly || !isOwner) return null;

    return (
      <EuiAccordion
        id="investigation-steps"
        buttonContent={
          <EuiTitle size="xs">
            <b>
              {executorMessages.length > 0
                ? i18n.translate('notebook.summary.card.investigationSteps', {
                    defaultMessage: 'Investigation Steps ({count})',
                    values: { count: executorMessages.length },
                  })
                : i18n.translate('notebook.summary.card.investigationStepsNoCount', {
                    defaultMessage: 'Investigation Steps',
                  })}
            </b>
          </EuiTitle>
        }
        forceState={showSteps ? 'open' : 'closed'}
        onToggle={(isOpen) => {
          setShowSteps(isOpen);
        }}
      >
        <HypothesesStep
          isInvestigating={isInvestigating}
          messageService={PERAgentServices.message}
          executorMemoryService={PERAgentServices.executorMemory}
          onExplainThisStep={setTraceMessageId}
        />
      </EuiAccordion>
    );
  };

  const renderPrimaryHypothesis = () => {
    if (isInvestigating) {
      const hasStepsOrMessage =
        executorMessages.length > 0 || PERAgentServices?.message.getMessageValue();
      const displayText = hasStepsOrMessage
        ? i18n.translate('notebook.summary.card.gatheringData', {
            defaultMessage: 'Gathering data in progress...',
          })
        : i18n.translate('notebook.summary.card.planningInvestigation', {
            defaultMessage: 'Planning for your investigation...',
          });

      return (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false} style={{ paddingLeft: '6px' }}>
              <EuiBeacon size={5} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>{displayText}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </>
      );
    }

    if (!hypotheses?.length) {
      return (
        <EuiText>
          {i18n.translate('notebook.summary.card.noHypothesesGenerated', {
            defaultMessage: 'No hypotheses generated',
          })}
        </EuiText>
      );
    }

    return (
      <EuiFlexGroup key={`hypothesis-${hypotheses[0].id}`} alignItems="center" gutterSize="none">
        <HypothesisItem
          index={0}
          hypothesis={hypotheses[0]}
          onClickHypothesis={handleClickHypothesis}
        />
      </EuiFlexGroup>
    );
  };

  const renderMetadataField = (label: string, value: string) => (
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{label}</strong>: <span>{value}</span>
      </EuiText>
    </EuiFlexItem>
  );

  const renderCopyableField = (
    labelKey: string,
    defaultMessage: string,
    value: string,
    label: string
  ) => (
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{i18n.translate(labelKey, { defaultMessage })}</strong>:{' '}
        <span>
          <EuiLink onClick={() => copyToClipboard(value, label)}>
            {value ||
              i18n.translate('notebook.summary.card.notSpecified', {
                defaultMessage: 'Not specified',
              })}
            {value && (
              <EuiIcon
                type="copy"
                size="s"
                style={{ marginLeft: '4px', verticalAlign: 'middle' }}
              />
            )}
          </EuiLink>
        </span>
      </EuiText>
    </EuiFlexItem>
  );

  return (
    <>
      <EuiPanel borderRadius="l" data-test-subj="investigation-results-panel">
        {/* Header Section */}
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
          <div>
            <EuiTitle>
              <h2>
                {i18n.translate('notebook.summary.card.investigationResults', {
                  defaultMessage: 'Investigation Results',
                })}
              </h2>
            </EuiTitle>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiText color="subdued">
                  {i18n.translate('notebook.summary.card.rootCauseDescription', {
                    defaultMessage: 'The most likely root cause based on current findings.',
                  })}
                </EuiText>
              </EuiFlexItem>
              {hypotheses?.length && !isInvestigating && !isNotebookReadonly ? (
                <EuiFlexItem grow={false}>
                  <HypothesesFeedback
                    appName={appName}
                    usageCollection={usageCollection}
                    openReinvestigateModal={openReinvestigateModal}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
            </EuiFlexGroup>
          </div>

          {!isNotebookReadonly ? (
            <EuiButton onClick={() => openReinvestigateModal()} disabled={isInvestigating}>
              {isInvestigating ? (
                <>
                  <EuiLoadingSpinner />{' '}
                  {i18n.translate('notebook.summary.card.investigating', {
                    defaultMessage: 'Investigating',
                  })}
                </>
              ) : (
                i18n.translate('notebook.summary.card.reinvestigate', {
                  defaultMessage: 'Reinvestigate',
                })
              )}
            </EuiButton>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="s" />

        {/* Hypotheses Content Section */}
        {renderPrimaryHypothesis()}
        <EuiHorizontalRule margin="s" />

        {/* Metadata Section */}
        <EuiFlexGrid
          columns={2}
          gutterSize="s"
          direction="column"
          data-test-subj="investigation-metadata"
        >
          {renderCopyableField(
            'notebook.summary.card.dataSource',
            'Data source',
            dataSourceTitle,
            'Data Source'
          )}
          {renderCopyableField('notebook.summary.card.index', 'Index', index, 'Index')}
          {renderMetadataField(
            i18n.translate('notebook.summary.card.source', { defaultMessage: 'Source' }),
            source ||
              i18n.translate('notebook.summary.card.unknown', {
                defaultMessage: 'Unknown',
              })
          )}

          {initialGoal && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('notebook.summary.card.initialGoal', {
                    defaultMessage: 'Initial goal',
                  })}
                </strong>
                :{' '}
                <span>
                  <EuiLink
                    onClick={() =>
                      copyToClipboard(
                        initialGoal,
                        i18n.translate('notebook.summary.card.initialGoal', {
                          defaultMessage: 'Initial goal',
                        })
                      )
                    }
                  >
                    <EuiCode language="plaintext">{initialGoal}</EuiCode>
                    <EuiIcon
                      size="s"
                      type="copy"
                      style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                    />
                  </EuiLink>
                </span>
              </EuiText>
            </EuiFlexItem>
          )}

          {renderMetadataField(
            i18n.translate('notebook.summary.card.timeField', { defaultMessage: 'Time field' }),
            timeField ||
              i18n.translate('notebook.summary.card.notSpecified', {
                defaultMessage: 'Not specified',
              })
          )}

          {timeRange && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('notebook.global.panel.investigation.subtitle', {
                    defaultMessage: 'Time range',
                  })}
                </strong>
                :{' '}
                <span>
                  <EuiIcon type="clock" />{' '}
                  {timeRange.selectionFrom
                    ? moment(timeRange.selectionFrom).format(dateFormat)
                    : i18n.translate('notebook.summary.card.notSpecified', {
                        defaultMessage: 'Not specified',
                      })}{' '}
                  {i18n.translate('notebook.summary.card.to', {
                    defaultMessage: 'to',
                  })}{' '}
                  {timeRange.selectionTo
                    ? moment(timeRange.selectionTo).format(dateFormat)
                    : i18n.translate('notebook.summary.card.notSpecified', {
                        defaultMessage: 'Not specified',
                      })}
                </span>
              </EuiText>
            </EuiFlexItem>
          )}

          {variables?.pplQuery && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('notebook.summary.card.query', {
                    defaultMessage: 'Query',
                  })}
                </strong>
                :{' '}
                <span>
                  <EuiLink
                    onClick={() =>
                      copyToClipboard(
                        variables.pplQuery || '',
                        i18n.translate('notebook.summary.card.query', {
                          defaultMessage: 'Query',
                        })
                      )
                    }
                  >
                    <EuiCode language="sql">
                      {variables.pplQuery ||
                        i18n.translate('notebook.summary.card.notSpecified', {
                          defaultMessage: 'Not specified',
                        })}
                    </EuiCode>
                    {variables.pplQuery && (
                      <EuiIcon
                        type="copy"
                        size="s"
                        style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                      />
                    )}
                  </EuiLink>
                </span>
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGrid>

        {/* Selected Log Section */}
        {log && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <strong>
                {i18n.translate('notebook.summary.card.selectedLog', {
                  defaultMessage: 'Selected log',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" isCopyable={true} overflowHeight={160}>
              {JSON.stringify(log, null, 2)}
            </EuiCodeBlock>
          </>
        )}

        <EuiSpacer size="m" />
        {renderInvestigationSteps()}

        {/* Message Trace Flyout */}
        {traceMessageId && PERAgentServices && activeMemory?.executorMemoryId && (
          <MessageTraceFlyout
            messageId={traceMessageId}
            messageService={PERAgentServices.message}
            executorMemoryService={PERAgentServices.executorMemory}
            onClose={() => {
              setTraceMessageId(undefined);
            }}
            dataSourceId={context.value.dataSourceId}
            currentExecutorMemoryId={activeMemory?.executorMemoryId}
            memoryContainerId={activeMemory?.memoryContainerId as string}
            isInvestigating={isInvestigating}
          />
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
      {!isInvestigating &&
        hypotheses &&
        hypotheses[0] &&
        [
          ...hypotheses[0].supportingFindingParagraphIds,
          ...(hypotheses[0].userSelectedFindingParagraphIds || []),
        ].length > 0 && (
          <EuiPanel data-test-subj="primary-hypothesis-findings">
            <EuiTitle size="s">
              <h5>
                {i18n.translate('notebook.summary.card.relevantFindings', {
                  defaultMessage: 'Relevant findings ({count})',
                  values: {
                    count: [
                      ...hypotheses[0].supportingFindingParagraphIds,
                      ...(hypotheses[0].userSelectedFindingParagraphIds || []),
                    ].length,
                  },
                })}
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            {[
              ...hypotheses[0].supportingFindingParagraphIds,
              ...(hypotheses[0].userSelectedFindingParagraphIds || []),
            ]
              .map((id) => paragraphsStates.findIndex((p) => p.value.id === id))
              .filter((idx) => idx !== -1)
              .sort(
                (a, b) =>
                  ((paragraphsStates[b].value.input.parameters as FindingParagraphParameters)
                    ?.finding?.importance || 0) -
                  ((paragraphsStates[a].value.input.parameters as FindingParagraphParameters)
                    ?.finding?.importance || 0)
              )
              .slice(0, showAllFindings ? undefined : 3)
              .map((idx) => (
                <React.Fragment key={paragraphsStates[idx].value.id}>
                  <EuiPanel>
                    <Paragraph index={idx} isParagraphReadonly />
                  </EuiPanel>
                  <EuiSpacer size="s" />
                </React.Fragment>
              ))}
            {[
              ...hypotheses[0].supportingFindingParagraphIds,
              ...(hypotheses[0].userSelectedFindingParagraphIds || []),
            ].length > 3 && (
              <EuiButtonEmpty size="xs" onClick={() => setShowAllFindings(!showAllFindings)}>
                {showAllFindings
                  ? i18n.translate('notebook.summary.card.showLess', {
                      defaultMessage: 'Show less',
                    })
                  : i18n.translate('notebook.summary.card.showAll', {
                      defaultMessage: 'Show all',
                    })}
              </EuiButtonEmpty>
            )}
          </EuiPanel>
        )}
    </>
  );
};
