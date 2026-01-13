/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiLoadingContent,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import React, { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { i18n } from '@osd/i18n';
import moment from 'moment';
import { FindingParagraphParameters } from 'common/types/notebooks';
import { EuiSmallButton } from '@elastic/eui';
import { HypothesisBadge, LikelihoodBadge } from './hypothesis_badge';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { Paragraph } from '../paragraph_components/paragraph';
import './hypothesis_detail.scss';
import { HypothesisStatusButton } from './hypthesis_status_button';
import { Topology } from '../topology';
import { useReplaceAsPrimary } from '../../../../hooks/use_replace_primary_hypothesis';

export const HypothesisDetail: React.FC = () => {
  // const history = useHistory();
  const location = useLocation();

  const notebookContext = useContext(NotebookReactContext);
  const { paragraphs: paragraphsStates, hypotheses, topologies } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const { replaceAsPrimary } = useReplaceAsPrimary();

  const [toggleIdSelected] = useState('evidence');

  const pathParts = location.pathname.split('/');
  const hypothesisIndex = pathParts.indexOf('hypothesis');
  const hypothesisId = hypothesisIndex !== -1 ? pathParts[hypothesisIndex + 1] : null;

  const currentHypothesis = hypotheses?.find((h) => h.id === hypothesisId);
  const {
    title,
    description,
    status,
    dateModified,
    likelihood,
    supportingFindingParagraphIds = [],
    irrelevantFindingParagraphIds = [],
    userSelectedFindingParagraphIds = [],
    newAddedFindingIds,
  } = currentHypothesis || {};

  const isRuledOut = status === 'RULED_OUT';

  // TODO: once we have more tab than just "Evidence and reasoning"
  // const toggleButtons = [
  //   {
  //     id: 'evidence',
  //     label: 'Evidence and reasoning',
  //   },
  // ];

  // const BackButton = () => (
  //   <EuiSmallButton
  //     iconType="sortLeft"
  //     style={{ borderRadius: '9999px' }}
  //     onClick={() => {
  //       history.push(`/agentic/${notebookId}`);
  //     }}
  //   >
  //     {i18n.translate('notebook.hypothesis.detail.back', {
  //       defaultMessage: 'Back',
  //     })}
  //   </EuiSmallButton>
  // );

  if (!currentHypothesis) {
    return (
      <>
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ padding: 16, gap: 10 }}>
          {/* <BackButton /> */}
          <EuiTitle size="m">
            <strong style={{ fontWeight: 600 }}>
              {i18n.translate('notebook.hypothesis.detail.loadingHypothesis', {
                defaultMessage: 'Loading Hypothesis...',
              })}
            </strong>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiLoadingContent />
      </>
    );
  }

  return (
    <EuiPage className="hypothesisDetail" paddingSize="none">
      <EuiPageBody className="hypothesisDetail__body" paddingSize="none">
        <div style={{ overflow: 'auto', padding: 16 }}>
          <EuiPageHeader alignItems="center" bottomBorder={false}>
            <EuiPageHeaderSection style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* <BackButton /> */}
              <EuiTitle size="m">
                <span>
                  <strong>
                    {i18n.translate('notebook.hypothesis.detail.hypothesisTitle', {
                      defaultMessage: 'Hypothesis: {title}',
                      values: { title },
                    })}
                  </strong>
                  {/* TODO: display the following information once requirements are clarified */}
                  {/* <span style={{ letterSpacing: 'normal', marginInlineStart: 12 }}>
                    <HypothesisBadge label="Active" color="hollow" />
                  </span>
                  <span style={{ letterSpacing: 'normal', marginInlineStart: 12 }}>
                    <HypothesisBadge label="P0: Critical" color="danger" />
                  </span>
                  <EuiText
                    size="s"
                    color="subdued"
                    style={{
                      display: 'inline-block',
                      letterSpacing: 'normal',
                      marginInlineStart: 12,
                    }}
                  >
                    Duration: 15 minutes
                  </EuiText> */}
                </span>
              </EuiTitle>
            </EuiPageHeaderSection>
          </EuiPageHeader>
          <EuiSpacer size="m" />
          <EuiPageContent
            hasBorder={false}
            hasShadow={false}
            paddingSize="none"
            color="transparent"
            borderRadius="none"
          >
            <EuiPageContentBody>
              <EuiFlexGroup gutterSize="none" justifyContent="spaceAround">
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  justifyContent="flexStart"
                  style={{ gap: 8 }}
                >
                  <EuiFlexItem grow={false}>
                    <LikelihoodBadge likelihood={likelihood || 0} />
                  </EuiFlexItem>

                  <HypothesisBadge
                    label={
                      isRuledOut
                        ? i18n.translate('notebook.hypothesis.detail.ruledOut', {
                            defaultMessage: 'Ruled Out',
                          })
                        : i18n.translate('notebook.hypothesis.detail.active', {
                            defaultMessage: 'Active',
                          })
                    }
                    color={isRuledOut ? 'danger' : 'hollow'}
                  />
                  {hypotheses?.[0]?.id === hypothesisId && !isRuledOut && (
                    <HypothesisBadge
                      label="Primary hypothesis"
                      color="#FAF5FF"
                      textColor="#7300E5"
                    />
                  )}
                </EuiFlexGroup>
                <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" style={{ gap: 8 }}>
                  {hypotheses?.[0]?.id !== hypothesisId && !isRuledOut && (
                    <EuiSmallButton onClick={() => replaceAsPrimary(hypothesisId!)}>
                      {i18n.translate('notebook.hypothesis.detail.replaceAsPrimary', {
                        defaultMessage: 'Replace as primary',
                      })}
                    </EuiSmallButton>
                  )}
                  <HypothesisStatusButton
                    hypothesisId={currentHypothesis.id}
                    hypothesisStatus={status}
                    fill
                  />
                  {/* <EuiSmallButton fill>Confirm hypothesis</EuiSmallButton> */}
                </EuiFlexGroup>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiPanel>
                <EuiFlexGrid columns={4} gutterSize="s" data-test-subj="investigation-metadata">
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="none" direction="column">
                      <EuiText size="s">
                        <b>
                          {i18n.translate('notebook.hypothesis.detail.createdBy', {
                            defaultMessage: 'Created By',
                          })}
                        </b>
                      </EuiText>
                      <EuiText color="subdued" size="s">
                        {i18n.translate('notebook.hypothesis.aiAgent', {
                          defaultMessage: 'AI Agent',
                        })}
                      </EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  {dateModified && (
                    <EuiFlexItem>
                      <EuiText size="s">
                        <b>
                          {i18n.translate('notebook.hypothesis.detail.updated', {
                            defaultMessage: 'Updated {time}',
                            values: { time: '' },
                          })}
                        </b>
                      </EuiText>
                      <EuiFlexItem>
                        <EuiText color="subdued">{moment(dateModified).fromNow()}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexItem>
                  )}
                </EuiFlexGrid>
              </EuiPanel>
              <EuiSpacer size="s" />

              <EuiTitle size="s">
                <h5>
                  {i18n.translate('notebook.hypothesis.detail.summary', {
                    defaultMessage: 'Summary',
                  })}
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText>{description}</EuiText>
              <EuiSpacer size="m" />
              {/* TODO: once we have more tab than just "Evidence and reasoning" */}
              {/* <EuiButtonGroup
                className="hypothesisDetail__findingsButtonGroup"
                legend="This is a basic group"
                options={toggleButtons}
                idSelected={toggleIdSelected}
                onChange={(id: any) => setToggleIdSelected(id)}
              />
              <EuiSpacer size="m" /> */}

              <EuiFlexGroup direction="column" gutterSize="none" style={{ gap: 16 }}>
                {toggleIdSelected === 'evidence' && (
                  <>
                    {(supportingFindingParagraphIds.length > 0 ||
                      (userSelectedFindingParagraphIds &&
                        userSelectedFindingParagraphIds.length > 0) ||
                      (newAddedFindingIds && newAddedFindingIds.length > 0)) && (
                      <>
                        <EuiTitle size="s">
                          <h5>
                            {i18n.translate('notebook.hypothesis.detail.supportiveFindings', {
                              defaultMessage: 'Supportive findings',
                            })}
                          </h5>
                        </EuiTitle>
                        {[
                          ...supportingFindingParagraphIds,
                          ...(userSelectedFindingParagraphIds || []),
                          ...(newAddedFindingIds || []),
                        ]
                          .map((id) => paragraphsStates.findIndex((p) => p.value.id === id))
                          .filter((index) => index !== -1)
                          .sort(
                            (a, b) =>
                              ((paragraphsStates[b].value.input
                                .parameters as FindingParagraphParameters)?.finding?.importance ||
                                0) -
                              ((paragraphsStates[a].value.input
                                .parameters as FindingParagraphParameters)?.finding?.importance ||
                                0)
                          )
                          .map((index) => (
                            <EuiPanel key={paragraphsStates[index].value.id}>
                              <Paragraph index={index} />
                            </EuiPanel>
                          ))}
                      </>
                    )}
                    {irrelevantFindingParagraphIds && irrelevantFindingParagraphIds.length > 0 && (
                      <>
                        <EuiTitle size="s">
                          <h5>
                            {i18n.translate('notebook.hypothesis.detail.irrelevantFindings', {
                              defaultMessage: 'Irrelevant findings',
                            })}
                          </h5>
                        </EuiTitle>
                        {irrelevantFindingParagraphIds
                          .map((id) => paragraphsStates.findIndex((p) => p.value.id === id))
                          .filter((index) => index !== -1)
                          .map((index) => (
                            <EuiPanel key={paragraphsStates[index].value.id}>
                              <Paragraph index={index} />
                            </EuiPanel>
                          ))}
                      </>
                    )}
                    {topologies &&
                      topologies.filter((topology) =>
                        topology.hypothesisIds?.includes(currentHypothesis.id)
                      ).length > 0 && (
                        <div>
                          <EuiTitle size="s">
                            <h5>
                              {i18n.translate('notebook.hypothesis.detail.relatedTopology', {
                                defaultMessage: 'Related topology',
                              })}
                            </h5>
                          </EuiTitle>
                          {topologies
                            .filter((topology) =>
                              topology.hypothesisIds?.includes(currentHypothesis.id)
                            )
                            .map((topolopy, index) => {
                              return (
                                <React.Fragment key={`typology-${index}`}>
                                  <Topology topologyItem={topolopy} />
                                </React.Fragment>
                              );
                            })}
                        </div>
                      )}
                  </>
                )}

                {/* {toggleIdSelected === 'next' && (
                  <>
                    <EuiPanel color="plain">
                      <EuiText className="markdown-output-text">Section 1</EuiText>
                    </EuiPanel>
                    <EuiPanel color="plain">
                      <EuiText className="markdown-output-text">Section 2</EuiText>
                    </EuiPanel>
                  </>
                )} */}
              </EuiFlexGroup>
            </EuiPageContentBody>
          </EuiPageContent>
        </div>
      </EuiPageBody>
    </EuiPage>
  );
};
