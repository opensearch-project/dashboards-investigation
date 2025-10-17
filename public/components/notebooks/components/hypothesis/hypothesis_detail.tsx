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
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { HypothesisBadge } from './hypothesis_badge';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { Paragraphs } from '../paragraph_components/paragraphs';
import { generateParagraphPrompt } from '../../../../services/helpers/per_agent';
import './hypothesis_detail.scss';

export const HypothesisDetail: React.FC = () => {
  const {
    services: { http, updateContext, paragraphService },
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

  useEffect(() => {
    if (!currentHypothesis) {
      updateContext(1, null);
      return;
    }
    console.log('hypothesis - updateContext', currentHypothesis);
    (async () => {
      const includedParagraphs = paragraphsStates.filter((item) =>
        currentHypothesis.supportingFindingParagraphIds.includes(item.value.id)
      );
      updateContext(1, {
        displayName: `Hypothesis: ${currentHypothesis.title}`,
        notebookId: notebookContext.state.value.id,
        hypothesisId: currentHypothesis.id,
        contextContent: `
            ## Hypothesis
            ${currentHypothesis.title}
            ## Hypothesis Description
            ${currentHypothesis.description}
            ## Hypothesis Findings
            ${(
              await generateParagraphPrompt({
                paragraphService,
                paragraphs: includedParagraphs.map((paragraph) => paragraph.value),
              })
            )
              .filter((item) => item)
              .map((item) => item)
              .join('\n')}
          `,
      });
    })();

    return () => {
      updateContext(1, null);
    };
  }, [
    currentHypothesis,
    notebookContext.state.value.id,
    notebookContext.state.value.title,
    updateContext,
    paragraphService,
    paragraphsStates,
  ]);

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
    {
      id: `next`,
      label: 'Suggested next steps',
    },
  ];

  if (!currentHypothesis) {
    return (
      <>
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ padding: 16, gap: 10 }}>
          <EuiSmallButton
            iconType="sortLeft"
            style={{ borderRadius: '9999px' }}
            onClick={() => {
              history.goBack();
            }}
          >
            Back
          </EuiSmallButton>
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
              <EuiSmallButton
                iconType="sortLeft"
                style={{ borderRadius: '9999px' }}
                onClick={() => {
                  updateContext({
                    investigation: [
                      {
                        level: 0,
                        displayName: `Investigation: ${notebookContext.state.value.title}`,
                        notebookId: notebookContext.state.value.id,
                        contextContent: '',
                      },
                    ],
                  });
                  history.goBack();
                }}
              >
                Back
              </EuiSmallButton>
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
            <EuiPageHeaderSection style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <EuiSmallButton style={{ borderRadius: '9999px' }}>Rule out</EuiSmallButton>
              <EuiSmallButton fill style={{ borderRadius: '9999px' }}>
                Confirm hypothesis
              </EuiSmallButton>
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
                <EuiText color="subdued" size="s">
                  Update 2 min ago
                </EuiText>
                <HypothesisBadge label="Under investigation" color="hollow" icon="pulse" />
                <HypothesisBadge
                  label={`Strong evidence ${currentHypothesis.likelihood}%`}
                  color="#DCFCE7"
                />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText>{currentHypothesis.description}</EuiText>
              <EuiSpacer size="s" />

              <EuiPanel color="plain" style={{ height: 50 }}>
                Graph
              </EuiPanel>
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
                      .map((id) => paragraphsStates.find((p) => p.value.id === id))
                      .filter(Boolean)
                      .map((paragraphState, index: number) => {
                        if (!paragraphState) return null;
                        return (
                          <Paragraphs
                            key={paragraphState.value.id}
                            paragraphState={paragraphState}
                            index={index}
                            deletePara={() => {}}
                            scrollToPara={() => {}}
                          />
                        );
                      })}
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
