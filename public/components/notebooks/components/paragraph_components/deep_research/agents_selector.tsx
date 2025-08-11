/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiSelect } from '@elastic/eui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import _ from 'lodash';

import type { NoteBookServices } from 'public/types';
import { searchMLCommonsAgents } from '../../../../../utils/ml_commons_apis';
import { CoreStart } from '../../../../../../../../src/core/public';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';

// Create a debounced request function that's memoized by data source ID
const fetchPERAgents = _.memoize(
  (dataSourceMDSId, http: CoreStart['http']) => {
    // Return a promise that will be resolved with the HTTP response
    return new Promise((resolve, reject) => {
      // Schedule the actual HTTP request with debounce
      const makeRequest = _.debounce(
        () => {
          searchMLCommonsAgents({
            http,
            dataSourceId: dataSourceMDSId,
            types: ['plan_execute_and_reflect'],
          })
            .then(resolve)
            .catch(reject)
            .finally(() => {
              // Clear this entry from the memoize cache after request completes
              fetchPERAgents.cache.delete(dataSourceMDSId);
            });
        },
        50,
        { leading: false, trailing: true }
      );

      // Trigger the debounced request
      makeRequest();
    });
  },
  // Custom resolver function for memoization key
  (dataSourceMDSId) => dataSourceMDSId
);

export const AgentsSelector = ({
  dataSourceMDSId,
  value,
  onChange,
  disabled,
}: {
  dataSourceMDSId: string | undefined;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) => {
  const {
    services: { http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const [agents, setAgents] = useState([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let canceled = false;
    fetchPERAgents(dataSourceMDSId, http).then(({ hits }) => {
      if (!canceled) {
        const agentResults = hits.hits.map(({ _id, _source: { name } }) => ({ id: _id, name }));
        setAgents(agentResults);
        if (!valueRef.current) {
          const recommendAgent = agentResults.find(
            ({ name }) => name.includes('3.7') && name.includes('ppl')
          );
          onChangeRef.current(recommendAgent?.id ?? agentResults[0]?.id);
        }
      }
    });
    return () => {
      canceled = true;
    };
  }, [http, dataSourceMDSId]);

  const options = useMemo(() => agents.map(({ id, name }) => ({ text: name, value: id })), [
    agents,
  ]);

  return (
    <EuiSelect
      prepend="Agent"
      options={options}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      value={value}
      hasNoInitialSelection
      disabled={disabled}
    />
  );
};
