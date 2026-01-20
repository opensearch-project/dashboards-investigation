/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSmallButton,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { euiThemeVars } from '@osd/ui-shared-deps/theme';

interface UserFeedbackButtonProps {
  feedbackSummary: string;
  onSave: (feedback: string) => void;
}

export const UserFeedbackButton: React.FC<UserFeedbackButtonProps> = ({
  feedbackSummary,
  onSave,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState(feedbackSummary);

  useEffect(() => {
    setEditedFeedback(feedbackSummary);
  }, [feedbackSummary]);

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
      closePopover={() => {
        setIsPopoverOpen(false);
        setIsEditing(false);
      }}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            {i18n.translate('agentic.notebook.userfeedbackButton', {
              defaultMessage: 'User feedback',
            })}
          </EuiFlexItem>
          {!isEditing && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                aria-label="Edit"
                onClick={() => setIsEditing(true)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>
      {isEditing ? (
        <>
          <EuiTextArea
            style={{ width: 400 }}
            value={editedFeedback}
            onChange={(e) => setEditedFeedback(e.target.value)}
          />
          <EuiPopoverFooter>
            <EuiSmallButton
              fill
              onClick={() => {
                onSave(editedFeedback);
                setIsEditing(false);
              }}
            >
              {i18n.translate('agentic.notebook.saveFeedback', {
                defaultMessage: 'Save',
              })}
            </EuiSmallButton>
          </EuiPopoverFooter>
        </>
      ) : (
        <EuiText style={{ width: 400 }}>{feedbackSummary}</EuiText>
      )}
    </EuiPopover>
  );
};
