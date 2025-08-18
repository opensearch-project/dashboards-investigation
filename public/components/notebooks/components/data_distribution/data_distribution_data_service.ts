/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { firstValueFrom, getFlattenedObject } from '@osd/std';
import { NotebookContext, SummaryDataItem } from 'common/types/notebooks';
import moment from 'moment';
import {
  DataPublicPluginStart,
  ISearchStart,
  OPENSEARCH_FIELD_TYPES,
  OSD_FIELD_TYPES,
} from '../../../../../../../src/plugins/data/public';
import { getClient, getData, getSearch } from '../../../../services';
import { HttpSetup } from '../../../../../../../src/core/public';

const longTextFields = ['message', 'body'];
const DEFAULT_PPL_QUERY_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export class DataDistributionDataService {
  private readonly search: ISearchStart;
  private readonly data: DataPublicPluginStart;
  private baseCount: number;
  private selectCount: number;
  private logPatternField: string = '';
  private dataSourceId: string | undefined;
  private index: string = '';
  private selectionFrom: number = NaN;
  private selectionTo: number = NaN;
  private baselineFrom: number = NaN;
  private baselineTo: number = NaN;
  private timeField: string = '';
  private numberFields: string[] = [];
  private pplFilter: string[] = [];

  constructor() {
    this.data = getData();
    this.search = getSearch();
    this.baseCount = 1;
    this.selectCount = 1;
  }

  public setConfig(
    dataSourceId: string | undefined,
    index: string,
    selectionFrom: number,
    selectionTo: number,
    baselineFrom: number,
    baselineTo: number,
    timeField: string,
    pplFilter?: string[]
  ) {
    this.dataSourceId = dataSourceId;
    this.index = index;
    this.selectionFrom = selectionFrom;
    this.selectionTo = selectionTo;
    this.baselineFrom = baselineFrom;
    this.baselineTo = baselineTo;
    this.timeField = timeField;
    this.pplFilter = pplFilter || [];
  }

  public async fetchComparisonData(props: {
    selectionFilters?: NotebookContext['filters'];
    size?: number;
  }): Promise<{
    selection: Array<Record<string, any>>;
    baseline: Array<Record<string, any>>;
  }> {
    const { size = 1000, selectionFilters } = props;

    const [selectionData, baselineData] = await Promise.all([
      this.fetchIndexData(
        new Date(this.selectionFrom),
        new Date(this.selectionTo),
        size,
        selectionFilters
      ),
      this.fetchIndexData(new Date(this.baselineFrom), new Date(this.baselineTo), size),
    ]);

    this.baseCount = baselineData.length;
    this.selectCount = selectionData.length;

    return {
      selection: selectionData,
      baseline: baselineData,
    };
  }

  public async discoverFields(data: {
    selection: Array<Record<string, any>>;
    baseline: Array<Record<string, any>>;
  }): Promise<string[]> {
    const combineData = Object.values(data).flat();
    const fieldValueSets: Record<string, Set<any>> = {};
    const maxCardinality = Math.max(5, Math.floor(combineData.length / 4));
    const numberFields: string[] = [];

    const mappings = await this.getFields(this.index, this.dataSourceId);

    console.log('mappings', mappings);

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
    combineData.forEach((doc) => {
      normalizedFields.forEach((field) => {
        const value = getFlattenedObject(doc)?.[field];
        if (value !== null && value !== undefined) {
          fieldValueSets[field].add(JSON.stringify(value));
        }
      });
    });
    this.numberFields = numberFields;

    // const patternField = this.getLogPatternField(
    //   getFlattenedObject(data.selection[0] || data.baseline[0]),
    //   normalizedFields
    // );
    // console.log('patternField', patternField);

    const usefulFields = normalizedFields.filter((field) => {
      const cardinality = fieldValueSets[field]?.size || 0;
      if (/id$/i.test(field)) {
        return cardinality <= 30 && cardinality > 0;
      }
      if (numberFields.includes(field)) {
        return true;
      }
      // Retain log pattern field
      // if (patternField === field) {
      //   return true;
      // }
      return cardinality <= maxCardinality && cardinality > 0;
    });

    return usefulFields;
  }

  /**
   * @param comparisonData
   * @param fieldsToAnalyze
   */
  public async analyzeDifferences(
    comparisonData: {
      selection: Array<Record<string, any>>;
      baseline: Array<Record<string, any>>;
    },
    fieldsToAnalyze: string[]
  ): Promise<
    Array<{
      field: string;
      divergence: number;
      selectionDist: Record<string, number>;
      baselineDist: Record<string, number>;
    }>
  > {
    const results = [];
    for (const field of fieldsToAnalyze) {
      // Calculate the distribution of baseline and selection
      let selectionDist = this.calculateFieldDistribution(comparisonData.selection, field);
      let baselineDist = this.calculateFieldDistribution(comparisonData.baseline, field);
      let divergence;
      if (this.numberFields.includes(field)) {
        const { groupedSelectionDist, groupedBaselineDist } = this.groupNumericKeys(
          selectionDist,
          baselineDist
        );
        selectionDist = groupedSelectionDist;
        baselineDist = groupedBaselineDist;
        divergence = this.calculateMaxDifference(groupedSelectionDist, groupedBaselineDist);
      } else if (this.logPatternField === field) {
        const logPatternDist = await this.getLogPattern();
        selectionDist = logPatternDist.selectionLogPatternDist;
        baselineDist = logPatternDist.baselineLogPatternDist;
        divergence = this.calculateMaxDifference(selectionDist, baselineDist);
      } else {
        divergence = this.calculateMaxDifference(selectionDist, baselineDist);
      }

      results.push({
        field,
        divergence,
        selectionDist,
        baselineDist,
      });
    }

    // Sort in descending order by divergence
    return results.sort((a, b) => b.divergence - a.divergence);
  }

  public formatComparisonSummary(
    differences: Array<{
      field: string;
      divergence: number;
      selectionDist: Record<string, number>;
      baselineDist: Record<string, number>;
    }>,
    maxResults: number = 30
  ): SummaryDataItem[] {
    // Only take the first N significant differences
    const topDifferences = differences.filter((diff) => diff.divergence > 0).slice(0, maxResults);

    return topDifferences.map((diff) => {
      const { field, divergence, selectionDist, baselineDist } = diff;

      // Calculate the changes in all fields
      const allKeys = [...new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)])];

      const selectionTotal = this.selectCount;
      const baselineTotal = this.baseCount;

      const changes = allKeys.map((value) => {
        const selectionCount = selectionDist[value] || 0;
        const baselineCount = baselineDist[value] || 0;

        const selectionPercentage = selectionCount / selectionTotal;
        const baselinePercentage = baselineCount / baselineTotal;

        let changePercentage = 0;
        if (baselinePercentage > 0 && selectionPercentage > 0) {
          changePercentage =
            ((selectionPercentage - baselinePercentage) / baselinePercentage) * 100;
        } else {
          changePercentage = Infinity; // From zero to non-zero is infinite variation
        }

        return {
          value,
          selectionPercentage: Number(selectionPercentage.toFixed(2)),
          baselinePercentage: Number(baselinePercentage.toFixed(2)),
          changePercentage,
        };
      });

      // Sort by percentage change (absolute value)
      const sortedChanges = changes.sort((a, b) => {
        return b.baselinePercentage - a.baselinePercentage;
        // return Math.abs(b.changePercentage) - Math.abs(a.changePercentage)
      });

      // Take the top 30 largest changes
      const topChanges = sortedChanges.slice(0, 30);

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
      console.error('Error fetching index data:', error);
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
  public calculateFieldDistribution(data: any, field: string): Record<string, number> {
    const distribution: Record<string, number> = {};
    data.forEach((hit: any) => {
      // const value = this.getNestedValue(hit, field);
      const value = getFlattenedObject(hit)[field];

      if (value !== undefined && value !== null) {
        const strValue = String(value);
        distribution[strValue] = (distribution[strValue] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Group numerical keys and merge counts
   * @param selectionDist {key: count}
   * @param baselineDist {key: count}
   * @param numGroups The default number of groups to create is 5
   * @returns Objects containing the distribution of grouped selection groups and benchmark groups
   */
  public groupNumericKeys(
    selectionDist: Record<string, number>,
    baselineDist: Record<string, number>,
    numGroups: number = 5
  ): {
    groupedSelectionDist: Record<string, number>;
    groupedBaselineDist: Record<string, number>;
  } {
    // Merge all keys and convert them to numerical values
    const allKeys = new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)]);

    if (allKeys.size > 30 && Array.from(allKeys).every((key) => !isNaN(Number(key)))) {
      const numericKeys = Array.from(allKeys)
        .filter((key) => !isNaN(Number(key)))
        .map((key) => Number(key));

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

  public calculateMaxDifference(
    selectionDist: Record<string, number>,
    baselineDist: Record<string, number>
  ): number {
    // Merge all unique fields
    const allKeys = [...new Set([...Object.keys(selectionDist), ...Object.keys(baselineDist)])];
    const total1 = this.selectCount;
    const total2 = this.baseCount;

    // Transfer count to probability
    const selectionDistProb: Record<string, number> = {};
    const baselineDistProb: Record<string, number> = {};
    allKeys.forEach((key) => {
      selectionDistProb[key] = (selectionDist[key] || 0) / total1;
      baselineDistProb[key] = (baselineDist[key] || 0) / total2;
    });

    // Calculate JS Divergence
    let maxDifference = -Infinity;
    allKeys.forEach((key) => {
      const diff = selectionDistProb[key] - baselineDistProb[key];
      // let a;
      // if (baselineDistProb[key] === 0) {
      //   a = 0.01
      // } else {
      //   a = baselineDistProb[key]
      // }
      // console.log('selectionDistProb[key]', selectionDistProb[key])
      // console.log('baselineDistProb[key]', baselineDistProb[key])

      // const diff = (selectionDistProb[key] - baselineDistProb[key]) / a;

      maxDifference = maxDifference > diff ? maxDifference : diff;
    });

    return maxDifference;
  }

  private getLogPatternField(sampleData: Record<string, any>, discoverFields: string[]): string {
    const logPatternFields = discoverFields.filter((field) =>
      longTextFields.some((longTextField) => field.includes(longTextField))
    );
    if (logPatternFields.length > 0) {
      let longestField = '';
      let maxLength = 0;

      logPatternFields.forEach((field) => {
        if (sampleData?.[field]?.length > maxLength) {
          maxLength = sampleData?.[field].length;
          longestField = field;
        }
      });
      if (longestField) {
        this.logPatternField = longestField;
        console.log('longestField', longestField);
        return longestField;
      }
    }
    return '';
  }

  private async getLogPattern() {
    const selectionEndTime = moment.utc(this.selectionTo).format(DEFAULT_PPL_QUERY_DATE_FORMAT);
    const baselineEndTime = moment.utc(this.baselineTo).format(DEFAULT_PPL_QUERY_DATE_FORMAT);
    const baselineStartTime = moment.utc(this.baselineFrom).format(DEFAULT_PPL_QUERY_DATE_FORMAT);

    const basePPL = `source=${this.index}`;

    const suffixPPL =
      `patterns ${this.logPatternField} method=brain | ` +
      `where isnotnull(patterns_field) and patterns_field != '' | ` +
      `stats count() as count  by patterns_field | ` +
      `sort - count | head 5`;

    const basePPLWithFilters = this.pplFilter.reduce((acc, filter) => {
      return `${acc} | where ${filter}`;
    }, basePPL);

    const selectionPPL =
      `${basePPLWithFilters} | ` +
      `where ${this.timeField} >= TIMESTAMP('${baselineEndTime}') and ` +
      `${this.timeField} <= TIMESTAMP('${selectionEndTime}') | ` +
      `${suffixPPL}`;
    const baselinePPL =
      `${basePPL} | ` +
      `where ${this.timeField} >= TIMESTAMP('${baselineStartTime}') and ` +
      `${this.timeField} <= TIMESTAMP('${baselineEndTime}') | ` +
      `${suffixPPL}`;

    const selectionLogPattern = await searchQuery(
      getClient(),
      '_plugins/_ppl',
      'POST',
      this.dataSourceId,
      JSON.stringify({ query: selectionPPL })
    );

    const baselineLogPattern = await searchQuery(
      getClient(),
      '_plugins/_ppl',
      'POST',
      this.dataSourceId,
      JSON.stringify({ query: baselinePPL })
    );

    return {
      selectionLogPatternDist: this.convertToRecord(selectionLogPattern.body.datarows),
      baselineLogPatternDist: this.convertToRecord(baselineLogPattern.body.datarows),
    };
  }

  private convertToRecord(data: Array<[number, string]>): Record<string, number> {
    return data.reduce((result, [count, message]) => {
      result[message] = count;
      return result;
    }, {} as Record<string, number>);
  }
}

export async function searchQuery(
  httpClient: HttpSetup,
  path: string,
  method: string,
  dataSourceId: string | undefined,
  query: string
) {
  return await httpClient.post(`/api/console/proxy`, {
    query: {
      path,
      method,
      dataSourceId,
    },
    body: query,
    prependBasePath: true,
    asResponse: true,
    withLongNumeralsSupport: true,
  });
}
