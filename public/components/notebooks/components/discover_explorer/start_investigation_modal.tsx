/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import type { NoteBookServices } from '../../../../types';
import {
  DEFAULT_INVESTIGATION_NAME,
  NOTEBOOKS_API_PREFIX,
} from '../../../../../common/constants/notebooks';

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

export interface StartInvestigationModalProps {
  log?: Record<string, any>;
  closeModal?: () => void;
}

export type StartInvestigateModalDedentServices = Pick<
  NoteBookServices,
  'data' | 'http' | 'application' | 'notifications'
>;

export const StartInvestigationModal = ({ log, closeModal }: StartInvestigationModalProps) => {
  const [value, setValue] = useState('');
  const {
    services: { data, http, application, notifications },
  } = useOpenSearchDashboards<StartInvestigateModalDedentServices>();
  const [disabled, setDisabled] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const currentTime = useMemo(() => {
    return new Date().getTime();
  }, []);

  const createNotebook = async (name: string) => {
    const query = data.query.queryString.getQuery();
    const bounds = data.query.timefilter.timefilter.getBounds();
    const selectionFrom = (bounds.min?.unix() ?? 0) * 1000;
    const selectionTo = (bounds.max?.unix() ?? 0) * 1000;
    const id = await http.post<string>(`${NOTEBOOKS_API_PREFIX}/note/savedNotebook`, {
      body: JSON.stringify({
        name,
        context: {
          dataSourceId: query.dataset?.dataSource?.id ?? '',
          source: 'Discover',
          index: query.dataset?.title ?? '',
          notebookType: 'Agentic',
          initialGoal: value,
          timeField: query.dataset?.timeFieldName ?? '',
          ...(log
            ? { log }
            : {
                currentTime,
                timeRange: {
                  selectionFrom,
                  selectionTo,
                },
                variables: {
                  pplQuery: query.query.trim() || data.query.queryString.getInitialQuery().query,
                  pplFilters: data.query.filterManager.getFilters(),
                },
              }),
        },
      }),
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

  const handleInputKeyUp = (e) => {
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
        {log && (
          <EuiPanel>
            <EuiText>You selected:</EuiText>
            <EuiSpacer size="xs" />
            <EuiCodeBlock language="json" isCopyable={true} overflowHeight={160}>
              {JSON.stringify(log, null, 2)}
            </EuiCodeBlock>
          </EuiPanel>
        )}
        <EuiSpacer size="s" />
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
