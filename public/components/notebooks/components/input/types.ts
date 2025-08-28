/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  AI_RESPONSE_TYPE,
  DEEP_RESEARCH_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import { TimeRange } from '../../../../../../../src/plugins/data/common';

export type InputType =
  | 'PPL'
  | 'SQL'
  | typeof DEEP_RESEARCH_PARAGRAPH_TYPE
  | 'MARKDOWN'
  | 'VISUALIZATION'
  | typeof AI_RESPONSE_TYPE;

export type QueryLanguage = 'PPL' | 'SQL';

export interface QueryState {
  value: string;
  query?: string;
  queryLanguage: QueryLanguage;
  isPromptEditorMode: boolean;
  timeRange: TimeRange;
  selectedIndex?: any;
  parameters?: {
    noDatePicker?: boolean;
  };
}

export type InputValueType<T extends InputType> = T extends 'PPL' | 'SQL' ? QueryState : string;

export interface InputTypeOption {
  key: string;
  icon: string;
  label: string;
  'data-test-subj': string;
  disabled?: boolean;
}
