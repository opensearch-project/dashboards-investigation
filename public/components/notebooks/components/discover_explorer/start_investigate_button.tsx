/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiPopover, EuiSmallButtonEmpty } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { InvestigateInput } from './investigate_input';

export const StartInvestigateButton = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const handleTogglePopover = () => setIsPopoverOpen((value) => !value);
  const closePopover = () => setIsPopoverOpen(false);
  return (
    <EuiPopover
      button={
        <EuiSmallButtonEmpty onClick={handleTogglePopover}>
          {i18n.translate('investigate.discoverExplorer.resultsActionBar.startInvestigation', {
            defaultMessage: 'Start Investigation',
          })}
        </EuiSmallButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      panelStyle={{ width: 420 }}
    >
      <InvestigateInput />
    </EuiPopover>
  );
};
