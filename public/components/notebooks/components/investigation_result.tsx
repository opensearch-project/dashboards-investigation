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
  EuiCodeBlock,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiAccordion,
  EuiBeacon,
  EuiPanel,
  EuiButtonEmpty,
  EuiSmallButton,
  EuiEmptyPrompt,
  EuiSplitPanel,
  EuiButtonIcon,
  EuiCopy,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { BehaviorSubject } from 'rxjs';
import { useHistory } from 'react-router-dom';

import { FindingParagraphParameters, HypothesisStatus } from '../../../../common/types/notebooks';
import { NotebookReactContext } from '../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getDataSourceById } from '../../../utils/data_source_utils';
import { HypothesesFeedback, HypothesisItem } from './hypothesis';
import { HypothesesStep } from './hypothesis/hypotheses_step';
import { MessageTraceFlyout } from './hypothesis/investigation/message_trace_flyout';
import { Paragraph } from './paragraph_components/paragraph';
import { InvestigationPhase, isInvestigationActive } from '../../../../common/state/notebook_state';
import { FailedInvestigationFlyout } from './hypothesis/failed_investigation_flyout';
import { usePERAgentServices } from '../../../hooks/use_per_agent_services';
import { useMemoryPermission } from '../../../hooks/use_memory_permission';

interface InvestigationResultProps {
  notebookId: string;
  openReinvestigateModal: (withFeedback?: boolean) => void;
}

export const InvestigationResult: React.FC<InvestigationResultProps> = ({
  notebookId,
  openReinvestigateModal,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const {
    services: { uiSettings, savedObjects, appName, usageCollection, http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const history = useHistory();

  const {
    isNotebookReadonly,
    paragraphs: paragraphsStates,
    hypotheses,
    context,
    runningMemory,
    historyMemory,
    path,
    investigationPhase,
    failedInvestigation,
    runningMemoryPermission,
  } = useObservable(notebookContext.state.getValue$(), notebookContext.state.value);
  const isInvestigating = isInvestigationActive(investigationPhase);

  const isDarkMode = uiSettings.get('theme:darkMode');

  const {
    dataSourceId = '',
    index = '',
    timeRange,
    source,
    timeField,
    initialGoal,
    variables,
    log,
    symptom,
  } = useObservable(
    notebookContext.state.value.context.getValue$(),
    notebookContext.state.value.context.value
  );

  const [dataSourceTitle, setDataSourceTitle] = useState(dataSourceId);
  const [showSteps, setShowSteps] = useState(false);
  const [traceMessageId, setTraceMessageId] = useState<string>();
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showStatusBadge, setShowStatusBadge] = useState(true);
  const [showFailedInvestigation, setShowFailedInvestigation] = useState(false);

  const dateFormat = uiSettings.get('dateFormat');
  const activeMemory = useMemo(() => {
    return isInvestigating ? runningMemory : historyMemory;
  }, [isInvestigating, runningMemory, historyMemory]);

  const PERAgentServices = usePERAgentServices({
    http,
    isInvestigating,
    memory: activeMemory,
    dataSourceId,
  });

  const hasActiveMemoryPermission = useMemoryPermission({
    http,
    memoryContainerId: activeMemory?.memoryContainerId,
    messageId: activeMemory?.parentInteractionId,
    dataSourceId,
  });

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
    setShowStatusBadge(true);
  }, [isInvestigating]);

  useEffect(() => {
    if (isInvestigating) {
      const hasStepsOrMessage =
        executorMessages.length > 0 || PERAgentServices?.message.getMessageValue();
      if (hasStepsOrMessage && investigationPhase !== InvestigationPhase.GATHERING_DATA) {
        notebookContext.state.updateValue({
          investigationPhase: InvestigationPhase.GATHERING_DATA,
        });
      }
    }
  }, [
    executorMessages,
    investigationPhase,
    isInvestigating,
    PERAgentServices?.message,
    notebookContext.state,
  ]);

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  const statusBadge = useMemo(() => {
    let badgeLabel;
    let badgeColor;
    let badgeIcon;

    if (isInvestigating) {
      badgeLabel = i18n.translate('notebook.summary.card.underInvestigation', {
        defaultMessage: 'Under investigation',
      });
      badgeColor = euiThemeVars.euiColorPrimary;
      badgeIcon = 'pulse';
    } else if (!!failedInvestigation) {
      badgeLabel = i18n.translate('notebook.summary.card.investigationFailedBadge', {
        defaultMessage: 'Investigation failed and showing previous hypotheses',
      });
      badgeColor = euiThemeVars.euiColorDanger;
      badgeIcon = 'crossInCircleEmpty';
    } else if (runningMemory?.parentInteractionId && !runningMemoryPermission) {
      badgeLabel = i18n.translate('notebook.summary.card.otherUserInvestigating', {
        defaultMessage: 'Other user is doing investigation, show previous Investigation',
      });
      badgeColor = euiThemeVars.euiColorWarning;
      badgeIcon = 'navInfo';
    } else if (!historyMemory) {
      badgeLabel = i18n.translate('notebook.summary.card.underInvestigation', {
        defaultMessage: 'Under investigation',
      });
      badgeColor = euiThemeVars.euiColorPrimary;
      badgeIcon = 'pulse';
    } else {
      badgeLabel =
        hypotheses && hypotheses.length > 0
          ? i18n.translate('notebook.summary.card.investigationCompleted', {
              defaultMessage: 'Investigation completed',
            })
          : i18n.translate('notebook.summary.card.noHypotheses', {
              defaultMessage: 'No hypotheses',
            });
      badgeColor = euiThemeVars.euiColorSuccess;
      badgeIcon = 'checkInCircleEmpty';
    }

    return (
      <>
        <EuiFlexGroup
          gutterSize="none"
          direction="row"
          alignItems="center"
          style={{
            backgroundColor: badgeColor,
            borderRadius: 12,
            padding: '4px 16px',
            gap: 8,
          }}
        >
          <EuiIcon type={badgeIcon} color="ghost" />
          <EuiFlexItem grow>
            <EuiText color="ghost">{badgeLabel}</EuiText>
          </EuiFlexItem>

          <EuiButtonIcon
            aria-label="close badge"
            iconType="cross"
            color="ghost"
            onClick={() => setShowStatusBadge(false)}
          />
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    );
  }, [
    failedInvestigation,
    isInvestigating,
    historyMemory,
    hypotheses,
    runningMemoryPermission,
    runningMemory,
  ]);

  const failedInvestigationDetailButton = (
    <EuiSmallButton
      fill
      color="danger"
      iconType="eye"
      disabled={isInvestigating}
      onClick={() => setShowFailedInvestigation(true)}
    >
      {i18n.translate('notebook.summary.card.failed', {
        defaultMessage: 'Show failure detail',
      })}
    </EuiSmallButton>
  );

  const renderInvestigationSteps = () => {
    if (!PERAgentServices || isNotebookReadonly || !hasActiveMemoryPermission) return null;

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

  const renderRetryButtonGroup = (justifyContent: 'center' | 'flexStart' = 'center') => {
    return (
      <EuiFlexGroup gutterSize="none" justifyContent={justifyContent} style={{ gap: 8 }}>
        <EuiSmallButton
          color="primary"
          iconType="refresh"
          fill
          onClick={() => openReinvestigateModal(true)}
        >
          {i18n.translate('notebook.summary.card.reinvestigateWithFeedback', {
            defaultMessage: 'Reinvestigate with feedback',
          })}
        </EuiSmallButton>
        {!!failedInvestigation && failedInvestigationDetailButton}
        {/* <EuiButton
          color="text"
          iconType="generate"
          style={{
            backgroundColor: isDarkMode ? 'unset' : euiThemeVars.euiColorGhost,
          }}
        >
          {i18n.translate('notebook.summary.card.askAIForGuidance', {
            defaultMessage: 'Ask AI for guidance',
          })}
        </EuiButton> */}
      </EuiFlexGroup>
    );
  };

  const renderPrimaryHypothesis = (hasError: boolean = false) => {
    if (isInvestigating) {
      let displayText: string;

      switch (investigationPhase) {
        case InvestigationPhase.RETRIEVING_CONTEXT:
          displayText = i18n.translate(
            'investigate.hypothesesPanel.investigationPhase.retrievingContext',
            {
              defaultMessage: 'Retrieving context...',
            }
          );
          break;
        case InvestigationPhase.GATHERING_DATA:
          displayText = i18n.translate(
            'investigate.hypothesesPanel.investigationPhase.gatheringData',
            {
              defaultMessage: 'Gathering data in progress...',
            }
          );
          break;
        case InvestigationPhase.PLANNING:
        default:
          displayText = i18n.translate('investigate.hypothesesPanel.investigationPhase.planning', {
            defaultMessage: 'Planning for your investigation...',
          });
      }

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
    if (hypotheses[0].status === HypothesisStatus.RULED_OUT) {
      // First hypothese is ruled out means all hypotheses are ruled out
      return (
        <EuiPanel style={{ borderStyle: 'dashed', boxShadow: 'unset' }}>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="warning"
            title={
              <h2>
                {i18n.translate('notebook.summary.card.allHypothesesRuledOut', {
                  defaultMessage: 'All hypotheses have been ruled out',
                })}
              </h2>
            }
            style={{ maxWidth: '40em' }}
            body={
              <React.Fragment>
                <p>
                  {i18n.translate('notebook.summary.card.allHypothesesRuledOutDescription', {
                    defaultMessage:
                      "You've ruled out all available hypotheses. This could mean the root cause hasn't been identified yet, or additional data is needed to generate new hypotheses.",
                  })}
                </p>
              </React.Fragment>
            }
            actions={
              <>
                {!failedInvestigation && (
                  <>
                    {renderRetryButtonGroup()}
                    <EuiSpacer />
                  </>
                )}

                <EuiText
                  size="xs"
                  color="subdued"
                  style={{
                    borderRadius: 4,
                    backgroundColor: euiThemeVars.ouiColorLightestShade,
                    padding: 12,
                  }}
                >
                  {i18n.translate('notebook.summary.card.feedbackTip', {
                    defaultMessage:
                      'Tip: Your feedback on ruled-out hypotheses will help guide the next investigation round',
                  })}
                </EuiText>
              </>
            }
          />
        </EuiPanel>
      );
    }

    return (
      <EuiFlexGroup key={`hypothesis-${hypotheses[0].id}`} alignItems="center" gutterSize="none">
        <HypothesisItem
          index={0}
          hypothesis={hypotheses[0]}
          onClickHypothesis={handleClickHypothesis}
          hasError={hasError}
        />
      </EuiFlexGroup>
    );
  };

  const renderInvestigationError = () => {
    return (
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner style={{ backgroundColor: isDarkMode ? '#4a2526' : '#fee0e1' }}>
          <EuiFlexGroup gutterSize="none" direction="row" alignItems="center" style={{ gap: 16 }}>
            <EuiIcon type="alert" size="xl" color="danger" />
            <div>
              <EuiTitle size="s">
                <h5 style={{ color: euiThemeVars.ouiColorDanger }}>
                  {i18n.translate('notebook.summary.card.investigationFailed', {
                    defaultMessage: 'Investigation failed',
                  })}
                </h5>
              </EuiTitle>
              <EuiText color="danger">
                {i18n.translate('notebook.summary.card.investigationFailedDescription', {
                  defaultMessage: 'Unable to generate new hypotheses. Showing previous results.',
                })}
              </EuiText>
            </div>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner color="danger">
          <EuiText color="subdued">
            <h5>
              {i18n.translate('notebook.summary.card.previousHypotheses', {
                defaultMessage: 'PREVIOUS HYPOTHESES',
              })}
            </h5>
          </EuiText>
          <EuiSpacer size="m" />
          {renderPrimaryHypothesis(true)}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner color="danger">
          {renderRetryButtonGroup('flexStart')}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
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
          <EuiCopy
            textToCopy={value || ''}
            afterMessage={i18n.translate('notebook.summary.card.copiedToClipboard', {
              defaultMessage: '{label} copied to clipboard',
              values: { label },
            })}
          >
            {(copy) => (
              <EuiLink onClick={copy}>
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
            )}
          </EuiCopy>
        </span>
      </EuiText>
    </EuiFlexItem>
  );

  const reinvestigationButton = (
    <EuiSmallButton
      fill
      onClick={() => openReinvestigateModal(false)}
      disabled={isInvestigating}
      iconType={isInvestigating ? undefined : 'refresh'}
    >
      {isInvestigating ? (
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ gap: 8 }}>
          <EuiLoadingSpinner />
          {i18n.translate('notebook.summary.card.investigating', {
            defaultMessage: 'Investigating',
          })}
        </EuiFlexGroup>
      ) : (
        i18n.translate('notebook.summary.card.reinvestigate', {
          defaultMessage: 'Reinvestigate',
        })
      )}
    </EuiSmallButton>
  );

  return (
    <>
      {showStatusBadge && statusBadge}
      <EuiPanel borderRadius="l" data-test-subj="investigation-results-panel">
        {/* Header Section */}
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="flexStart">
          <EuiTitle>
            <h1>{path}</h1>
          </EuiTitle>
          {!isNotebookReadonly ? reinvestigationButton : null}
        </EuiFlexGroup>
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
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Hypotheses Content Section */}
        {!!failedInvestigation && !isInvestigating
          ? renderInvestigationError()
          : renderPrimaryHypothesis()}
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

          {symptom &&
            renderMetadataField(
              i18n.translate('notebook.summary.card.symptom', { defaultMessage: 'Symptom' }),
              symptom
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
                  <EuiCopy
                    textToCopy={initialGoal}
                    afterMessage={i18n.translate('notebook.summary.card.copiedToClipboard', {
                      defaultMessage: '{label} copied to clipboard',
                      values: {
                        label: i18n.translate('notebook.summary.card.initialGoal', {
                          defaultMessage: 'Initial goal',
                        }),
                      },
                    })}
                  >
                    {(copy) => (
                      <EuiLink onClick={copy}>
                        <EuiCode language="plaintext">{initialGoal}</EuiCode>
                        <EuiIcon
                          size="s"
                          type="copy"
                          style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                        />
                      </EuiLink>
                    )}
                  </EuiCopy>
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
                  {i18n.translate('notebook.summary.card.pplQuery', {
                    defaultMessage: 'PPL Query',
                  })}
                </strong>
                :{' '}
                <span>
                  <EuiCopy
                    textToCopy={variables.pplQuery || ''}
                    afterMessage={i18n.translate('notebook.summary.card.copiedToClipboard', {
                      defaultMessage: '{label} copied to clipboard',
                      values: {
                        label: i18n.translate('notebook.summary.card.pplQuery', {
                          defaultMessage: 'PPL Query',
                        }),
                      },
                    })}
                  >
                    {(copy) => (
                      <EuiLink onClick={copy}>
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
                    )}
                  </EuiCopy>
                </span>
              </EuiText>
            </EuiFlexItem>
          )}

          {variables?.dslQuery && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('notebook.summary.card.dslQuery', {
                    defaultMessage: 'DSL Query',
                  })}
                </strong>
                :{' '}
                <span>
                  <EuiCopy
                    textToCopy={
                      typeof variables.dslQuery === 'string'
                        ? variables.dslQuery
                        : JSON.stringify(variables.dslQuery, null, 2)
                    }
                    afterMessage={i18n.translate('notebook.summary.card.copiedToClipboard', {
                      defaultMessage: '{label} copied to clipboard',
                      values: {
                        label: i18n.translate('notebook.summary.card.dslQuery', {
                          defaultMessage: 'DSL Query',
                        }),
                      },
                    })}
                  >
                    {(copy) => (
                      <EuiLink onClick={copy}>
                        <EuiCode language="json">
                          {typeof variables.dslQuery === 'string'
                            ? variables.dslQuery
                            : JSON.stringify(variables.dslQuery, null, 2)}
                        </EuiCode>
                        {variables.dslQuery && (
                          <EuiIcon
                            type="copy"
                            size="s"
                            style={{ marginLeft: '4px', verticalAlign: 'middle' }}
                          />
                        )}
                      </EuiLink>
                    )}
                  </EuiCopy>
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
      {showFailedInvestigation && !!failedInvestigation && (
        <FailedInvestigationFlyout
          failedInvestigation={failedInvestigation}
          dataSourceId={context.value.dataSourceId}
          onClose={() => setShowFailedInvestigation(false)}
        />
      )}
    </>
  );
};
