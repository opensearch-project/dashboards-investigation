/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';

export const ReinvestigateModal: React.FC<{
  initialGoal: string;
  confirm: (question: string, isReinvestigate: boolean) => void;
  closeModal: () => void;
}> = ({ initialGoal, confirm, closeModal }) => {
  const [value, setValue] = useState(initialGoal);
  const [checked, setChecked] = useState(false);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>Reinvetigate the issue</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFormRow label="Edit inital goal">
            <EuiFieldText value={value} onChange={(e) => setValue(e.target.value)} required />
          </EuiFormRow>
          <EuiSpacer />
          <EuiSwitch
            label="Bring the exsiting hypothesis and findings"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={() => confirm(value, checked)} fill disabled={!value.trim()}>
            Confirm
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
