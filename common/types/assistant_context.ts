/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssistantContextOptions } from '../../../../src/plugins/context_provider/public';
import { NotebookContext } from './notebooks';

export interface NoteBookAssistantContext extends AssistantContextOptions {
  value: {
    notebookId: string;
    hypothesisId?: string;
    topLevelContext?: NotebookContext;
    paragraphContext?: string;
    hypothesisContext?: string;
  };
}
