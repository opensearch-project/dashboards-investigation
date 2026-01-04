/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { EuiSmallButtonEmpty } from '@elastic/eui';
import { i18n } from '@osd/i18n';

import { StartInvestigationModal, NotebookCreationPayload } from './start_investigation_modal';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import type { NoteBookServices } from '../../../../types';
import { NoteBookSource, NotebookType } from '../../../../../common/types/notebooks';

type StartInvestigateButtonServices = Pick<NoteBookServices, 'data'>;

export const StartInvestigateButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const {
    services: { data },
  } = useOpenSearchDashboards<StartInvestigateButtonServices>();

  const currentTime = useMemo(() => {
    return new Date().getTime();
  }, []);

  const handleProvideNotebookParameters = async (
    defaultParameters: NotebookCreationPayload
  ): Promise<NotebookCreationPayload> => {
    const query = data.query.queryString.getQuery();
    const bounds = data.query.timefilter.timefilter.getBounds();
    const selectionFrom = (bounds.min?.unix() ?? 0) * 1000;
    const selectionTo = (bounds.max?.unix() ?? 0) * 1000;

    return {
      ...defaultParameters,
      context: {
        ...defaultParameters.context,
        dataSourceId: query.dataset?.dataSource?.id ?? '',
        source: NoteBookSource.DISCOVER,
        index: query.dataset?.title ?? '',
        notebookType: NotebookType.AGENTIC,
        timeField: query.dataset?.timeFieldName ?? '',
        currentTime,
        timeRange: {
          selectionFrom,
          selectionTo,
        },
        variables: {
          pplQuery: query.query.trim() || data.query.queryString.getInitialQuery().query,
          pplFilters: data.query.filterManager.getFilters(),
        },
      },
    };
  };

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
          onProvideNotebookParameters={handleProvideNotebookParameters}
        />
      )}
    </>
  );
};
