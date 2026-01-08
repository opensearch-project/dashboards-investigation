/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';

export const HypothesisBadge: React.FC<{
  label: string;
  color: string;
  icon?: string;
}> = ({ label, color, icon }) => {
  return (
    <EuiBadge
      color={color}
      iconType={icon}
      style={{ alignContent: 'center', borderRadius: '9999px' }}
    >
      {label}
    </EuiBadge>
  );
};

export const LikelihoodBadge: React.FC<{
  likelihood: number;
}> = ({ likelihood }) => {
  const getLikelihoodConfig = (value: number) => {
    if (value >= 70) {
      return { label: 'Strong evidence', color: euiThemeVars.ouiColorVis13 };
    } else if (value >= 40) {
      return { label: 'Moderate evidence', color: euiThemeVars.ouiColorVis15 };
    } else {
      return { label: 'Weak evidence', color: euiThemeVars.ouiColorVis2 };
    }
  };

  const { label, color } = getLikelihoodConfig(likelihood);

  return (
    <EuiFlexGroup gutterSize="none" style={{ color, gap: 4 }} direction="row" alignItems="center">
      <EuiIcon size="s" type="checkInCircleFilled" />
      {`${label} · ${likelihood}%`}
    </EuiFlexGroup>
  );
};
