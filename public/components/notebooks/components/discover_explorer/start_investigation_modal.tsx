/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import type { NoteBookServices } from '../../../../types';
import {
  DEFAULT_INVESTIGATION_NAME,
  NOTEBOOKS_API_PREFIX,
} from '../../../../../common/constants/notebooks';
import type { NotebookContext } from '../../../../../common/types/notebooks';

const suggestedActions = [
  {
    name: i18n.translate(
      'investigate.discoverExplorer.startInvestigationModal.suggestedAction.rootCause.name',
      { defaultMessage: 'Root cause analytics' }
    ),
    question: i18n.translate(
      'investigate.discoverExplorer.startInvestigationModal.suggestedAction.rootCause.question',
      { defaultMessage: 'Analyze anomaly and root cause in this dataset.' }
    ),
  },
  {
    name: i18n.translate(
      'investigate.discoverExplorer.startInvestigationModal.suggestedAction.performance.name',
      { defaultMessage: 'Performance issues' }
    ),
    question: i18n.translate(
      'investigate.discoverExplorer.startInvestigationModal.suggestedAction.performance.question',
      { defaultMessage: 'Why these request take time?' }
    ),
  },
];

export interface NotebookCreationPayload {
  name: string;
  context: NotebookContext;
}

export interface StartInvestigationModalProps {
  closeModal?: () => void;
  onProvideNotebookParameters: (
    defaultParameters: NotebookCreationPayload
  ) => Promise<NotebookCreationPayload>;
  additionalContent?: React.ReactNode;
}

export type StartInvestigateModalDedentServices = Pick<
  NoteBookServices,
  'data' | 'http' | 'application' | 'notifications'
>;

export const StartInvestigationModal = ({
  closeModal,
  onProvideNotebookParameters,
  additionalContent,
}: StartInvestigationModalProps) => {
  const [value, setValue] = useState('');
  const {
    services: { http, application, notifications },
  } = useOpenSearchDashboards<StartInvestigateModalDedentServices>();
  const [disabled, setDisabled] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  const createNotebook = async (name: string) => {
    // Build minimal default parameters
    const defaultParameters: NotebookCreationPayload = {
      name,
      context: {
        initialGoal: value,
      },
    };

    // Require external provider to supply complete parameters
    if (!onProvideNotebookParameters) {
      throw new Error('onProvideNotebookParameters is required');
    }

    const finalParameters = await onProvideNotebookParameters(defaultParameters);

    const id = await http.post<string>(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook`, {
      body: JSON.stringify(finalParameters),
    });
    if (!id) {
      throw new Error('create notebook error');
    }
    return id;
  };

  const handleInvestigation = async () => {
    if (disabled || !value.trim()) {
      return;
    }
    setDisabled(true);
    try {
      const id = await createNotebook(DEFAULT_INVESTIGATION_NAME);
      const path = `#/agentic/${id}`;
      application.navigateToApp('investigation-notebooks', {
        path,
      });
      closeModal?.();
    } catch (e) {
      console.error('Failed to investigation', e);
      notifications.toasts.addDanger(
        i18n.translate(
          'investigate.discoverExplorer.startInvestigationModal.toasts.startInvestigationFailed',
          {
            defaultMessage: 'Unable to start investigation',
          }
        )
      );
    } finally {
      setDisabled(false);
    }
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      handleInvestigation();
    }
  };
  return (
    <EuiModal
      onClose={() => {
        closeModal?.();
      }}
      style={{ width: 600 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h5>Start investigation</h5>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {additionalContent && (
          <>
            {additionalContent}
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFormRow fullWidth label="What's the goal of your investigation?">
          <EuiTextArea
            placeholder={i18n.translate(
              'investigate.discoverExplorer.startInvestigationModal.placeholder',
              { defaultMessage: 'Describe the issue you want to investigate.' }
            )}
            value={value}
            onChange={(e) => onChange(e)}
            onKeyUp={handleInputKeyUp}
            disabled={disabled}
            fullWidth
            rows={3}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />

        <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              {i18n.translate('investigate.discoverExplorer.startInvestigationModal.suggested', {
                defaultMessage: 'Suggested:',
              })}
            </EuiText>
          </EuiFlexItem>
          {suggestedActions.map(({ name, question }, index) => (
            <EuiFlexItem grow={false} key={index}>
              <EuiSmallButton
                onClick={() => {
                  setValue(question);
                }}
              >
                {name}
              </EuiSmallButton>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiSmallButton onClick={closeModal}>
          {i18n.translate('investigate.discoverExplorer.startInvestigationModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiSmallButton>
        <EuiSmallButton
          onClick={handleInvestigation}
          isLoading={disabled}
          disabled={disabled || !value.trim()}
          fill
        >
          {i18n.translate(
            'investigate.discoverExplorer.startInvestigationModal.startInvestigationButton',
            {
              defaultMessage: 'Start Investigation',
            }
          )}
        </EuiSmallButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
