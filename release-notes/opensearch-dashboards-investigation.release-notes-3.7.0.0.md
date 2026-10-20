## Version 3.7.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.7.0

### Features

* Support snapshot visualization in agentic notebook ([#369](https://github.com/opensearch-project/dashboards-investigation/pull/369))
* Support recoverable error handling for timeout and max retries failures ([#341](https://github.com/opensearch-project/dashboards-investigation/pull/341))
* Make default investigation initial goal configurable ([#361](https://github.com/opensearch-project/dashboards-investigation/pull/361))
* Add icon side nav branching for investigation notebooks in Observability workspace ([#368](https://github.com/opensearch-project/dashboards-investigation/pull/368))

### Enhancements

* Improve investigation creation UX and optimize LLM response message ([#365](https://github.com/opensearch-project/dashboards-investigation/pull/365))
* Restrict visualization summary to JPEG format with image size limitation ([#358](https://github.com/opensearch-project/dashboards-investigation/pull/358))

### Bug Fixes

* Fix typo in initial goal ([#362](https://github.com/opensearch-project/dashboards-investigation/pull/362))
* Resolve stale closure preventing investigation title update ([#359](https://github.com/opensearch-project/dashboards-investigation/pull/359))
* Migrate plugin to TypeScript 6.0.2 compatibility ([#367](https://github.com/opensearch-project/dashboards-investigation/pull/367))
* Skip log pattern paragraph for clusters below 2.19.0 ([#371](https://github.com/opensearch-project/dashboards-investigation/pull/371))
* Bump dompurify and eslint versions to resolve dependency conflicts with OpenSearch-Dashboards ([#377](https://github.com/opensearch-project/dashboards-investigation/pull/377))

### Infrastructure

* Add issues write permission to untriaged label workflow ([#373](https://github.com/opensearch-project/dashboards-investigation/pull/373))
* Pin actions/github-script to exact commit SHA for security hardening ([#374](https://github.com/opensearch-project/dashboards-investigation/pull/374))
* Fix stale backport cleanup GitHub Action by replacing with native implementation ([#346](https://github.com/opensearch-project/dashboards-investigation/pull/346))

### Maintenance

* Bump fast-uri from 3.1.0 to 3.1.2 to address security vulnerabilities ([#370](https://github.com/opensearch-project/dashboards-investigation/pull/370))
