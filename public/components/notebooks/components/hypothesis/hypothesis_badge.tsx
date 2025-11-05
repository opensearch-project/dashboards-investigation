/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

export const HypothesisBadge = ({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: string;
}) => {
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
      return { label: 'Strong evidence', color: '#DCFCE7' };
    } else if (value >= 40) {
      return { label: 'Moderate evidence', color: '#FEF3C7' };
    } else {
      return { label: 'Weak evidence', color: '#FEE2E2' };
    }
  };

  const { label, color } = getLikelihoodConfig(likelihood);

  return <HypothesisBadge label={`${label} ${likelihood}%`} color={color} />;
};
