/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiButton, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';

interface UserFeedbackButtonProps {
  feedbackSummary: string;
}

export const UserFeedbackButton: React.FC<UserFeedbackButtonProps> = ({ feedbackSummary }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButton
          aria-label={i18n.translate('agentic.notebook.userfeedbackButton', {
            defaultMessage: 'User feedback',
          })}
          color="text"
          iconType="chatLeft"
          size="s"
          onClick={() => setIsPopoverOpen(true)}
          style={{
            color: euiThemeVars.ouiColorDarkShade,
            borderColor: euiThemeVars.ouiColorMediumShade,
          }}
        >
          {i18n.translate('agentic.notebook.userfeedbackButton', {
            defaultMessage: 'User feedback',
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>
        {i18n.translate('agentic.notebook.userfeedbackButton', {
          defaultMessage: 'User feedback',
        })}
      </EuiPopoverTitle>
      <EuiText style={{ width: 400 }}>{feedbackSummary}</EuiText>
    </EuiPopover>
  );
};
