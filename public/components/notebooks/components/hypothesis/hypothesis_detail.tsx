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
  EuiButtonGroup,
  EuiLoadingContent,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import React, { useContext, useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { NoteBookServices } from 'public/types';
import { HypothesisItem as HypothesisItemProps } from 'common/types/notebooks';
import moment from 'moment';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { HypothesisBadge, LikelihoodBadge } from './hypothesis_badge';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { Paragraphs } from '../paragraph_components/paragraphs';
import './hypothesis_detail.scss';

export const HypothesisDetail: React.FC = () => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const history = useHistory();
  const location = useLocation();
  const { id: notebookId } = useParams<{ id: string }>();

  const notebookContext = useContext(NotebookReactContext);
  const { paragraphs: paragraphsStates } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const [currentHypothesis, setCurrentHypothesis] = useState<HypothesisItemProps | undefined>();
  const [toggleIdSelected, setToggleIdSelected] = useState('evidence');

  const pathParts = location.pathname.split('/');
  const hypothesisIndex = pathParts.indexOf('hypothesis');
  const hypothesisId = hypothesisIndex !== -1 ? pathParts[hypothesisIndex + 1] : null;

  useEffect(() => {
    const fetchHypothesis = async () => {
      // TODO: we should have a get by id?
      const response = await http.get(
        `${NOTEBOOKS_API_PREFIX}/savedNotebook/${notebookId}/hypotheses`
      );
      const hypothesis = response.find((res: any) => res.id === hypothesisId);
      setCurrentHypothesis(hypothesis);
    };
    fetchHypothesis();
  }, [http, hypothesisId, notebookId]);

  const toggleButtons = [
    {
      id: 'evidence',
      label: 'Evidence and reasoning',
    },
  ];

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
                  <strong>Hypothesis: {currentHypothesis.title}</strong>
                  <span style={{ letterSpacing: 'normal', marginInlineStart: 12 }}>
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
                  </EuiText>
                </span>
              </EuiTitle>
            </EuiPageHeaderSection>
            {/*
              The following code block is a hypothesis confirmation function, temporarily commented out
              TODO: Wait for the requirements to be clarified.
            */}
            {/* <EuiPageHeaderSection style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <EuiSmallButton style={{ borderRadius: '9999px' }}>Rule out</EuiSmallButton>
              <EuiSmallButton fill style={{ borderRadius: '9999px' }}>
                Confirm hypothesis
              </EuiSmallButton>
            </EuiPageHeaderSection> */}
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
                {currentHypothesis?.dateModified && (
                  <EuiText size="s" color="subdued">
                    Updated {moment(currentHypothesis.dateModified).fromNow()}
                  </EuiText>
                )}
                <LikelihoodBadge likelihood={currentHypothesis.likelihood} />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText>{currentHypothesis.description}</EuiText>
              <EuiSpacer size="m" />
              <EuiButtonGroup
                className="hypothesisDetail__findingsButtonGroup"
                legend="This is a basic group"
                options={toggleButtons}
                idSelected={toggleIdSelected}
                onChange={(id: any) => setToggleIdSelected(id)}
              />
              <EuiSpacer size="m" />

              <EuiFlexGroup direction="column" gutterSize="none" style={{ gap: 16 }}>
                {toggleIdSelected === 'evidence' && (
                  <>
                    {[
                      ...currentHypothesis.supportingFindingParagraphIds,
                      ...(currentHypothesis.newAddedFindingIds || []),
                    ]
                      .map((id) => paragraphsStates.findIndex((p) => p.value.id === id))
                      .filter((index) => index !== -1)
                      .map((index) => (
                        <EuiPanel key={paragraphsStates[index].value.id}>
                          <Paragraphs index={index} deletePara={() => {}} scrollToPara={() => {}} />
                        </EuiPanel>
                      ))}
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
