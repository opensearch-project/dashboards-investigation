/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiSmallButtonEmpty } from '@elastic/eui';
import { i18n } from '@osd/i18n';

import { StartInvestigationModal } from './start_investigation_modal';

export const StartInvestigateButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <>
      <EuiSmallButtonEmpty
        onClick={() => {
          setIsVisible(true);
        }}
      >
        {i18n.translate('investigate.discoverExplorer.resultsActionBar.startInvestigation', {
          defaultMessage: 'Start Investigation',
        })}
      </EuiSmallButtonEmpty>
      {isVisible && (
        <StartInvestigationModal
          closeModal={() => {
            setIsVisible(false);
          }}
        />
      )}
    </>
  );
};
