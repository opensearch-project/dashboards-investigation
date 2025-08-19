/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTableFieldDataColumnType,
  EuiTitle,
} from '@elastic/eui';
import { LogPattern } from '../../../../../../common/types/log_pattern';
import { errorKeywords } from './sequence_item';

interface PatternDifferenceProps {
  patternMapDifference: LogPattern[];
}

export const PatternDifference: React.FC<PatternDifferenceProps> = ({ patternMapDifference }) => {
  // Function to sort and limit patternMapDifference to top 10 with lift and top 10 without lift
  const sortPatternMapDifference = (patterns: LogPattern[]) => {
    if (!patterns || patterns.length === 0) {
      return patterns;
    }

    // Separate patterns into those with lift and those without lift
    const patternsWithLift = patterns.filter(
      (pattern) =>
        pattern.lift !== null &&
        pattern.lift !== undefined &&
        !isNaN(pattern.lift) &&
        pattern.lift !== 0
    );

    const patternsWithoutLift = patterns.filter(
      (pattern) =>
        pattern.lift === null ||
        pattern.lift === undefined ||
        isNaN(pattern.lift) ||
        pattern.lift === 0
    );

    // Sort patterns with lift by lift (descending), then by selection
    const sortedWithLift = [...patternsWithLift].sort((a, b) => {
      const liftDiff = Math.abs(b.lift || 0) - Math.abs(a.lift || 0);
      if (liftDiff !== 0) {
        return liftDiff;
      }
      return Math.abs(b.selection || 0) - Math.abs(a.selection || 0);
    });

    // Sort patterns without lift by selection (descending)
    const sortedWithoutLift = [...patternsWithoutLift].sort((a, b) => {
      const selectionA = errorKeywords.test(a.pattern) ? 1 : a.selection || 0;
      const selectionB = errorKeywords.test(b.pattern) ? 1 : b.selection || 0;
      return selectionB - selectionA;
    });

    // Take top 10 from each group
    const top10WithLift = sortedWithLift.slice(0, 10);
    const top10WithoutLift = sortedWithoutLift.slice(0, 10);

    // Combine the results: top 10 with lift first, then top 10 without lift
    return [...top10WithoutLift, ...top10WithLift];
  };

  // Columns for pattern difference table
  const patternDiffColumns: Array<EuiTableFieldDataColumnType<LogPattern>> = [
    {
      field: 'pattern',
      name: 'Log pattern',
      render: (pattern: string) => (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="s" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ),
      width: '60%',
    },
    {
      field: 'selection',
      name: 'Selection',
      render: (count: number, record: LogPattern) => {
        const base = record.base || 0;
        const color = count > base ? 'danger' : 'success';
        const icon = count > base ? 'sortUp' : 'sortDown';
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={color}>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
    {
      field: 'base',
      name: 'Baseline',
      render: (count: number) => {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiBadge>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
    {
      field: 'lift',
      name: 'Lift',
      render: (count: number) => {
        // Show '-' if lift is empty, undefined, null, or NaN
        if (count === null || count === undefined || isNaN(count)) {
          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">-</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiBadge>{(Math.abs(count) * 100).toFixed(2)}%</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      width: '10%',
    },
  ];

  const renderSection = () => {
    if (!patternMapDifference || patternMapDifference.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h4>No pattern differences found</h4>}
          body={
            <p>No significant pattern differences found between baseline and selection periods.</p>
          }
        />
      );
    }

    return (
      <EuiBasicTable
        items={sortPatternMapDifference(patternMapDifference)}
        columns={patternDiffColumns}
        tableCaption="Pattern Differences"
        noItemsMessage="No significant pattern differences found between baseline and selection periods."
      />
    );
  };

  return (
    <EuiAccordion
      id="patternDifferences"
      buttonContent={
        <EuiTitle size="xs">
          <h4>
            <EuiIcon type="diff" />
            &nbsp;Pattern Differences ({patternMapDifference?.length || 0})
          </h4>
        </EuiTitle>
      }
      initialIsOpen={patternMapDifference && patternMapDifference.length > 0}
    >
      <EuiSpacer size="s" />
      {renderSection()}
    </EuiAccordion>
  );
};
