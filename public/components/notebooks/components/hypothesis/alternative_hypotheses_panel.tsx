/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useContext } from 'react';
import { useObservable } from 'react-use';
import { useHistory } from 'react-router-dom';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { HypothesisItem } from './hypothesis_item';
import { useReplaceAsPrimary } from '../../../../hooks/use_replace_primary_hypothesis';

interface AlternativeHypothesesPanelProps {
  notebookId: string;
  isInvestigating: boolean;
}

export const AlternativeHypothesesPanel: React.FC<AlternativeHypothesesPanelProps> = ({
  notebookId,
  isInvestigating,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const { hypotheses } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const history = useHistory();
  const { replaceAsPrimary } = useReplaceAsPrimary();

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  if (isInvestigating || (hypotheses || []).length <= 1) {
    return null;
  }

  const renderHypothesesContent = () => {
    if (!hypotheses?.length) {
      return (
        <EuiText>
          {i18n.translate('notebook.hypotheses.panel.noHypothesesGenerated', {
            defaultMessage: 'No hypotheses generated',
          })}
        </EuiText>
      );
    }

    const allRuledOut = hypotheses.every((h) => h.status === 'RULED_OUT');
    const alternativehypotheses = allRuledOut ? hypotheses : hypotheses.slice(1);

    return alternativehypotheses
      .sort((a, b) => {
        const aRuledOut = a.status === 'RULED_OUT';
        const bRuledOut = b.status === 'RULED_OUT';
        if (aRuledOut !== bRuledOut) return aRuledOut ? 1 : -1;
        return b.likelihood - a.likelihood;
      })
      .map((hypothesis, index) => (
        <React.Fragment key={`hypothesis-${hypothesis.id}`}>
          <EuiPanel>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <HypothesisItem
                index={index + 1}
                hypothesis={hypothesis}
                onClickHypothesis={handleClickHypothesis}
                additionalButton={
                  hypothesis.status !== 'RULED_OUT'
                    ? {
                        label: i18n.translate('notebook.hypotheses.panel.replaceAsPrimary', {
                          defaultMessage: 'Replace as primary',
                        }),
                        onClick: () => replaceAsPrimary(hypothesis.id),
                      }
                    : undefined
                }
              />
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
        </React.Fragment>
      ));
  };

  return (
    <>
      <EuiAccordion
        id="hypotheses"
        buttonContent={
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('notebook.hypotheses.panel.alternativeHypotheses', {
                    defaultMessage: 'Alternative hypotheses ({count})',
                    values: { count: (hypotheses || []).length - 1 },
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        initialIsOpen
      >
        <EuiSpacer size="s" />
        {renderHypothesesContent()}
      </EuiAccordion>
      <EuiSpacer size="s" />
    </>
  );
};
