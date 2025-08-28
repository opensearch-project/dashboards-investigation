/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { useEffectOnce } from 'react-use';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { useContext } from 'react';
import { NoteBookServices } from 'public/types';
import { ParagraphDataSourceSelector } from '../../data_source_selector';
import {
  ParagraphState,
  ParagraphStateValue,
} from '../../../../../../common/state/paragraph_state';
import { DataSourceSelectorProps } from '../../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';
import { dataSourceFilterFn } from '../../../../../../common/utils/shared';
import { useParagraphs } from '../../../../../hooks/use_paragraphs';
import {
  PPL_DOCUMENTATION_URL,
  SQL_DOCUMENTATION_URL,
} from '../../../../../../common/constants/shared';
import { QueryDataGridMemo } from '../para_query_grid';
import { getInputType } from '../../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { callOpenSearchCluster } from '../../../../../plugin_helpers/plugin_proxy_call';
import { MultiVariantInput } from '../../input/multi_variant_input';
import { parsePPLQuery } from '../../../../../../common/utils';
import { NotebookReactContext } from '../../../context_provider/context_provider';

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
}: {
  paragraphState: ParagraphState<string, unknown, QueryObject>;
}) => {
  const {
    services: { http, notifications, contextService },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const selectedDataSource = paragraphValue?.dataSourceMDSId;
  const onSelectedDataSource: DataSourceSelectorProps['onSelectedDataSource'] = (event) => {
    paragraphState.updateValue({
      dataSourceMDSId: event[0] ? event[0].id : undefined,
    });
  };
  const { runParagraph, saveParagraph } = useParagraphs();
  const queryObject = paragraphValue.fullfilledOutput;
  const errorMessage = useMemo(() => {
    if (queryObject?.error) {
      return queryObject.error.body.reason;
    }

    return '';
  }, [queryObject]);

  const context = useContext(NotebookReactContext);
  const notebookId = context.state.value.id;

  const loadQueryResultsFromInput = useCallback(
    async (paragraph: ParagraphStateValue) => {
      const queryType = paragraph.input.inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';

      const currentSearchQuery = ParagraphState.getOutput(paragraph)?.result || '';

      await callOpenSearchCluster({
        http,
        dataSourceId: paragraph.dataSourceMDSId,
        request: {
          path: `/_plugins/${queryType}`,
          method: 'POST',
          body: JSON.stringify({
            query: currentSearchQuery,
          }),
        },
      })
        .then((response) => {
          paragraphState.updateFullfilledOutput(response);
          return contextService.setParagraphContext({
            notebookId,
            paragraphId: paragraph.id,
            context: response,
          });
        })
        .catch((err) => {
          notifications.toasts.addDanger('Error getting query output');
          paragraphState.updateFullfilledOutput({
            error: {
              body: {
                reason: err.message,
              },
            },
          });
        });
    },
    [http, notifications.toasts, contextService, notebookId, paragraphState]
  );

  useEffectOnce(() => {
    const loadInitialContext = async () => {
      try {
        const data = await contextService.getParagraphContext(notebookId, paragraphValue.id);
        if (data) {
          paragraphState.updateFullfilledOutput(data.context as QueryObject);
          return;
        }
        await loadQueryResultsFromInput(paragraphValue);
      } catch (err) {
        notifications.toasts.addDanger('Fail to load paragraph context');
      }
    };

    loadInitialContext();
  });

  const runParagraphHandler = async () => {
    const inputText = paragraphState.getBackendValue().input.inputText;
    const queryType = inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';
    const inputQuery = inputText.substring(4);
    if (queryType === '_ppl' && inputQuery.trim()) {
      const pplWithAbsoluteTime = parsePPLQuery(inputQuery).pplWithAbsoluteTime;
      if (pplWithAbsoluteTime !== inputQuery) {
        paragraphState.updateInput({
          inputText: `%ppl${pplWithAbsoluteTime}`,
        });
      }
    }
    await saveParagraph({
      paragraphStateValue: paragraphState.getBackendValue(),
    });
    await runParagraph({
      id: paragraphValue.id,
    });

    await loadQueryResultsFromInput(paragraphState.value);
  };

  // FIXME: when properly store input language
  const inputQuery = paragraphValue.input.inputText.startsWith('%')
    ? paragraphValue.input.inputText.substring(5)
    : paragraphValue.input.inputText;

  const columns = useMemo(() => createQueryColumns(queryObject?.schema || []), [
    queryObject?.schema,
  ]);
  const data = useMemo(() => getQueryOutputData(queryObject ?? {}), [queryObject]);
  const isRunning = paragraphValue.uiState?.isRunning;

  return (
    <>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <EuiFlexItem>
          <ParagraphDataSourceSelector
            disabled={!!isRunning}
            fullWidth={false}
            onSelectedDataSource={onSelectedDataSource}
            selectedDataSourceId={selectedDataSource}
            dataSourceFilter={dataSourceFilterFn}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCompressedFormRow
        fullWidth={true}
        helpText={
          <EuiText size="s">
            Specify the input language on the first line using %[language type]. Supported languages
            include{' '}
            {
              <>
                <EuiLink href={SQL_DOCUMENTATION_URL} target="_blank">
                  SQL
                </EuiLink>{' '}
                <EuiLink href={PPL_DOCUMENTATION_URL} target="_blank">
                  PPL
                </EuiLink>{' '}
              </>
            }
            .
          </EuiText>
        }
        isInvalid={!!errorMessage}
        error={
          <EuiText size="s">
            {errorMessage}.{' '}
            {getInputType(paragraphState.getBackendValue()) === 'ppl' ? (
              <EuiLink href={PPL_DOCUMENTATION_URL} target="_blank">
                Learn More <EuiIcon type="popout" size="s" />
              </EuiLink>
            ) : (
              <EuiLink href={SQL_DOCUMENTATION_URL} target="_blank">
                <EuiIcon type="popout" size="s" />
              </EuiLink>
            )}
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
            onSubmit={({ inputText, inputType, parameters }) => {
              paragraphState.updateInput({
                inputText: inputType === 'SQL' ? `%sql\n${inputText}` : `%ppl\n${inputText}`,
                parameters,
              });
              paragraphState.updateUIState({
                isOutputStale: true,
              });
              runParagraphHandler();
            }}
          />
        </div>
      </EuiCompressedFormRow>
      {isRunning ? (
        <EuiLoadingContent />
      ) : (
        <>
          <EuiSpacer size="m" />
          {errorMessage && <EuiCodeBlock>{errorMessage}</EuiCodeBlock>}
          {columns.length && data.length ? (
            <div>
              <EuiText className="wrapAll" data-test-subj="queryOutputText">
                <b>{inputQuery}</b>
              </EuiText>
              <EuiSpacer />
              <QueryDataGridMemo
                rowCount={queryObject?.datarows?.length || 0}
                queryColumns={columns}
                dataValues={data}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
};
