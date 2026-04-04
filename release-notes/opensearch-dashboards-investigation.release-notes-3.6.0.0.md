## Version 3.6.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.6.0

### Features

* Add accept hypothesis feature ([#321](https://github.com/opensearch-project/dashboards-investigation/pull/321))
* Add duration tracking for investigations, steps, and sub-steps ([#320](https://github.com/opensearch-project/dashboards-investigation/pull/320))
* Add comprehensive telemetry metrics for investigation actions ([#342](https://github.com/opensearch-project/dashboards-investigation/pull/342))
* Add max length limit for visualization summary image size ([#326](https://github.com/opensearch-project/dashboards-investigation/pull/326))
* Allow log analysis to rerun during reinvestigation ([#322](https://github.com/opensearch-project/dashboards-investigation/pull/322))

### Enhancements

* Update investigation tool result style to align with chat ([#319](https://github.com/opensearch-project/dashboards-investigation/pull/319))
* Show absolute time in reinvestigation time picker and enlarge modal for full text display ([#318](https://github.com/opensearch-project/dashboards-investigation/pull/318))
* Update wording of investigation detail card and fix missing workspace in investigation URL ([#338](https://github.com/opensearch-project/dashboards-investigation/pull/338))
* Increase summary agent timeout to 60 seconds and enhance error handling ([#334](https://github.com/opensearch-project/dashboards-investigation/pull/334))
* Increase polling retry count for trace and step ([#327](https://github.com/opensearch-project/dashboards-investigation/pull/327))
* Improve error handling for invalid PPL queries and fix investigation steps style ([#335](https://github.com/opensearch-project/dashboards-investigation/pull/335))

### Bug Fixes

* Fix JSON escape issue in Vega Express where backslash-n was parsed as real line breaks ([#328](https://github.com/opensearch-project/dashboards-investigation/pull/328))
* Fix chat integration type conflict to ensure correct chat instance is used ([#329](https://github.com/opensearch-project/dashboards-investigation/pull/329))
* Fix hypothesis detail buttons placement ([#339](https://github.com/opensearch-project/dashboards-investigation/pull/339))
* Remove duplicate confirm/reject buttons on finding ([#325](https://github.com/opensearch-project/dashboards-investigation/pull/325))
* Fix wrong datasource ID being passed from chat ([#337](https://github.com/opensearch-project/dashboards-investigation/pull/337))
* Use html2canvas-pro with CSP nonce to fix content security policy violation ([#313](https://github.com/opensearch-project/dashboards-investigation/pull/313))
* Redirect when opening a notebook with incorrect type in URL ([#306](https://github.com/opensearch-project/dashboards-investigation/pull/306))

### Maintenance

* Bump ajv from 8.12.0 to 8.18.0 ([#317](https://github.com/opensearch-project/dashboards-investigation/pull/317))
* Bump dompurify from 3.3.1 to 3.3.2 ([#333](https://github.com/opensearch-project/dashboards-investigation/pull/333))
* Resolve CVE-2026-26996 and CVE-2025-64718 ([#343](https://github.com/opensearch-project/dashboards-investigation/pull/343))
* Update lodash to 4.18.1 to address CVE-2026-4800 ([#348](https://github.com/opensearch-project/dashboards-investigation/pull/348))
* Force flatted to 3.4.2 to resolve CVE-2026-33228 ([#340](https://github.com/opensearch-project/dashboards-investigation/pull/340))
