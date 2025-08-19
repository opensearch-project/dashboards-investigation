/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import { AI_RESPONSE_TYPE } from '../../../../../common/constants/notebooks';

export type InputType =
  | 'PPL'
  | 'SQL'
  | 'DEEP_RESEARCH_AGENT'
  | 'MARKDOWN'
  | 'VISUALIZATION'
  | typeof AI_RESPONSE_TYPE;

export type QueryLanguage = 'PPL' | 'SQL';

export interface QueryState {
  value: string;
  query?: string;
  queryLanguage: QueryLanguage;
  isPromptEditorMode: boolean;
  timeRange?: DurationRange;
  selectedIndex?: any;
}

export type InputValueType<T extends InputType> = T extends 'PPL' | 'SQL' ? QueryState : string;

export interface InputTypeOption {
  key: string;
  icon: string;
  label: string;
  'data-test-subj': string;
  disabled?: boolean;
}
