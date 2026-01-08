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
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';
import { useNotebook } from '../../../../hooks/use_notebook';

interface AlternativeHypothesesPanelProps {
  notebookId: string;
  isInvestigating: boolean;
}

export const AlternativeHypothesesPanel: React.FC<AlternativeHypothesesPanelProps> = ({
  notebookId,
  isInvestigating,
}) => {
  const {
    services: { notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const notebookContext = useContext(NotebookReactContext);
  const { hypotheses } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const history = useHistory();
  const { updateHypotheses } = useNotebook();

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  const handleReplaceAsPrimary = async (hypothesisId: string) => {
    try {
      const currentHypotheses = hypotheses || [];
      const targetIndex = currentHypotheses.findIndex((h) => h.id === hypothesisId);
      if (targetIndex === -1) return;

      const reorderedHypotheses = [...currentHypotheses];
      const [targetHypothesis] = reorderedHypotheses.splice(targetIndex, 1);
      reorderedHypotheses.unshift(targetHypothesis);

      await updateHypotheses(reorderedHypotheses);
      notifications.toasts.addSuccess(
        i18n.translate('notebook.hypotheses.panel.primaryHypothesisUpdated', {
          defaultMessage: 'Primary hypothesis updated successfully',
        })
      );
    } catch (error) {
      notifications.toasts.addDanger(
        i18n.translate('notebook.hypotheses.panel.failedToUpdatePrimaryHypothesis', {
          defaultMessage: 'Failed to update primary hypothesis',
        })
      );
      console.error(error);
    }
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

    return hypotheses
      .slice(1)
      .sort((a, b) => b.likelihood - a.likelihood)
      .map((hypothesis, index) => (
        <React.Fragment key={`hypothesis-${hypothesis.id}`}>
          <EuiPanel>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <HypothesisItem
                index={index + 1}
                hypothesis={hypothesis}
                onClickHypothesis={handleClickHypothesis}
                additionalButton={{
                  label: i18n.translate('notebook.hypotheses.panel.replaceAsPrimary', {
                    defaultMessage: 'Replace as Primary',
                  }),
                  onClick: () => handleReplaceAsPrimary(hypothesis.id),
                }}
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
