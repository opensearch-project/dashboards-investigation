/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import { NotebookContext } from '../../../../../../common/types/notebooks';
import { parsePPLQuery } from '../../../../../../common/utils';
import { DataDistributionService } from '../../data_distribution/data_distribution_service';

export const useContextProcessor = (
  context: NotebookContext | undefined,
  inputParameters: string
) => {
  const [processedContext, setProcessedContext] = useState<Partial<NotebookContext>>();
  const dataService = useMemo(() => new DataDistributionService(), []);

  useEffect(() => {
    const processContext = async () => {
      if (!context) {
        return;
      }
      const parameters = JSON.parse(inputParameters);

      const timeField = parameters?.timeField || context.timeField;
      const index = parameters?.index || context.index;
      const pplQuery = context.variables?.pplQuery;
      const timeRange = [context.timeRange?.selectionFrom, context.timeRange?.selectionTo];

      // Process PPL query time conditions
      if (pplQuery && context.timeRange) {
        const conditions = parsePPLQuery(pplQuery).compareExprs;
        const isTimeFieldCondition = (field: string) =>
          field === timeField || field === `\`${timeField}\``;

        const timeConditions =
          conditions?.filter(
            (con) => isTimeFieldCondition(con.left) || isTimeFieldCondition(con.right)
          ) || [];

        for (const con of timeConditions) {
          const timeFieldOnLeft = isTimeFieldCondition(con.left);
          const timeValue = timeFieldOnLeft ? con.right : con.left;
          const pplToEval = `source=${index} | head 1 | eval timeValue = ${timeValue} | fields timeValue`;

          dataService.setConfig(context.dataSourceId, index || '', timeField || '');

          try {
            const data = await dataService.fetchPPlData(pplToEval);
            if (data && data.length > 0) {
              const time = moment.utc(data[0].timeValue).valueOf();

              if (timeFieldOnLeft) {
                if (con.op === '<' || con.op === '<=') {
                  timeRange[1] = timeRange[1] !== undefined ? Math.min(time, timeRange[1]) : time;
                } else {
                  timeRange[0] = timeRange[0] !== undefined ? Math.max(time, timeRange[0]) : time;
                }
              } else {
                if (con.op === '>' || con.op === '>=') {
                  timeRange[1] = timeRange[1] !== undefined ? Math.min(time, timeRange[1]) : time;
                } else {
                  timeRange[0] = timeRange[0] !== undefined ? Math.max(time, timeRange[0]) : time;
                }
              }
            }
          } catch (error) {
            console.warn('Failed to process PPL time condition:', error);
          }
        }
      }

      setProcessedContext({
        dataSourceId: context.dataSourceId,
        index,
        timeField,
        timeRange: context.timeRange
          ? {
              selectionFrom: timeRange[0]!,
              selectionTo: timeRange[1]!,
              baselineFrom: context.timeRange.baselineFrom,
              baselineTo: context.timeRange.baselineTo,
            }
          : undefined,
        indexInsight: parameters?.insight || context.indexInsight,
      });
    };

    processContext();
  }, [context, dataService, inputParameters]);

  return processedContext;
};
