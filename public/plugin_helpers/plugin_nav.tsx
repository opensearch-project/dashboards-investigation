/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { investigationNotebookID } from '../../common/constants/shared';
import { CoreSetup } from '../../../../src/core/public';
import { AppPluginStartDependencies } from '../types';
import { DEFAULT_NAV_GROUPS, DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';

export function registerAllPluginNavGroups(core: CoreSetup<AppPluginStartDependencies>) {
  if (core.chrome.getIsIconSideNavEnabled()) {
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: investigationNotebookID,
        category: DEFAULT_APP_CATEGORIES.observabilityTools,
        order: 400,
        euiIconType: 'notebookApp',
      },
    ]);
  } else {
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: investigationNotebookID,
        category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
        order: 400,
      },
    ]);
  }
  core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS[`security-analytics`], [
    {
      id: investigationNotebookID,
      category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
      order: 400,
    },
  ]);
  core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
    {
      id: investigationNotebookID,
      category: DEFAULT_APP_CATEGORIES.visualizeAndReport,
      order: 400,
    },
  ]);
}
