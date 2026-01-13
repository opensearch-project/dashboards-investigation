/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import React, { useContext } from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  EuiSmallButton,
  EuiBadge,
} from '@elastic/eui';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';
import { HypothesisItem as HypothesisItemProps } from 'common/types/notebooks';
import { NoteBookServices } from 'public/types';
import moment from 'moment';
import { useEffect, useRef } from 'react';
import { useObservable } from 'react-use';
import { LikelihoodBadge } from './hypothesis_badge';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { HypothesisStatusButton } from './hypthesis_status_button';
import { NotebookReactContext } from '../../context_provider/context_provider';

export const HypothesisItem: React.FC<{
  index: number;
  hypothesis: HypothesisItemProps;
  onClickHypothesis: (hypothesisId: string) => void;
  additionalButton?: { label: string; onClick: () => void };
  hasError?: boolean;
}> = ({ index, hypothesis, onClickHypothesis, additionalButton, hasError }) => {
  const {
    services: { uiSettings },
  } = useOpenSearchDashboards<NoteBookServices>();
  const notebookContext = useContext(NotebookReactContext);
  const { isPromoted } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isDarkMode = uiSettings.get('theme:darkMode');

  const { title, description, likelihood, id, dateModified, status } = hypothesis;
  const isRuledOut = status === 'RULED_OUT';

  return (
    <div
      style={{ cursor: 'pointer', width: '100%' }}
      onClick={() => onClickHypothesis(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onClickHypothesis(id);
        }
      }}
      role="button"
      tabIndex={0}
      data-test-subject="hypothesisItem"
    >
      <EuiPanel
        style={{
          backgroundColor: hasError
            ? euiThemeVars.ouiColorGhost
            : isDarkMode
            ? '#2D1B3D'
            : '#FAF5FF',
          padding: 16,
          border: 0,
          boxShadow: 'unset',
          opacity: isRuledOut ? 0.8 : 1,
        }}
      >
        <EuiFlexGroup
          gutterSize="none"
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
        >
          <EuiFlexGroup gutterSize="none" alignItems="center" style={{ gap: 8 }}>
            {index === 0 ? (
              <>
                {/* FIXME: hardcoded color  */}
                <EuiIcon type="generate" size="l" color={isDarkMode ? '#BB86FC' : '#7300E5'} />
                <EuiText
                  size="s"
                  style={{ color: isDarkMode ? '#BB86FC' : '#7300E5', fontWeight: 500 }}
                >
                  {i18n.translate('notebook.hypothesis.item.primaryHypothesis', {
                    defaultMessage: 'PRIMARY HYPOTHESIS',
                  })}
                </EuiText>
                {isPromoted && (
                  <EuiBadge color={isDarkMode ? '#BB86FC' : '#7300E5'}>
                    {i18n.translate('notebook.hypothesis.item.justPromoted', {
                      defaultMessage: 'Just promoted',
                    })}
                  </EuiBadge>
                )}
              </>
            ) : (
              <>
                <EuiFlexItem grow={false}>
                  <EuiPanel
                    style={{
                      height: 4,
                      width: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      boxShadow: 'unset',
                      border: 'unset',
                      borderRadius: 9999,
                      color: euiThemeVars.euiColorGhost,
                      backgroundColor: euiThemeVars.euiColorWarning,
                    }}
                  >
                    {index}
                  </EuiPanel>
                </EuiFlexItem>
                <EuiText size="s" style={{ fontWeight: 500, color: euiThemeVars.euiColorWarning }}>
                  {isRuledOut
                    ? i18n.translate('notebook.hypothesis.item.ruledOut', {
                        defaultMessage: 'RULED OUT',
                      })
                    : i18n.translate('notebook.hypothesis.item.alternateHypothesis', {
                        defaultMessage: 'ALTERNATIVE HYPOTHESIS',
                      })}
                </EuiText>
              </>
            )}
          </EuiFlexGroup>
          <HypothesisStatusButton hypothesisId={id} hypothesisStatus={status} />
          <EuiIcon type="arrowRight" color="subdued" style={{ marginInlineStart: 8 }} />
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false} />
          <EuiFlexItem style={{ ...(isRuledOut && { textDecoration: 'line-through' }) }}>
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
      </EuiPanel>
    </div>
  );
};
