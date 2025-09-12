/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { NoteBookSource, SummaryDataItem } from '../../common/types/notebooks';
import { getPPLQueryWithTimeRange } from '../utils/time';
import { DataDistributionDataService } from '../components/notebooks/components/data_distribution/data_distribution_data_service';
import { NotificationsStart } from '../../../../src/core/public';

interface UseDataDistributionProps {
  source: NoteBookSource;
  index: string;
  timeRange: {
    selectionFrom: number;
    selectionTo: number;
    baselineFrom?: number;
    baselineTo?: number;
  };
  timeField: string;
  dataSourceId: string;
  filters: Array<Record<string, any>>;
  variables: {
    pplQuery?: string;
    [key: string]: unknown;
  };
  notifications: NotificationsStart;
}

interface UseDataDistributionResult {
  dataDistribution: SummaryDataItem[];
  fetchDataLoading: boolean;
  distributionLoading: boolean;
  error: string | null;
  loadDataDistribution: () => Promise<void>;
}

export const useDataDistribution = ({
  source,
  index,
  timeRange,
  timeField,
  dataSourceId,
  filters,
  variables,
  notifications,
}: UseDataDistributionProps): UseDataDistributionResult => {
  const [dataDistribution, setDataDistribution] = useState<SummaryDataItem[]>([]);
  const [fetchDataLoading, setFetchDataLoading] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataService = useMemo(() => {
    const service = new DataDistributionDataService();
    service.setConfig(dataSourceId, index, timeField, source);
    return service;
  }, [dataSourceId, index, timeField, source]);

  const loadDataDistribution = useCallback(async () => {
    try {
      setFetchDataLoading(true);
      setDistributionLoading(true);
      setError(null);

      if (source === NoteBookSource.DISCOVER) {
        const pplData = await dataService.fetchPPlData(
          getPPLQueryWithTimeRange(
            variables?.['pplQuery'] as string,
            timeRange.selectionFrom,
            timeRange.selectionTo,
            timeField
          )
        );
        setFetchDataLoading(false);
        const singleDataDistribution = await dataService.getSingleDataDistribution(pplData);
        setDataDistribution(singleDataDistribution);
      } else {
        const comparisonData = await dataService.fetchComparisonData({
          timeRange: {
            selectionFrom: timeRange.selectionFrom,
            selectionTo: timeRange.selectionTo,
            baselineFrom: timeRange.baselineFrom!,
            baselineTo: timeRange.baselineTo!,
          },
          selectionFilters: filters,
        });
        setFetchDataLoading(false);
        const comparisonDataDistribution = await dataService.getComparisonDataDistribution(
          comparisonData
        );
        setDataDistribution(comparisonDataDistribution);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      notifications.toasts.addDanger(`Initialize data distribution failed: ${errorMessage}`);
    } finally {
      setFetchDataLoading(false);
      setDistributionLoading(false);
    }
  }, [dataService, filters, notifications, source, timeRange, variables, timeField]);

  useEffect(() => {
    (async () => {
      if (error || dataDistribution.length > 0 || fetchDataLoading || distributionLoading) {
        return;
      }

      await loadDataDistribution();
    })();
  }, [loadDataDistribution, dataDistribution, fetchDataLoading, distributionLoading, error]);

  return {
    dataDistribution,
    fetchDataLoading,
    distributionLoading,
    error,
    loadDataDistribution,
  };
};
