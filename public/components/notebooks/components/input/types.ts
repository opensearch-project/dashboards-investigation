/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeRange } from '../../../../../../../src/plugins/data/common';

export type InputType = 'PPL' | 'SQL' | 'MARKDOWN' | 'VISUALIZATION';

export type QueryLanguage = 'PPL' | 'SQL';

export interface QueryIndexState {
  title: string;
  fields: any[];
  timeField?: string;
}

export interface QueryState {
  value: string;
  query?: string;
  queryLanguage: QueryLanguage;
  isPromptEditorMode: boolean;
  timeRange: TimeRange;
  selectedIndex: QueryIndexState;
  noDatePicker: boolean;
}

export type InputValueType<T extends InputType> = T extends 'PPL' | 'SQL' ? QueryState : string;

export interface InputTypeOption {
  key: string;
  icon: string;
  label: string;
  'data-test-subj': string;
  disabled?: boolean;
}
