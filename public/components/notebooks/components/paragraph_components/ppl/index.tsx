/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useContext } from 'react';
import {
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiFlexGroup,
  EuiIconTip,
  EuiLink,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useObservable, useEffectOnce } from 'react-use';
import { NoteBookServices } from 'public/types';
import { ParagraphState } from '../../../../../../common/state/paragraph_state';
import {
  PPL_DOCUMENTATION_URL,
  SQL_DOCUMENTATION_URL,
} from '../../../../../../common/constants/shared';
import { QueryDataGridMemo } from '../para_query_grid';
import { getInputType } from '../../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { MultiVariantInput } from '../../input/multi_variant_input';
import { NotebookReactContext } from '../../../context_provider/context_provider';
import { addTimeRangeFilter } from '../../../../../utils/time';
import { NotebookType } from '../../../../../../common/types/notebooks';

export interface QueryObject {
  schema?: any[];
  datarows?: any[];
  error?: { body: { reason: string } };
}

const createQueryColumns = (jsonColumns: QueryObject['schema']) => {
  if (!jsonColumns) {
    return [];
  }
  let index = 0;
  const datagridColumns = [];
  for (index = 0; index < jsonColumns.length; ++index) {
    const datagridColumnObject = {
      id: jsonColumns[index].name,
      displayAsText: jsonColumns[index].name,
    };
    datagridColumns.push(datagridColumnObject);
  }
  return datagridColumns;
};

export const getQueryOutputData = (queryObject: QueryObject) => {
  if (!queryObject.datarows || !queryObject.schema) {
    return [];
  }
  const data = [];
  let index = 0;
  let schemaIndex = 0;
  for (index = 0; index < queryObject.datarows.length; ++index) {
    const datarowValue: Record<string, unknown> = {};
    for (schemaIndex = 0; schemaIndex < queryObject.schema.length; ++schemaIndex) {
      const columnName = queryObject.schema[schemaIndex].name;
      if (typeof queryObject.datarows[index][schemaIndex] === 'object') {
        datarowValue[columnName] = JSON.stringify(queryObject.datarows[index][schemaIndex]);
      } else if (typeof queryObject.datarows[index][schemaIndex] === 'boolean') {
        datarowValue[columnName] = queryObject.datarows[index][schemaIndex].toString();
      } else {
        datarowValue[columnName] = queryObject.datarows[index][schemaIndex];
      }
    }
    data.push(datarowValue);
  }
  return data;
};

export const PPLParagraph = ({
  paragraphState,
  actionDisabled,
}: {
  paragraphState: ParagraphState<string, unknown, QueryObject>;
  actionDisabled: boolean;
}) => {
  const {
    services: { paragraphService },
  } = useOpenSearchDashboards<NoteBookServices>();

  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const queryObject = paragraphValue.fullfilledOutput;
  const error = queryObject?.error;

  const context = useContext(NotebookReactContext);
  const { saveParagraph, runParagraph } = context.paragraphHooks;
  const { notebookType, dataSourceId: notebookDataSourceId } = useObservable(
    context.state.value.context.getValue$(),
    context.state.value.context.value
  );

  const isAgenticNotebook = notebookType === NotebookType.AGENTIC;

  const paragraphRegistry = paragraphService.getParagraphRegistry(getInputType(paragraphValue));

  useEffectOnce(() => {
    paragraphRegistry?.runParagraph({
      paragraphState,
      saveParagraph,
      notebookStateValue: context.state.value,
    });
  });

  const inputQuery = useMemo(
    () =>
      paragraphValue.input.inputText.startsWith('%')
        ? paragraphValue.input.inputText.substring(5)
        : paragraphValue.input.inputText,
    [paragraphValue.input.inputText]
  );

  const inputQueryWithTimeFilter = useMemo(() => {
    const params = paragraphValue.input.parameters as any;
    return paragraphValue.input.inputText.startsWith('%sql')
      ? inputQuery
      : params?.query || addTimeRangeFilter(inputQuery, params);
  }, [inputQuery, paragraphValue.input.parameters, paragraphValue.input.inputText]);

  const columns = useMemo(() => createQueryColumns(queryObject?.schema || []), [
    queryObject?.schema,
  ]);
  const data = useMemo(() => getQueryOutputData(queryObject ?? {}), [queryObject]);
  const isRunning = paragraphValue.uiState?.isRunning;

  const paragarphDataSource = paragraphValue?.dataSourceMDSId;

  if (!paragraphRegistry) {
    return null;
  }

  return (
    <>
      <EuiCompressedFormRow
        fullWidth={true}
        helpText={<EuiSpacer size="s" />}
        isInvalid={!!error}
        error={
          <EuiText size="s">
            {error}.{' '}
            <EuiLink
              href={
                getInputType(paragraphState.getBackendValue()) === 'ppl'
                  ? PPL_DOCUMENTATION_URL
                  : SQL_DOCUMENTATION_URL
              }
              target="_blank"
            >
              Learn More
            </EuiLink>
          </EuiText>
        }
      >
        <div style={{ width: '100%' }}>
          <MultiVariantInput
            input={{
              inputText: inputQuery,
              inputType: getInputType(paragraphValue).toUpperCase(),
              parameters: paragraphValue.input.parameters,
            }}
            onSubmit={({ inputText, inputType, parameters }, dataSourceMDSId) => {
              if (dataSourceMDSId) {
                paragraphState.updateValue({
                  dataSourceMDSId,
                });
              }
              paragraphState.updateInput({
                inputText: inputType === 'SQL' ? `%sql\n${inputText}` : `%ppl\n${inputText}`,
                parameters,
              });
              paragraphState.updateUIState({
                isOutputStale: true,
              });
              paragraphState.resetFullfilledOutput();
              runParagraph({
                id: paragraphValue.id,
              });
            }}
            actionDisabled={actionDisabled}
            dataSourceId={isAgenticNotebook ? notebookDataSourceId : paragarphDataSource}
          />
        </div>
      </EuiCompressedFormRow>
      {isRunning ? (
        <EuiLoadingContent />
      ) : (
        <>
          {columns.length && data.length ? (
            <div>
              <EuiText
                style={{ verticalAlign: 'middle' }}
                size="s"
                className="wrapAll"
                data-test-subj="queryOutputText"
              >
                <b>{inputQueryWithTimeFilter}</b>
              </EuiText>
              {isAgenticNotebook && (
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
                  <EuiIconTip content="A maximum of 100 random results are displayed" />
                </EuiFlexGroup>
              )}
              <EuiSpacer size="xs" />
              <QueryDataGridMemo
                rowCount={queryObject?.datarows?.length || 0}
                queryColumns={columns}
                dataValues={data}
              />
            </div>
          ) : (
            <EuiCodeBlock>{error || 'No result'}</EuiCodeBlock>
          )}
        </>
      )}
    </>
  );
};
