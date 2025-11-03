/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

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
