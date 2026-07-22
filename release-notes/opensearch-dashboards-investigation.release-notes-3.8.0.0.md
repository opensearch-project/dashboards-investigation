## Version 3.8.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.8.0

### Features

* Add Notebooks navPopover to the icon side navigation with "Create notebook" and "View all notebooks" actions ([#390](https://github.com/opensearch-project/dashboards-investigation/pull/390))
* Disable create_investigation tool on the Search Relevance page to reduce irrelevant tool suggestions ([#388](https://github.com/opensearch-project/dashboards-investigation/pull/388))

### Enhancements

* Onboard code diff analyzer/reviewer and issue dedupe workflows ([#391](https://github.com/opensearch-project/dashboards-investigation/pull/391))
* Onboard new backport-pr reusable GitHub workflow replacing obsolete backport workflows ([#389](https://github.com/opensearch-project/dashboards-investigation/pull/389))

### Bug Fixes

* Downgrade codecov-action to v4 to fix intermittent GPG validation failures in CI ([#394](https://github.com/opensearch-project/dashboards-investigation/pull/394))

### Infrastructure

* Pin GitHub Actions to commit SHAs to prevent supply chain attacks ([#375](https://github.com/opensearch-project/dashboards-investigation/pull/375))
* Update GitHub actions to use official opensearch-project actions instead of personal forks ([#386](https://github.com/opensearch-project/dashboards-investigation/pull/386))
* Update opensearch-build workflow references from commit SHA to main branch ([#384](https://github.com/opensearch-project/dashboards-investigation/pull/384))
* Migrate ESLint configuration to ESLint 10 flat config format ([#398](https://github.com/opensearch-project/dashboards-investigation/pull/398))
* Migrate Jest test suite to Jest 30 and jsdom 26 ([#403](https://github.com/opensearch-project/dashboards-investigation/pull/403))

### Maintenance

* Clean up dependencies, remove Cypress, and fix CVE-2026-45736 by removing ws dependency ([#408](https://github.com/opensearch-project/dashboards-investigation/pull/408))
* Upgrade dompurify to comply with OSD version requirements ([#404](https://github.com/opensearch-project/dashboards-investigation/pull/404))

### Refactoring

* Refactor planner agent prompts to separate investigation-specific system prompts from common prompts and move dynamic fields to context ([#400](https://github.com/opensearch-project/dashboards-investigation/pull/400))
* Refactor plugin tests to instantiate InvestigationPlugin directly instead of re-implementing subscription logic ([#393](https://github.com/opensearch-project/dashboards-investigation/pull/393))
