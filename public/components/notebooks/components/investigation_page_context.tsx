/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { investigationNotebookID } from '../../../../common/constants/shared';
import type { NoteBookServices } from '../../../types';

export interface InvestigationPageContextProps {
  usePageContext: Required<NoteBookServices>['contextProvider']['hooks']['usePageContext'];
  dataSourceId?: string;
}

export const InvestigationPageContext = ({
  usePageContext,
  dataSourceId,
}: InvestigationPageContextProps) => {
  usePageContext({
    description: 'Investigation notebooks application page context',
    convert: () => ({
      appId: investigationNotebookID,
      dataset: {
        dataSource: { id: dataSourceId },
      },
    }),
    categories: ['static', investigationNotebookID],
  });
  return null;
};
