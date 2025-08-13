/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { i18n } from '@osd/i18n';

import { SystemPromptSettingModal } from './system_prompt_setting_modal';

export const ToggleSystemPromptSettingModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>
      <EuiToolTip
        content={<FormattedMessage id="notebook.editButton.tooltip" defaultMessage="Edit name" />}
      >
        <EuiButtonIcon
          display="base"
          iconType="setting"
          size="s"
          onClick={() => {
            setModalVisible(true);
          }}
          data-test-subj="notebook-system-prompt-icon"
          aria-label={i18n.translate('notebook.systemPromptSettingButton.tooltip', {
            defaultMessage: 'Edit system prompt',
          })}
        />
      </EuiToolTip>
      {modalVisible && (
        <SystemPromptSettingModal
          closeModal={() => {
            setModalVisible(false);
          }}
        />
      )}
    </>
  );
};
