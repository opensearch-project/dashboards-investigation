/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectAttributes } from '../../../../src/core/public/saved_objects';

export interface IField extends SavedObjectAttributes {
  name: string;
  type: string;
  label?: string;
}

export interface SavedQuery extends SavedObjectAttributes {
  description: string;
  name: string;
  query: string;
  selected_date_range: { start: string; end: string; text: string };
  selected_fields: { text: string; tokens: IField[] };
  selected_timestamp: IField;
  dataSources: string; // list of type SelectedDataSources that is stringified
  queryLang: string;
}

export interface SavedVisualization extends SavedObjectAttributes {
  description: string;
  name: string;
  query: string;
  selected_date_range: { start: string; end: string; text: string };
  selected_fields: { text: string; tokens: [] };
  selected_timestamp: IField;
  type: string;
  subType?: 'metric' | 'visualization'; // exists if sub type is metric
  user_configs?: string;
  units_of_measure?: string;
  application_id?: string;
  dataSources: string; // list of type SelectedDataSources that is stringified
  queryLang: string;
  metricType?: string; // exists if sub type is metric
}
