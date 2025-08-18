/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { MultiVariantInput } from './input/multi_variant_input';

interface InputPanelProps {
  onSubmit: (paragraphInput: string, inputType: string) => Promise<void>;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onSubmit }) => {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 10,
        width: 900,
        marginLeft: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
      }}
    >
      <EuiPanel grow borderRadius="xl" hasBorder hasShadow paddingSize="s">
        <MultiVariantInput onSubmit={onSubmit} />
      </EuiPanel>
    </div>
  );
};
