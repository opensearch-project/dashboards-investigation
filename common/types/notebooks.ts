/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

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

export enum NoteBookSource {
  ALERTING = 'Alert',
  DISCOVER = 'Discover',
}

export enum NotebookType {
  AGENTIC = 'Agentic',
  CLASSIC = 'Classic',
}

export interface NotebookContext {
  dataSourceId?: string;
  timeField?: string;
  index?: string;
  currentTime?: number; // the time when PPL been executed when trigger from discovery
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
  variables?: {
    // used for source type: Discover
    pplQuery?: string;
    // used for source type: Alert
    alert?: {
      start_time: string;
      last_notification_time: string;
      severity: string;
      monitor_id: string;
      alertNumber: number;
      trigger_name: string;
      monitor_name: string;
    };
    [key: string]: unknown;
  };
  memoryId?: string;
  indexInsight?: IndexInsightContent;
  notebookType?: NotebookType;
  initialGoal?: string;
}

export interface ParagraphBackendType<TOutputResult, TInputParameters = unknown> {
  input: {
    inputText: string;
    inputType: string;
    parameters?: TInputParameters;
  };
  output?: [
    {
      execution_time?: string;
      outputType: string;
      result: TOutputResult;
    }
  ]; // output only has some meta data like message_id / task_id
  id: string;
  dateModified: string;
  dateCreated: string;
  dataSourceMDSId?: string;
  aiGenerated?: boolean;
}

export interface HypothesisItem {
  title: string;
  description: string;
  likelihood: number;
  supportingFindingParagraphIds: string[];
  newAddedFindingIds?: string[];
}

export type ParagraphInputType<TParameters = unknown> = ParagraphBackendType<TParameters>['input'];

export interface NotebookBackendType {
  name: string;
  dateCreated: string;
  dateModified: string;
  paragraphs: Array<ParagraphBackendType<unknown>>;
  context?: NotebookContext;
  path: string;
  vizPrefix?: string;
  owner?: string;
  hypotheses?: HypothesisItem[];
}

export interface SummaryDataItem {
  field: string;
  divergence: number;
  topChanges: Array<{
    value: string;
    baselinePercentage?: number;
    selectionPercentage: number;
  }>;
}

export interface AnomalyVisualizationAnalysisOutputResult {
  fieldComparison: SummaryDataItem[];
}

export interface IndexInsightContent {
  index_name: string;
  time_field?: string;
  is_log_index: boolean;
  log_message_field?: string;
  trace_id_field?: string;
  related_indexes?: IndexInsightContent[];
}

export interface IndexInsightBody {
  index_name: string;
  content: string;
  status: string;
  task_type: string;
  last_updated_time: number;
}
export interface IndexInsight {
  index_insight: IndexInsightBody;
}

export interface DeepResearchOutputResult {
  taskId: string;
  memoryId?: string;
  // FIXME: Should be removed in the final release
  agent_id?: string;
}

export interface DeepResearchInputParameters {
  // FIXME: Should be removed in the final release
  PERAgentInput?: Record<string, unknown>;
  PERAgentContext?: string;
  prompts?: { systemPrompt?: string; executorSystemPrompt?: string };
  agentId?: string;
}

export interface PERAgentHypothesisFinding {
  id: string;
  description: string;
  importance: number;
  evidence: string;
}

export interface PERAgentHypothesisItem {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  supporting_findings: string[];
}

export interface PERAgentInvestigationResponse {
  findings: PERAgentHypothesisFinding[];
  hypothesis: PERAgentHypothesisItem;
  operation: 'CREATE' | 'REPLACE';
}
