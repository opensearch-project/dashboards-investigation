/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { firstValueFrom, getFlattenedObject } from '@osd/std';
import {
  NotebookContext,
  NoteBookSource,
  SummaryDataItem,
} from '../../../../../common/types/notebooks';
import {
  DataPublicPluginStart,
  ISearchStart,
  OPENSEARCH_FIELD_TYPES,
  OSD_FIELD_TYPES,
} from '../../../../../../../src/plugins/data/public';
import { getClient, getData, getSearch } from '../../../../services';
import { callOpenSearchCluster } from '../../../../plugin_helpers/plugin_proxy_call';
import { QueryObject } from '../paragraph_components/ppl';

export class DataDistributionDataService {
  private readonly search: ISearchStart;
  private readonly data: DataPublicPluginStart;
  private dataSourceId: string | undefined;
  private index: string = '';
  private timeField: string = '';
  private numberFields: string[] = [];
  private source?: NoteBookSource;

  constructor() {
    this.data = getData();
    this.search = getSearch();
  }

  public setConfig(
    dataSourceId: string | undefined,
    index: string,
    timeField: string,
    source?: NoteBookSource
  ) {
    Object.assign(this, { dataSourceId, index, timeField, source });
  }

  public async fetchComparisonData(props: {
    timeRange:
      | {
          selectionFrom: number;
          selectionTo: number;
          baselineFrom: number;
          baselineTo: number;
        }
      | undefined;
    selectionFilters?: NotebookContext['filters'];
    size?: number;
  }): Promise<{
    selection: Array<Record<string, any>>;
    baseline: Array<Record<string, any>>;
  }> {
    const { timeRange, size = 1000, selectionFilters } = props;
    if (!timeRange) {
      throw new Error('Time range is not defined');
    }

    const [selectionData, baselineData] = await Promise.all([
      this.fetchIndexData(
        new Date(timeRange.selectionFrom),
        new Date(timeRange.selectionTo),
        size,
        selectionFilters
      ),
      this.fetchIndexData(new Date(timeRange.baselineFrom), new Date(timeRange.baselineTo), size),
    ]);

    if (selectionData.length === 0) {
      throw new Error('No data found for the selection time range');
    } else if (baselineData.length === 0) {
      throw new Error('No data found for the baseline time range');
    }

    return {
      selection: selectionData.map((row) => getFlattenedObject(row)),
      baseline: baselineData.map((row) => getFlattenedObject(row)),
    };
  }

  public async getComparisonDataDistribution(data: {
    selection: Array<Record<string, any>>;
    baseline: Array<Record<string, any>>;
  }): Promise<SummaryDataItem[]> {
    const combineData = Object.values(data).flat();
    const usefulFields = await this.getUsefulFields(combineData);
    const differences = this.analyzeDifferences(data, usefulFields);
    return this.formatComparisonSummary(differences, 10);
  }

  public async getSingleDataDistribution(
    data: Array<Record<string, any>>
  ): Promise<SummaryDataItem[]> {
    const usefulFields = await this.getUsefulFields(data);
    const differences = this.analyzeDifferences({ selection: data, baseline: [] }, usefulFields);
    return this.formatComparisonSummary(differences, 30);
  }

  public async fetchPPlData(pplQuery: string): Promise<Array<Record<string, any>>> {
    if (!pplQuery) {
      throw new Error('No ppl query found from discovery');
    }

    const searchQuery = pplQuery;
    const response = await callOpenSearchCluster({
      http: getClient(),
      dataSourceId: this.dataSourceId,
      request: {
        path: `/_plugins/_ppl`,
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
        }),
      },
    });

    const pplData = formatPPLQueryData(response);

    if (pplData.length === 0) {
      throw new Error(`No data found for the ppl query: ${pplQuery}`);
    }
    return pplData;
  }

  private async getUsefulFields(data: Array<Record<string, any>>): Promise<string[]> {
    const fieldValueSets: Record<string, Set<any>> = {};
    const maxCardinality = Math.max(5, Math.floor(data.length / 4));
    const numberFields: string[] = [];

    const mappings = await this.getFields(this.index, this.dataSourceId);
    const keywordFields = mappings
      .filter((field) => {
        if (field.esTypes && field.name && field.type) {
          if (field.type.includes(OSD_FIELD_TYPES.NUMBER)) {
            numberFields.push(field.name);
            return true;
          }
          return (
            field.esTypes.includes(OPENSEARCH_FIELD_TYPES.KEYWORD) ||
            field.esTypes.includes(OPENSEARCH_FIELD_TYPES.BOOLEAN) ||
            field.esTypes.includes(OPENSEARCH_FIELD_TYPES.TEXT)
          );
        }
      })
      .map((field) => field.name);

    const normalizedFields = Array.from(
      new Set(
        keywordFields.map((keywordField) =>
          keywordField.endsWith('.keyword') ? keywordField.replace('.keyword', '') : keywordField
        )
      )
    );

    normalizedFields.forEach((field) => {
      fieldValueSets[field] = new Set();
    });

    // Get unique value for fields
    data.forEach((doc) => {
      normalizedFields.forEach((field) => {
        const value = getFlattenedObject(doc)?.[field];
        if (value !== null && value !== undefined) {
          fieldValueSets[field].add(JSON.stringify(value));
        }
      });
    });
    this.numberFields = numberFields;

    const usefulFields = normalizedFields.filter((field) => {
      const cardinality = fieldValueSets[field]?.size || 0;
      if (/id$/i.test(field)) {
        return cardinality <= 30 && cardinality > 0;
      }
      if (numberFields.includes(field)) {
        return true;
      }
      return cardinality <= maxCardinality && cardinality > 0;
    });

    return usefulFields;
  }

  /**
   * @param comparisonData
   * @param fieldsToAnalyze
   */
  private analyzeDifferences(
    comparisonData: {
      selection: Array<Record<string, any>>;
      baseline: Array<Record<string, any>>;
    },
    fields: string[]
  ): Array<{
    field: string;
    divergence: number;
    selectionDist: Record<string, number>;
    baselineDist: Record<string, number>;
  }> {
    const results = fields.map((field) => {
      // Calculate the distribution of baseline and selection
      let selectionDist = this.calculateFieldDistribution(comparisonData.selection, field);
      let baselineDist = this.calculateFieldDistribution(comparisonData.baseline, field);

      if (this.numberFields.includes(field)) {
        const { groupedSelectionDist, groupedBaselineDist } = this.groupNumericKeys(
          selectionDist,
          baselineDist
        );
        selectionDist = groupedSelectionDist;
        baselineDist = groupedBaselineDist;
      }
      const divergence = this.calculateMaxDifference(selectionDist, baselineDist);
      return {
        field,
        divergence,
        selectionDist,
        baselineDist,
      };
    });

    // Sort in descending order by divergence
    return results.sort((a, b) => b.divergence - a.divergence);
  }

  private formatComparisonSummary(
    differences: Array<{
      field: string;
      divergence: number;
      selectionDist: Record<string, number>;
      baselineDist: Record<string, number>;
    }>,
    maxResults: number = 10
  ): SummaryDataItem[] {
    // Only take the first N significant differences
    const topDifferences = differences.filter((diff) => diff.divergence > 0).slice(0, maxResults);
    const sourceFromDis = this.source === NoteBookSource.DISCOVER;

    return topDifferences.map((diff) => {
      const { field, divergence, selectionDist, baselineDist } = diff;

      // Calculate the changes in all fields
      const allKeys = [...new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)])];
      const changes = allKeys.map((value) => {
        const selectionPercentage = selectionDist[value] || 0;
        const baselinePercentage = baselineDist[value] || 0;

        return {
          value,
          selectionPercentage: Number(selectionPercentage.toFixed(2)),
          ...(!sourceFromDis ? { baselinePercentage: Number(baselinePercentage.toFixed(2)) } : {}),
        };
      });

      // Take the top 10 largest changes
      const topChanges = changes
        .sort((a, b) =>
          sourceFromDis
            ? b.selectionPercentage - a.selectionPercentage
            : (b.baselinePercentage || 0) - (a.baselinePercentage || 0)
        )
        .slice(0, 10);

      return {
        field,
        divergence,
        topChanges,
      };
    });
  }

  private async fetchIndexData(
    startTime: Date,
    endTime: Date,
    size: number = 1000,
    filter?: Array<Record<string, any>>
  ): Promise<Array<Record<string, any>>> {
    this.data.query.queryString.setQuery({ language: 'kuery' }, true);
    const params = {
      index: this.index,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  [this.timeField]: {
                    gte: startTime.toISOString(),
                    lte: endTime.toISOString(),
                    format: 'strict_date_optional_time',
                  },
                },
              },
              ...(filter || []),
            ],
          },
        },
        size,
      },
    };

    try {
      const response = await firstValueFrom(
        this.search.search(
          {
            dataSourceId: this.dataSourceId,
            params,
          },
          {}
        )
      );
      return response.rawResponse.hits.hits.map((hit) => hit._source);
    } catch (error) {
      throw error;
    }
  }

  private async getFields(
    index: string,
    dataSourceId?: string
  ): Promise<Array<{ name: string; type: string; esTypes: string[] }>> {
    return this.data.indexPatterns.getFieldsForWildcard({
      pattern: index,
      dataSourceId,
    });
  }

  /**
   * @param data
   * @param field
   */
  private calculateFieldDistribution(
    data: Array<Record<string, any>>,
    field: string
  ): Record<string, number> {
    const distribution = data.reduce<Record<string, number>>((acc, hit) => {
      const value = hit?.[field];

      if (value !== undefined && value !== null) {
        const strValue = String(value);
        acc[strValue] = (acc[strValue] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.fromEntries(
      Object.entries(distribution).map(([key, count]) => [key, count / data.length])
    );
  }

  /**
   * Group numerical keys and merge counts
   * @param selectionDist {key: count}
   * @param baselineDist {key: count}
   * @param numGroups The default number of groups to create is 5
   * @returns Objects containing the distribution of grouped selection groups and benchmark groups
   */
  private groupNumericKeys(
    selectionDist: Record<string, number>,
    baselineDist: Record<string, number>,
    numGroups: number = 5
  ): {
    groupedSelectionDist: Record<string, number>;
    groupedBaselineDist: Record<string, number>;
  } {
    // Merge all keys and convert them to numerical values
    const allKeys = Array.from(
      new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)])
    );

    if (allKeys.length > 10 && allKeys.every((key) => !isNaN(Number(key)))) {
      const numericKeys = allKeys.map((key) => Number(key));

      const min = Math.min(...numericKeys);
      const max = Math.max(...numericKeys);
      const range = max - min;
      const groupSize = range / numGroups;

      const groupedSelectionDist: Record<string, number> = {};
      const groupedBaselineDist: Record<string, number> = {};

      // Create groups and merge values
      for (let i = 0; i < numGroups; i++) {
        const lowerBound = min + i * groupSize;
        const upperBound = i === numGroups - 1 ? max : min + (i + 1) * groupSize;

        // Create group labels (e.g. "1-10")
        const groupLabel = `${lowerBound.toFixed(1)}-${upperBound.toFixed(1)}`;

        groupedSelectionDist[groupLabel] = 0;
        groupedBaselineDist[groupLabel] = 0;

        // Merge the counts of the original keys into the corresponding groups
        numericKeys.forEach((numKey) => {
          // The last group includes the upper boundary
          const belongs =
            i === numGroups - 1
              ? numKey >= lowerBound && numKey <= upperBound
              : numKey >= lowerBound && numKey < upperBound;

          if (belongs) {
            const strKey = String(numKey);
            if (strKey in selectionDist) {
              groupedSelectionDist[groupLabel] += selectionDist[strKey];
            }
            if (strKey in baselineDist) {
              groupedBaselineDist[groupLabel] += baselineDist[strKey];
            }
          }
        });
      }

      return {
        groupedSelectionDist,
        groupedBaselineDist,
      };
    }

    return {
      groupedSelectionDist: selectionDist,
      groupedBaselineDist: baselineDist,
    };
  }

  private calculateMaxDifference(
    selectionDist: Record<string, number>,
    baselineDist: Record<string, number>
  ): number {
    // Merge all unique fields
    const allKeys = new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)]);

    // Calculate Max distribution difference
    let maxDiff = -Infinity;
    allKeys.forEach((key) => {
      const diff = (selectionDist[key] || 0) - (baselineDist[key] || 0);
      maxDiff = Math.max(maxDiff, diff);
    });

    return maxDiff;
  }
}

const formatPPLQueryData = (queryObject: QueryObject) => {
  if (!queryObject.datarows || !queryObject.schema) {
    return [];
  }
  const data = [];
  let index = 0;
  let schemaIndex = 0;
  for (index = 0; index < queryObject.datarows.length; ++index) {
    const datarowValue: Record<string, unknown> = {};
    for (schemaIndex = 0; schemaIndex < queryObject.schema.length; ++schemaIndex) {
      const columnName = queryObject.schema[schemaIndex].name;
      if (typeof queryObject.datarows[index][schemaIndex] === 'object') {
        datarowValue[columnName] = queryObject.datarows[index][schemaIndex];
      } else if (typeof queryObject.datarows[index][schemaIndex] === 'boolean') {
        datarowValue[columnName] = queryObject.datarows[index][schemaIndex].toString();
      } else {
        datarowValue[columnName] = queryObject.datarows[index][schemaIndex];
      }
    }
    data.push(datarowValue);
  }
  return data.map((row) => getFlattenedObject(row));
};
