/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import moment from 'moment';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FindingParagraphParameters } from '../../../../../common/types/notebooks';

interface FindingHeaderProps {
  parameters: FindingParagraphParameters;
  dateModified: string;
  isAIGenerated: boolean;
  supportingHypothesesCount: number;
}

export const FindingHeader: React.FC<FindingHeaderProps> = ({
  parameters,
  dateModified,
  isAIGenerated,
  supportingHypothesesCount,
}) => {
  const description = parameters?.finding?.description;
  const importance = parameters?.finding?.importance;
  const feedback = parameters?.finding?.feedback;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {isAIGenerated
                ? i18n.translate('notebook.finding.header.aiGeneratedFinding', {
                    defaultMessage: '{description}',
                    values: {
                      description:
                        description ||
                        i18n.translate('notebook.finding.header.aiGeneratedFindingDefault', {
                          defaultMessage: 'AI generated finding',
                        }),
                    },
                  })
                : i18n.translate('notebook.finding.header.userFinding', {
                    defaultMessage: 'User Finding',
                  })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            style={{ whiteSpace: 'nowrap', ...(!isAIGenerated && { marginInlineEnd: 32 }) }}
          >
            {isAIGenerated
              ? i18n.translate('notebook.finding.header.updated', {
                  defaultMessage: 'Updated',
                })
              : i18n.translate('notebook.finding.header.created', {
                  defaultMessage: 'Created',
                })}
            &nbsp;
            {moment(dateModified).fromNow()}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isAIGenerated && (
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <span>
            <EuiBadge>
              {i18n.translate('notebook.finding.header.aiGenerated', {
                defaultMessage: 'AI Generated',
              })}
            </EuiBadge>
            <EuiBadge color="secondary">
              {i18n.translate('notebook.finding.header.importance', {
                defaultMessage: '{value}% Importance',
                values: { value: importance },
              })}
            </EuiBadge>
          </span>
          <span>
            {feedback === 'CONFIRMED' && (
              <EuiBadge color="warning">
                {i18n.translate('notebook.finding.header.confirmed', {
                  defaultMessage: 'Confirmed',
                })}
              </EuiBadge>
            )}
            {feedback === 'REJECTED' && (
              <EuiBadge color="danger">
                {i18n.translate('notebook.finding.header.rejected', {
                  defaultMessage: 'Rejected',
                })}
              </EuiBadge>
            )}
            {supportingHypothesesCount > 0 && (
              <EuiBadge color="primary">
                {supportingHypothesesCount === 1
                  ? i18n.translate('notebook.finding.header.supportsHypothesis', {
                      defaultMessage: 'Supports {count} Hypothesis',
                      values: { count: supportingHypothesesCount },
                    })
                  : i18n.translate('notebook.finding.header.supportsHypotheses', {
                      defaultMessage: 'Supports {count} Hypotheses',
                      values: { count: supportingHypothesesCount },
                    })}
              </EuiBadge>
            )}
          </span>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
    </>
  );
};
