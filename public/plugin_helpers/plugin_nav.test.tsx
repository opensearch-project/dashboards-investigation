/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { coreMock } from '../../../../src/core/public/mocks';
import { DEFAULT_APP_CATEGORIES, DEFAULT_NAV_GROUPS } from '../../../../src/core/public';
import { registerAllPluginNavGroups } from './plugin_nav';

describe('registerAllPluginNavGroups', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    coreSetup.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
  });

  it('should register investigation notebooks in observability nav group', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(false);

    registerAllPluginNavGroups(coreSetup as any);

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    const observabilityCalls = calls.filter(
      (call: any) => call[0] === DEFAULT_NAV_GROUPS.observability
    );
    const notebookCall = observabilityCalls.find((call: any) =>
      call[1].some((link: any) => link.id === 'investigation-notebooks')
    );
    expect(notebookCall).toBeDefined();
  });

  it('should register with visualizeAndReport category when icon side nav is OFF', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(false);

    registerAllPluginNavGroups(coreSetup as any);

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    const observabilityCalls = calls.filter(
      (call: any) => call[0] === DEFAULT_NAV_GROUPS.observability
    );
    const notebookCall = observabilityCalls.find((call: any) =>
      call[1].some(
        (link: any) =>
          link.id === 'investigation-notebooks' &&
          link.category === DEFAULT_APP_CATEGORIES.visualizeAndReport
      )
    );
    expect(notebookCall).toBeDefined();
  });

  it('should register with observabilityTools category and notebookApp icon when icon side nav is ON', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(true);

    registerAllPluginNavGroups(coreSetup as any);

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    const observabilityCalls = calls.filter(
      (call: any) => call[0] === DEFAULT_NAV_GROUPS.observability
    );
    const notebookCall = observabilityCalls.find((call: any) =>
      call[1].some(
        (link: any) =>
          link.id === 'investigation-notebooks' &&
          link.category === DEFAULT_APP_CATEGORIES.observabilityTools &&
          link.euiIconType === 'notebookApp'
      )
    );
    expect(notebookCall).toBeDefined();
  });

  it('should always register in security-analytics and all nav groups', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(true);

    registerAllPluginNavGroups(coreSetup as any);

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    const securityCall = calls.find(
      (call: any) =>
        call[0] === DEFAULT_NAV_GROUPS['security-analytics'] &&
        call[1].some((link: any) => link.id === 'investigation-notebooks')
    );
    expect(securityCall).toBeDefined();

    const allCall = calls.find(
      (call: any) =>
        call[0] === DEFAULT_NAV_GROUPS.all &&
        call[1].some((link: any) => link.id === 'investigation-notebooks')
    );
    expect(allCall).toBeDefined();
  });
});
