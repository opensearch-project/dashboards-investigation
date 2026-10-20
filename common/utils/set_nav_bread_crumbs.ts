/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiBreadcrumb } from '@elastic/eui';
import { ChromeStart } from '../../../../src/core/public';

export const setNavBreadCrumbs = (
  parentBreadCrumb: EuiBreadcrumb[],
  pageBreadCrumb: EuiBreadcrumb[],
  chrome: ChromeStart,
  counter?: number
) => {
  const isNavGroupEnabled = chrome.navGroup.getNavGroupEnabled();

  const updatedPageBreadCrumb = pageBreadCrumb.map((crumb) => ({
    ...crumb,
    text: isNavGroupEnabled && counter !== undefined ? `${crumb.text} (${counter})` : crumb.text,
  }));

  if (isNavGroupEnabled) {
    chrome.setBreadcrumbs([...updatedPageBreadCrumb]);
  } else {
    chrome.setBreadcrumbs([...parentBreadCrumb, ...updatedPageBreadCrumb]);
  }
};
