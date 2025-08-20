/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { firstValueFrom } from '@osd/std';
import { NoteBookServices } from 'public/types';
import { QueryEditorExtensionDependencies } from '../../../../../../../../../src/plugins/data/public';

export const getPromptModeIsAvailable = async (services: NoteBookServices): Promise<boolean> => {
  try {
    const extensions = services.data.query.queryString
      .getLanguageService()
      .getQueryEditorExtensionMap();

    // Check if query assist is available through data plugin extension system
    const queryAssistExtension = extensions['query-assist'];
    if (!queryAssistExtension) {
      return false;
    }

    return await firstValueFrom(
      queryAssistExtension.isEnabled$({} as QueryEditorExtensionDependencies)
    );
  } catch (error) {
    return false;
  }
};
