/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { NavPopoverConfig } from '../../../../src/core/public';
import { investigationNotebookID } from '../../common/constants/shared';

/**
 * Nav-item popover for the Investigation Notebooks icon-side-nav item: quick
 * actions to create a new notebook (the app auto-opens the create flow on
 * `#/create`) or view the full notebooks list (`#/`). The item still navigates
 * to Notebooks on direct click.
 */
export const notebooksNavPopover: NavPopoverConfig = {
  actions: [
    {
      id: 'createNotebook',
      label: i18n.translate('investigation.navPopover.createNotebook', {
        defaultMessage: 'Create notebook',
      }),
      iconType: 'plusInCircle',
      onClick: ({ navigateToApp }) => navigateToApp(investigationNotebookID, { path: '#/create' }),
    },
    {
      id: 'viewAllNotebooks',
      label: i18n.translate('investigation.navPopover.viewAllNotebooks', {
        defaultMessage: 'View all notebooks',
      }),
      iconType: 'list',
      onClick: ({ navigateToApp }) => navigateToApp(investigationNotebookID, { path: '#/' }),
    },
  ],
};
