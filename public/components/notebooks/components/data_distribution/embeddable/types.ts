/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DashboardContainerInput } from '../../../../../../../../src/plugins/dashboard/public/application/embeddable/dashboard_container';
import {
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '../../../../../../../../src/plugins/embeddable/public';

interface VisInput {
  spec: Record<string, any>;
  uiState?: string;
}

export interface DataDistributionInput extends SavedObjectEmbeddableInput {
  visInput?: VisInput;
}

export interface DataDistributionOutput extends EmbeddableOutput {
  editPath: string;
  editApp: string;
  editUrl: string;
  visTypeName: string;
}

export interface MemoItemProps {
  uniqueKey: string;
  uniqueId: string;
  chartIndex: number;
  isSelected: boolean;
  spec: DashboardContainerInput;
}
