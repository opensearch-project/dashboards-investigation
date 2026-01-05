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
  EuiSmallButton,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiLoadingContent,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import React, { useContext, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { NoteBookServices } from 'public/types';
import moment from 'moment';
import { FindingParagraphParameters } from 'common/types/notebooks';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { HypothesisBadge, LikelihoodBadge } from './hypothesis_badge';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { Paragraph } from '../paragraph_components/paragraph';
import './hypothesis_detail.scss';

export const HypothesisDetail: React.FC = () => {
  const {
    services: { http, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [isSaving, setIsSaving] = useState(false);
  const history = useHistory();
  const location = useLocation();
  const { id: notebookId } = useParams<{ id: string }>();

  const notebookContext = useContext(NotebookReactContext);
  const { paragraphs: paragraphsStates, hypotheses } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const [toggleIdSelected] = useState('evidence');

  const pathParts = location.pathname.split('/');
  const hypothesisIndex = pathParts.indexOf('hypothesis');
  const hypothesisId = hypothesisIndex !== -1 ? pathParts[hypothesisIndex + 1] : null;

  const currentHypothesis = hypotheses?.find((h) => h.id === hypothesisId);
  const {
    id: currentHypothesisId,
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

  const handleToggleStatus = async () => {
    if (!currentHypothesis) return;

    const isRuledOut = status === 'RULED_OUT';
    const updatedStatus = isRuledOut ? undefined : 'RULED_OUT';

    const updatedHypotheses = hypotheses?.map((h) =>
      h.id === currentHypothesis.id ? { ...h, status: updatedStatus } : h
    );

    notebookContext.state.updateValue({ hypotheses: updatedHypotheses });

    setIsSaving(true);
    try {
      const body: any = {};
      if (updatedStatus) {
        body.status = updatedStatus;
      }
      await http.put(
        `${NOTEBOOKS_API_PREFIX}/savedNotebook/${notebookId}/hypothesis/${currentHypothesisId}`,
        { body: JSON.stringify(body) }
      );
      notifications.toasts.addSuccess(
        isRuledOut ? 'Hypothesis reactivated' : 'Hypothesis ruled out'
      );
    } catch (error) {
      notifications.toasts.addError(error, {
        title: `Failed to ${isRuledOut ? 'reactivate' : 'rule out'} hypothesis`,
      });
      notebookContext.state.updateValue({ hypotheses });
    } finally {
      setIsSaving(false);
    }
  };

  // TODO: once we have more tab than just "Evidence and reasoning"
  // const toggleButtons = [
  //   {
  //     id: 'evidence',
  //     label: 'Evidence and reasoning',
  //   },
  // ];

  const BackButton = () => (
    <EuiSmallButton
      iconType="sortLeft"
      style={{ borderRadius: '9999px' }}
      onClick={() => {
        history.push(`/agentic/${notebookId}`);
      }}
    >
      Back
    </EuiSmallButton>
  );

  if (!currentHypothesis) {
    return (
      <>
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ padding: 16, gap: 10 }}>
          <BackButton />
          <EuiTitle size="m">
            <strong style={{ fontWeight: 600 }}>Loading Hypothesis...</strong>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiLoadingContent />
      </>
    );
  }

  return (
    <EuiPage className="hypothesisDetail" paddingSize="none">
      <EuiPageBody className="hypothesisDetail__body" paddingSize="none">
        <EuiHorizontalRule margin="none" />
        <div style={{ overflow: 'auto', padding: 16 }}>
          <EuiPageHeader alignItems="center" bottomBorder={false}>
            <EuiPageHeaderSection style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackButton />
              <EuiTitle size="m">
                <span>
                  <strong>Hypothesis: {title}</strong>
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
            <EuiPageHeaderSection style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <EuiSmallButton
                style={{ borderRadius: '9999px' }}
                onClick={handleToggleStatus}
                disabled={isSaving}
              >
                {status === 'RULED_OUT' ? 'Reactivate' : 'Rule out'}
              </EuiSmallButton>
              {/* <EuiSmallButton fill style={{ borderRadius: '9999px' }}>
                Confirm hypothesis
              </EuiSmallButton> */}
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
              <EuiFlexGroup gutterSize="none" style={{ gap: 8 }}>
                <EuiText color="subdued" size="s">
                  Created By: AI Agent
                </EuiText>
                {dateModified && (
                  <EuiText size="s" color="subdued">
                    Updated {moment(dateModified).fromNow()}
                  </EuiText>
                )}
                <LikelihoodBadge likelihood={likelihood || 0} />
                <HypothesisBadge
                  label={status === 'RULED_OUT' ? 'Ruled Out' : 'Active'}
                  color={status === 'RULED_OUT' ? 'danger' : 'hollow'}
                />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiTitle size="s">
                <h5>Summary</h5>
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
                          <h5>Supportive findings</h5>
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
                          <h5>Irrelevant findings</h5>
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
                  </>
                )}

                {toggleIdSelected === 'next' && (
                  <>
                    <EuiPanel color="plain">
                      <EuiText className="markdown-output-text">Section 1</EuiText>
                    </EuiPanel>
                    <EuiPanel color="plain">
                      <EuiText className="markdown-output-text">Section 2</EuiText>
                    </EuiPanel>
                  </>
                )}
              </EuiFlexGroup>
            </EuiPageContentBody>
          </EuiPageContent>
        </div>
      </EuiPageBody>
    </EuiPage>
  );
};
