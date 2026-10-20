/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import { EuiSmallButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { useObservable } from 'react-use';
import { NoteBookServices } from 'public/types';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';

import { NotebookReactContext } from '../../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { useNotebook } from '../../../../hooks/use_notebook';
import { HypothesisStatus } from '../../../../../common/types/notebooks';

export const HypothesisStatusButton: React.FC<{
  hypothesisId: string;
  hypothesisStatus: string | undefined;
  fill?: boolean;
}> = ({ hypothesisId, hypothesisStatus, fill }) => {
  const {
    services: { notifications, investigationTelemetry },
  } = useOpenSearchDashboards<NoteBookServices>();

  const notebookContext = useContext(NotebookReactContext);
  const { hypotheses } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const { updateHypotheses } = useNotebook();

  const [isSaving, setIsSaving] = useState(false);
  const [isRuleOutHovered, setIsRuleOutHovered] = useState(false);
  const [isAcceptHovered, setIsAcceptHovered] = useState(false);
  const isMountedRef = useRef(true);

  const isRuledOut = hypothesisStatus === HypothesisStatus.RULED_OUT;
  const isAccepted = hypothesisStatus === HypothesisStatus.ACCEPTED;

  const defaultButtonStyle = {
    color: euiThemeVars.euiColorDarkShade,
    borderColor: euiThemeVars.euiColorMediumShade,
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleToggleStatus = async () => {
    if (!hypothesisId) return;

    const updatedStatus = isRuledOut ? HypothesisStatus.RULED_IN : HypothesisStatus.RULED_OUT;

    const updatedHypotheses =
      hypotheses?.map((h) => (h.id === hypothesisId ? { ...h, status: updatedStatus } : h)) || [];

    let reorderedHypotheses;
    let shouldPromote = false;
    if (!isRuledOut) {
      // Check if the hypothesis being ruled out is at the first position
      const isFirstHypothesis = hypotheses?.[0]?.id === hypothesisId;

      // Ruling out: move to end and promote highest likelihood active hypothesis to first
      const activeHypotheses = updatedHypotheses.filter(
        (h) => h.id !== hypothesisId && h.status !== HypothesisStatus.RULED_OUT
      );
      const ruledOutHypothesis = updatedHypotheses.find((h) => h.id === hypothesisId);
      const otherRuledOut = updatedHypotheses.filter(
        (h) => h.id !== hypothesisId && h.status === HypothesisStatus.RULED_OUT
      );

      if (activeHypotheses.length > 0) {
        const highestLikelihood = activeHypotheses.sort((a, b) => b.likelihood - a.likelihood)[0];
        const remainingActive = activeHypotheses.filter((h) => h.id !== highestLikelihood.id);
        reorderedHypotheses = [
          highestLikelihood,
          ...remainingActive,
          ruledOutHypothesis!,
          ...otherRuledOut,
        ];
        shouldPromote = isFirstHypothesis;
      } else {
        reorderedHypotheses = [...otherRuledOut, ruledOutHypothesis!];
      }
    } else {
      // Ruling in: check if this is the only active hypothesis
      const activeHypotheses = updatedHypotheses.filter(
        (h) => h.status !== HypothesisStatus.RULED_OUT
      );
      if (activeHypotheses.length === 1) {
        // Move the ruled-in hypothesis to first place
        const ruledInHypothesis = updatedHypotheses.find((h) => h.id === hypothesisId);
        const others = updatedHypotheses.filter((h) => h.id !== hypothesisId);
        reorderedHypotheses = [ruledInHypothesis!, ...others];
      } else {
        reorderedHypotheses = updatedHypotheses;
      }
    }

    setIsSaving(true);
    try {
      await updateHypotheses(reorderedHypotheses);
      notebookContext.state.updateValue({
        hypotheses: reorderedHypotheses,
        isPromoted: shouldPromote,
      });

      // Record telemetry for rule out/rule in
      if (isRuledOut) {
        investigationTelemetry.recordEvent({
          name: 'hypothesis_rule_in',
          data: { notebookId: notebookContext.state.value.id, hypothesisId },
        });
      } else {
        investigationTelemetry.recordEvent({
          name: 'hypothesis_rule_out',
          data: { notebookId: notebookContext.state.value.id, hypothesisId },
        });
      }

      notifications.toasts.addSuccess(
        isRuledOut
          ? i18n.translate('notebook.hypothesis.detail.hypothesisReactivated', {
              defaultMessage: 'Hypothesis reactivated',
            })
          : i18n.translate('notebook.hypothesis.detail.hypothesisRuledOut', {
              defaultMessage: 'Hypothesis ruled out',
            })
      );
    } catch (error) {
      notifications.toasts.addError(error, {
        title: isRuledOut
          ? i18n.translate('notebook.hypothesis.detail.failedToReactivate', {
              defaultMessage: 'Failed to reactivate hypothesis',
            })
          : i18n.translate('notebook.hypothesis.detail.failedToRuleOut', {
              defaultMessage: 'Failed to rule out hypothesis',
            }),
      });
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleAccept = async () => {
    if (!hypothesisId) return;
    const updatedHypotheses =
      hypotheses?.map((h) =>
        h.id === hypothesisId ? { ...h, status: HypothesisStatus.ACCEPTED } : h
      ) || [];
    setIsSaving(true);
    try {
      await updateHypotheses(updatedHypotheses);
      notebookContext.state.updateValue({ hypotheses: updatedHypotheses });

      // Record telemetry for accept
      investigationTelemetry.recordEvent({
        name: 'hypothesis_accept',
        data: { notebookId: notebookContext.state.value.id, hypothesisId },
      });

      notifications.toasts.addSuccess(
        i18n.translate('notebook.hypothesis.detail.hypothesisAccepted', {
          defaultMessage: 'Hypothesis accepted',
        })
      );
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('notebook.hypothesis.detail.failedToAccept', {
          defaultMessage: 'Failed to accept hypothesis',
        }),
      });
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {!isRuledOut && (
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            onClick={(e) => {
              e.stopPropagation();
              handleAccept();
            }}
            onMouseEnter={() => setIsAcceptHovered(true)}
            onMouseLeave={() => setIsAcceptHovered(false)}
            disabled={isSaving || isAccepted}
            iconType={isAccepted ? 'starFilled' : 'starEmpty'}
            color={isAcceptHovered || isAccepted ? 'success' : undefined}
            fill={isAccepted}
            style={
              isAccepted
                ? {
                    color: euiThemeVars.ouiColorGhost,
                    borderColor: euiThemeVars.ouiColorSuccess,
                    backgroundColor: euiThemeVars.ouiColorSuccess,
                  }
                : isAcceptHovered
                ? {}
                : defaultButtonStyle
            }
          >
            {isAccepted
              ? i18n.translate('notebook.hypothesis.detail.accepted', {
                  defaultMessage: 'Accepted',
                })
              : i18n.translate('notebook.hypothesis.detail.accept', {
                  defaultMessage: 'Accept',
                })}
          </EuiSmallButton>
        </EuiFlexItem>
      )}
      {!isAccepted && (
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus();
            }}
            onMouseEnter={() => setIsRuleOutHovered(true)}
            onMouseLeave={() => setIsRuleOutHovered(false)}
            disabled={isSaving}
            iconType={isRuledOut ? 'checkInCircleEmpty' : 'crossInCircleEmpty'}
            color={
              fill ? 'primary' : isRuleOutHovered ? (isRuledOut ? 'success' : 'danger') : undefined
            }
            fill={fill}
            style={isRuleOutHovered || fill ? {} : defaultButtonStyle}
          >
            {isRuledOut
              ? i18n.translate('notebook.hypothesis.detail.ruleIn', {
                  defaultMessage: 'Rule in',
                })
              : i18n.translate('notebook.hypothesis.detail.ruleOut', {
                  defaultMessage: 'Rule out',
                })}
          </EuiSmallButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
