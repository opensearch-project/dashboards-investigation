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
  isSelected: boolean;
  isInputHidden: boolean;
  isOutputHidden: boolean;
  showAddPara: boolean;
  isVizualisation: boolean;
  isDeepResearch: boolean;
  isAnomalyVisualizationAnalysis: boolean;
  vizObjectInput: string;
  id: number;
  inp: string;
  lang: string;
  editorLanguage: string;
  typeOut: string[];
  out: any[];
  isInputExpanded: boolean;
  isOutputStale: boolean;
  paraDivRef: RefObject<HTMLDivElement>;
  visStartTime?: string;
  visEndTime?: string;
  visSavedObjId?: string;
  dataSourceMDSId?: string;
  dataSourceMDSLabel?: string;
}

export enum NoteBookSource {
  ALERTING = 'alert',
}

export interface NotebookContext {
  dataSourceId?: string;
  timeField?: string;
  index?: string;
  timeRange?: {
    from: number;
    to: number;
  };
  source?: NoteBookSource;
  filters?: Array<Record<string, any>>; // For phase 1, we only support DSL filter
  summary?: string;
  specs?: Array<Record<string, unknown>>;
  updateSpecs?: (newSpecs: Array<Record<string, unknown>>) => void;
  PPLFilters?: string[];
}
