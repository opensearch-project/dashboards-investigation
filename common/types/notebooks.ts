/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Filter } from '../../../../src/plugins/data/common';

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
  DISCOVER = 'Discover',
  CHAT = 'Chat',
  VISUALIZATION = 'VISUALIZATION',
}

export enum NotebookType {
  AGENTIC = 'Agentic',
  CLASSIC = 'Classic',
}

export interface InvestigationTimeRange {
  selectionFrom: number;
  selectionTo: number;
  baselineFrom?: number;
  baselineTo?: number;
}

export interface NotebookContext {
  dataSourceId?: string;
  timeField?: string;
  index?: string;
  currentTime?: number; // the time when PPL been executed when trigger from discovery
  timeRange?: InvestigationTimeRange;
  source?: NoteBookSource;
  filters?: Array<Record<string, any>>; // For phase 1, we only support DSL filter
  summary?: string;
  PPLFilters?: string[];
  variables?: {
    // used for source type: Discover
    pplQuery?: string;
    [key: string]: unknown;

    // used for source type: Discover visualization
    visualizationFilters?: Filter[];
  };
  memoryId?: string;
  indexInsight?: IndexInsightContent;
  notebookType?: NotebookType;
  initialGoal?: string;
  log?: Record<string, any>;
  symptom?: string;
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

export enum HypothesisStatus {
  RULED_OUT = 'RULED_OUT',
  RULED_IN = '',
}

export interface HypothesisItem {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  supportingFindingParagraphIds: string[];
  irrelevantFindingParagraphIds?: string[];
  userSelectedFindingParagraphIds?: string[];
  newAddedFindingIds?: string[];
  dateCreated: string;
  dateModified: string;
  status?: HypothesisStatus;
}

export interface AgenticMemory {
  executorMemoryId?: string;
  parentInteractionId?: string;
  memoryContainerId?: string;
  owner?: string;
}

export interface FailedInvestigationInfo {
  error: Error;
  memory?: AgenticMemory;
  timestamp: string;
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
  currentUser?: string;
  hypotheses?: HypothesisItem[];
  runningMemory?: AgenticMemory;
  historyMemory?: AgenticMemory;
  topologies: PERAgentTopology[];
  failedInvestigation?: FailedInvestigationInfo;
  feedbackSummary?: string[];
}

export interface SummaryDataItem {
  field: string;
  divergence: number;
  topChanges: Array<{
    value: string;
    baselinePercentage?: number;
    selectionPercentage: number;
  }>;
  excludeFromContext?: boolean;
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

export interface PERAgentHypothesisFinding {
  id: string;
  description: string;
  importance: number;
  evidence: string;
  type?: string;
}

export interface FindingParagraphParameters {
  finding?: Omit<PERAgentHypothesisFinding, 'id'> & { feedback?: 'CONFIRMED' | 'REJECTED' };
}

export interface PERAgentHypothesisItem {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  supporting_findings: string[];
}

export interface PERAgentTopologyNode {
  id: string;
  name: string;
  startTime: string;
  duration: string;
  status: 'success' | 'failed' | 'error';
  parentId: string | null;
}

export interface PERAgentTopology {
  id: string;
  description: string;
  traceId: string;
  nodes: PERAgentTopologyNode[];
  hypothesisIds: string[];
}

export interface PERAgentInvestigationResponse {
  findings: PERAgentHypothesisFinding[];
  hypotheses: PERAgentHypothesisItem[];
  topologies: PERAgentTopology[];
  investigationName?: string;
  feedbackSummary?: string;
}

export interface NotebookComponentProps {
  showPageHeader?: boolean;
}
