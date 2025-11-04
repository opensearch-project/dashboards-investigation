/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import type { NoteBookServices } from '../../../../types';
import { NOTEBOOKS_API_PREFIX } from '../../../../../common/constants/notebooks';

export type InvestigateInputDedentServices = Pick<
  NoteBookServices,
  'data' | 'http' | 'application'
>;

export const InvestigateInput = ({ log }: { log?: Record<string, any> }) => {
  const [value, setValue] = useState('');
  const {
    services: { data, http, application },
  } = useOpenSearchDashboards<InvestigateInputDedentServices>();
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
          timeRange: {
            selectionFrom,
            selectionTo,
          },
          source: 'Discover',
          timeField: query.dataset?.timeFieldName ?? '',
          index: query.dataset?.title ?? '',
          currentTime,
          variables: {
            pplQuery: query.query,
            pplFilters: data.query.filterManager.getFilters(),
          },
          notebookType: 'Agentic',
          initialGoal: value,
          ...(log ? { log } : {}),
        },
      }),
    });
    if (!id) {
      throw new Error('create notebook error');
    }
    return id;
  };

  const handleInvestigation = async () => {
    if (disabled) {
      return;
    }
    setDisabled(true);
    try {
      const id = await createNotebook('Discover investigation');
      const path = `#/agentic/${id}`;
      application.navigateToApp('investigation-notebooks', {
        path,
      });
    } catch (e) {
      console.error('Failed to investigation', e);
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
    <EuiFlexGroup alignItems="center" gutterSize="xl">
      <EuiFlexItem grow={true}>
        <EuiFieldText
          placeholder={i18n.translate(
            'investigate.discoverExplorer.investigationPanel.placeholder',
            { defaultMessage: 'Ask about potential privilege escalation attack' }
          )}
          value={value}
          onChange={(e) => onChange(e)}
          aria-label={i18n.translate('investigate.discoverExplorer.investigationPanel.ariaLabel', {
            defaultMessage: 'Ask about potential privilege escalation attack',
          })}
          onKeyUp={handleInputKeyUp}
          isLoading={disabled}
          disabled={disabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="search"
          onClick={handleInvestigation}
          aria-label="Investigate"
          disabled={disabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
