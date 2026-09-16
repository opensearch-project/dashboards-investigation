## Version 3.9.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.9.0

### Bug Fixes

* Fix unbounded notebook bulk-delete to prevent event-loop exhaustion by capping input size and using Set-based filtering ([#415](https://github.com/opensearch-project/dashboards-investigation/pull/415))
* Remove manual sidecar padding hack from flyouts in favor of global overlay-offset CSS variables ([#401](https://github.com/opensearch-project/dashboards-investigation/pull/401))

### Maintenance

* Bump dompurify from 3.4.12 to 3.4.13 to address hook removal and DOM clobbering fixes ([#416](https://github.com/opensearch-project/dashboards-investigation/pull/416))
* Clean up outdated resolutions and dependencies, align with OpenSearch Dashboards 3.8, and address CVEs ([#412](https://github.com/opensearch-project/dashboards-investigation/pull/412))
