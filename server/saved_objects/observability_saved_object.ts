/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsType } from '../../../../src/core/server';
import { investigationNotebookID } from '../../common/constants/shared';
import { NOTEBOOK_SAVED_OBJECT } from '../../common/types/observability_saved_object_attributes';

export const notebookSavedObject: SavedObjectsType = {
  name: NOTEBOOK_SAVED_OBJECT,
  hidden: false,
  namespaceType: 'single',
  management: {
    defaultSearchField: 'title',
    importableAndExportable: true,
    icon: 'notebookApp',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      const editUrl = `/app/${investigationNotebookID}#/${obj.id}?view=view_both`;
      return {
        path: editUrl,
        uiCapabilitiesPath: 'observability.show',
      };
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      title: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      version: { type: 'integer' },
    },
  },
  migrations: {},
};
