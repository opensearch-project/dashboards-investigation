/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import React from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  EuiSmallButton,
} from '@elastic/eui';
import { HypothesisItem as HypothesisItemProps } from 'common/types/notebooks';
import { NoteBookServices } from 'public/types';
import moment from 'moment';
import { LikelihoodBadge } from './hypothesis_badge';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

export const HypothesisItem: React.FC<{
  index: number;
  hypothesis: HypothesisItemProps;
  onClickHypothesis: (hypothesisId: string) => void;
  additionalButton?: { label: string; onClick: () => void };
}> = ({ index, hypothesis, onClickHypothesis, additionalButton }) => {
  const {
    services: { uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();
  const isDarkMode = uiSettings.get('theme:darkMode');

  const { title, description, likelihood, id, dateModified } = hypothesis;
  return (
    <EuiPanel
      style={{
        backgroundColor: isDarkMode ? '#2D1B3D' : '#FAF5FF',
        padding: 16,
        border: 0,
        boxShadow: 'unset',
      }}
    >
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => onClickHypothesis(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onClickHypothesis(id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <EuiFlexGroup gutterSize="none" alignItems="center" style={{ gap: 8 }}>
          {index === 0 ? (
            <>
              <EuiIcon type="generate" size="l" color={isDarkMode ? '#BB86FC' : '#7300E5'} />
              <EuiText size="s">
                {i18n.translate('notebook.hypothesis.item.primaryHypothesis', {
                  defaultMessage: 'Primary hypothesis',
                })}
              </EuiText>
            </>
          ) : (
            <>
              <EuiFlexItem grow={false}>
                <EuiPanel
                  style={{
                    height: 8,
                    width: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                    boxShadow: 'unset',
                  }}
                >
                  {index}
                </EuiPanel>
              </EuiFlexItem>
              <EuiText size="s">
                {i18n.translate('notebook.hypothesis.item.alternateHypothesis', {
                  defaultMessage: 'Alternate hypothesis',
                })}
              </EuiText>
            </>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false} />
          <EuiFlexItem>
            <EuiTitle size="s">
              <strong>{title}</strong>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{description}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          <div>
            <LikelihoodBadge likelihood={likelihood} />
            <EuiSpacer size="xs" />
            {dateModified && (
              <EuiText size="xs" color="subdued">
                {i18n.translate('notebook.hypothesis.item.updated', {
                  defaultMessage: 'Updated {time}',
                  values: { time: moment(dateModified).fromNow() },
                })}
              </EuiText>
            )}
          </div>
          {!!additionalButton && (
            <EuiSmallButton
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                additionalButton.onClick();
              }}
            >
              {additionalButton.label}
            </EuiSmallButton>
          )}
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};
