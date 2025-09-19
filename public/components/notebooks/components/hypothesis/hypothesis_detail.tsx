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
  EuiSimplifiedBreadcrumbs,
  EuiSmallButton,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiButtonGroup,
  EuiButtonIcon,
} from '@elastic/eui';
import MarkdownRender from '@nteract/markdown';
import { useObservable } from 'react-use';
import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { NoteBookServices } from 'public/types';
import { HypothesisItem } from 'common/types/notebooks';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { HypothesisBadge } from './hypothesis_badge';

import './hypothesis_detail.scss';
import { NotebookReactContext } from '../../context_provider/context_provider';

export const HypothesisDetail: React.FC<{ findings?: any; hypothesis?: HypothesisItem }> = ({
  findings,
  hypothesis = {
    title: 'Hypothesis: Cache overload from redundant UserProfile caching',
    description: '',
    supportingFindingParagraphIds: [],
  },
}) => {
  const {
    services: { chrome, updateContext },
  } = useOpenSearchDashboards<NoteBookServices>();
  const history = useHistory();
  const breadcrumbs = useObservable(chrome.getBreadcrumbs$(), []);
  const notebookContext = useContext(NotebookReactContext);

  const [toggleIdSelected, setToggleIdSelected] = useState('evidence');

  useEffect(() => {
    console.log('hypothesis - updateContext', hypothesis);
    updateContext({
      investigation: [
        {
          level: 0,
          displayName: `Investigation: ${notebookContext.state.value.title}`,
          notebookId: notebookContext.state.value.id,
          contextContent: '',
        },
        {
          level: 1,
          displayName: `Hypothesis: ${hypothesis.title}`,
          notebookId: notebookContext.state.value.id,
          contextContent:
            `` +
            `## Hypothesis\n` +
            `${hypothesis.title}\n` +
            `## Hypothesis Description\n` +
            `${hypothesis.description}\n` +
            `## Hypothesis Findings\n` +
            '```json\n' +
            `${JSON.stringify(hypothesis.supportingFindingParagraphIds, null, 2)}\n` +
            '```\n',
        },
      ],
    });
  }, [
    hypothesis,
    notebookContext.state.value.id,
    notebookContext.state.value.title,
    updateContext,
  ]);

  useEffect(() => {
    const headerBars = document.getElementById('globalHeaderBars');
    if (headerBars) {
      headerBars.style.display = 'none';
    }

    return () => {
      if (headerBars) {
        headerBars.style.display = '';
      }
    };
  }, []);

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

  return (
    <EuiPage className="hypothesisDetail" paddingSize="none">
      <EuiPageBody className="hypothesisDetail__body" paddingSize="none">
        <EuiFlexGroup
          gutterSize="none"
          style={{ gap: 8, paddingBlock: 12, paddingInline: 16, maxHeight: 56 }}
        >
          <EuiSimplifiedBreadcrumbs
            breadcrumbs={breadcrumbs}
            max={10}
            data-test-subj="breadcrumbs"
          />
          <HypothesisBadge label="Active" color="hollow" />
          <HypothesisBadge label="P0: Critical" color="danger" />
          <EuiText size="s" color="subdued">
            Duration: 15 minutes
          </EuiText>
          <div style={{ marginLeft: 'auto' }}>
            <EuiButtonIcon iconType="share" aria-label="share" display="base" />
          </div>
        </EuiFlexGroup>

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
                <strong style={{ fontWeight: 600 }}>
                  Hypothesis: Cache overload from redundant UserProfile caching
                </strong>
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
                <HypothesisBadge label="Strong evidence" color="#DCFCE7" />
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText>
                Cache is performing poorly in the last 24 hours - elevated miss rates.
              </EuiText>
              <EuiSpacer size="s" />

              <EuiPanel color="plain" style={{ height: 200 }}>
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

              {toggleIdSelected === 'evidence' && (
                <EuiPanel color="plain">
                  <EuiText className="markdown-output-text">
                    <MarkdownRender source={findings} />
                  </EuiText>
                </EuiPanel>
              )}

              {toggleIdSelected === 'next' && (
                <>
                  <EuiPanel color="plain">
                    <EuiText className="markdown-output-text">Section 1</EuiText>
                  </EuiPanel>
                  <EuiSpacer size="m" />
                  <EuiPanel color="plain">
                    <EuiText className="markdown-output-text">Section 2</EuiText>
                  </EuiPanel>
                </>
              )}
            </EuiPageContentBody>
          </EuiPageContent>
        </div>
      </EuiPageBody>
    </EuiPage>
  );
};
