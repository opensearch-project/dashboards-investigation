/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { setNavBreadCrumbs } from './set_nav_bread_crumbs';
import { EuiBreadcrumb } from '@elastic/eui';
import { ChromeStart } from '../../../../src/core/public';

describe('setNavBreadCrumbs', () => {
  let mockChrome: jest.Mocked<ChromeStart>;
  let parentBreadCrumb: EuiBreadcrumb[];
  let pageBreadCrumb: EuiBreadcrumb[];

  beforeEach(() => {
    parentBreadCrumb = [
      { text: 'Parent 1', href: '/parent1' },
      { text: 'Parent 2', href: '/parent2' },
    ];

    pageBreadCrumb = [
      { text: 'Page 1', href: '/page1' },
      { text: 'Page 2', href: '/page2' },
    ];

    mockChrome = {
      setBreadcrumbs: jest.fn(),
      navGroup: {
        getNavGroupEnabled: jest.fn() as jest.MockedFunction<() => boolean>,
      },
    } as any;
  });

  describe('when nav group is enabled', () => {
    beforeEach(() => {
      mockChrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    });

    it('should set breadcrumbs without parent breadcrumbs', () => {
      setNavBreadCrumbs(parentBreadCrumb, pageBreadCrumb, mockChrome);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Page 1', href: '/page1' },
        { text: 'Page 2', href: '/page2' },
      ]);
    });

    it('should append counter to breadcrumb text when counter is provided', () => {
      setNavBreadCrumbs(parentBreadCrumb, pageBreadCrumb, mockChrome, 5);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Page 1 (5)', href: '/page1' },
        { text: 'Page 2 (5)', href: '/page2' },
      ]);
    });

    it('should not append counter when counter is 0', () => {
      setNavBreadCrumbs(parentBreadCrumb, pageBreadCrumb, mockChrome, 0);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Page 1 (0)', href: '/page1' },
        { text: 'Page 2 (0)', href: '/page2' },
      ]);
    });

    it('should handle single page breadcrumb', () => {
      const singlePageBreadcrumb = [{ text: 'Single Page', href: '/single' }];

      setNavBreadCrumbs(parentBreadCrumb, singlePageBreadcrumb, mockChrome, 10);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Single Page (10)', href: '/single' },
      ]);
    });

    it('should handle empty page breadcrumbs', () => {
      setNavBreadCrumbs(parentBreadCrumb, [], mockChrome);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('when nav group is disabled', () => {
    beforeEach(() => {
      mockChrome.navGroup.getNavGroupEnabled.mockReturnValue(false);
    });

    it('should set breadcrumbs with parent breadcrumbs', () => {
      setNavBreadCrumbs(parentBreadCrumb, pageBreadCrumb, mockChrome);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Parent 1', href: '/parent1' },
        { text: 'Parent 2', href: '/parent2' },
        { text: 'Page 1', href: '/page1' },
        { text: 'Page 2', href: '/page2' },
      ]);
    });

    it('should not append counter even when provided', () => {
      setNavBreadCrumbs(parentBreadCrumb, pageBreadCrumb, mockChrome, 5);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Parent 1', href: '/parent1' },
        { text: 'Parent 2', href: '/parent2' },
        { text: 'Page 1', href: '/page1' },
        { text: 'Page 2', href: '/page2' },
      ]);
    });

    it('should handle empty parent breadcrumbs', () => {
      setNavBreadCrumbs([], pageBreadCrumb, mockChrome);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Page 1', href: '/page1' },
        { text: 'Page 2', href: '/page2' },
      ]);
    });

    it('should handle both empty parent and page breadcrumbs', () => {
      setNavBreadCrumbs([], [], mockChrome);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([]);
    });
  });

  describe('breadcrumb properties preservation', () => {
    it('should preserve all breadcrumb properties', () => {
      mockChrome.navGroup.getNavGroupEnabled.mockReturnValue(true);

      const breadcrumbWithProps: EuiBreadcrumb[] = [
        {
          text: 'Test Page',
          href: '/test',
          onClick: jest.fn(),
          truncate: true,
        },
      ];

      setNavBreadCrumbs(parentBreadCrumb, breadcrumbWithProps, mockChrome, 3);

      expect(mockChrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Test Page (3)',
          href: '/test',
          onClick: expect.any(Function),
          truncate: true,
        },
      ]);
    });
  });
});
