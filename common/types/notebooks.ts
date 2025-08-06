/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefObject } from 'react';

export interface NotebooksPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NotebooksPluginStart {}

export interface OptionsType {
  baseUrl: string;
  payload?: any;
  headers?: any;
  redirects?: number;
  beforeRedirect?: any;
  redirected?: any;
  timeout?: number; // default: unlimited
  maxBytes?: number; // default: unlimited
  rejectUnauthorized?: boolean;
  secureProtocol?: string; // The SSL method to use
  ciphers?: string; // The TLS ciphers to support
}

export interface ParaType {
  uniqueId: string;
  isRunning: boolean;
  inQueue: boolean;
  showAddPara: boolean;
  isVizualisation: boolean;
  isDeepResearch: boolean;
  isAnomalyVisualizationAnalysis: boolean;
  isLogPattern: boolean;
  vizObjectInput: string;
  id: number;
  inp: string;
  lang: string;
  editorLanguage: string;
  typeOut: string[];
  out: any[];
  isOutputStale: boolean;
  paraDivRef: RefObject<HTMLDivElement>;
  visStartTime?: string;
  visEndTime?: string;
  visSavedObjId?: string;
  dataSourceMDSId?: string;
  dataSourceMDSLabel?: string;
  viewMode?: 'input_only' | 'output_only' | 'view_both';
}

export enum NoteBookSource {
  ALERTING = 'alert',
}

export interface NotebookContext {
  dataSourceId?: string;
  timeField?: string;
  index?: string;
  timeRange?: {
    selectionFrom: number;
    selectionTo: number;
    baselineFrom: number;
    baselineTo: number;
  };
  source?: NoteBookSource;
  filters?: Array<Record<string, any>>; // For phase 1, we only support DSL filter
  summary?: string;
  PPLFilters?: string[];
  variables?: Record<string, unknown>;
  memoryId?: string;
  indexInsight?: IndexInsightContent;
}

export interface ParagraphBackendType<TOutputResult = string> {
  input: {
    inputText: string;
    inputType: string;
  };
  output?: [
    {
      execution_time: string;
      outputType: string;
      result: TOutputResult;
    }
  ]; // output only has some meta data like message_id / task_id
  id: string;
  dateModified: string;
  dateCreated: string;
  dataSourceMDSId?: string;
}

export interface NotebookBackendType {
  name: string;
  dateCreated: string;
  dateModified: string;
  paragraphs: ParagraphBackendType[];
  context?: NotebookContext;
  path: string;
  vizPrefix?: string;
}

export interface AnomalyVisualizationAnalysisOutputResult {
  fieldComparison: Array<Record<string, unknown>>;
}

export interface IndexInsightContent {
  is_log_index: boolean;
  log_message_field?: string;
  trace_id_field?: string;
}

export interface IndexInsight {
  index_name: string;
  content: string;
  status: string;
  task_type: string;
  last_updated_time: number;
}
export interface IndexInsights {
  index_insights: IndexInsight[];
}
