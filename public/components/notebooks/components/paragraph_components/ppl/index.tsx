/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiCompressedFormRow,
  EuiCompressedTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingContent,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useObservable } from 'react-use';
import { useState } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
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

interface QueryObject {
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

const getQueryOutputData = (queryObject: QueryObject) => {
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

const inputPlaceholderString =
  'Type %sql or %ppl on the first line to define the input type. \nCode block starts here.';

export const PPLParagraph = ({ paragraphState }: { paragraphState: ParagraphState }) => {
  const {
    services: { http, notifications },
  } = useOpenSearchDashboards<NoteBookServices>();
  const paragraphValue = useObservable(paragraphState.getValue$(), paragraphState.value);
  const selectedDataSource = paragraphValue?.dataSourceMDSId;
  const onSelectedDataSource: DataSourceSelectorProps['onSelectedDataSource'] = (event) => {
    paragraphState.updateValue({
      dataSourceMDSId: event[0] ? event[0].id : undefined,
    });
  };
  const { runParagraph, saveParagraph } = useParagraphs();
  const [queryObject, setQueryObject] = useState<QueryObject>({});
  const errorMessage = useMemo(() => {
    if (queryObject && queryObject.error) {
      return queryObject.error.body.reason;
    }

    return '';
  }, [queryObject]);
  const previousRunQueryRef = useRef<string>('');
  const searchQuery = ParagraphState.getOutput(paragraphValue)?.result || '';

  const loadQueryResultsFromInput = useCallback(
    async (paragraph: ParagraphStateValue) => {
      const queryType = paragraph.input.inputText.substring(0, 4) === '%sql' ? '_sql' : '_ppl';
      paragraphState.updateUIState({
        isRunning: true,
      });
      previousRunQueryRef.current = searchQuery;
      await callOpenSearchCluster({
        http,
        dataSourceId: paragraph.dataSourceMDSId,
        request: {
          path: `/_plugins/${queryType}`,
          method: 'POST',
          body: JSON.stringify({
            query: searchQuery,
          }),
        },
      })
        .then((response) => {
          setQueryObject(response);
        })
        .catch((err) => {
          notifications.toasts.addDanger('Error getting query output');
          setQueryObject({
            error: {
              body: {
                reason: err.message,
              },
            },
          });
        })
        .finally(() => {
          paragraphState.updateUIState({
            isRunning: false,
          });
        });
    },
    [paragraphState, searchQuery, http, notifications.toasts]
  );

  useEffect(() => {
    if (paragraphValue.uiState?.isRunning) {
      return;
    }
    if (searchQuery && searchQuery !== previousRunQueryRef.current) {
      loadQueryResultsFromInput(paragraphValue);
    }
  }, [paragraphValue, loadQueryResultsFromInput, searchQuery]);

  const runParagraphHandler = async () => {
    await saveParagraph({
      paragraphStateValue: paragraphState.getBackgroundValue(),
    });
    await runParagraph({
      id: paragraphValue.id,
    });
  };

  const inputQuery = paragraphValue.input.inputText.substring(
    4,
    paragraphValue.input.inputText.length
  );

  const columns = useMemo(() => createQueryColumns(queryObject.schema || []), [queryObject.schema]);
  const data = useMemo(() => getQueryOutputData(queryObject), [queryObject]);
  const isRunning = paragraphValue.uiState?.isRunning;

  return (
    <>
      <EuiFlexGroup style={{ marginTop: 0 }}>
        <EuiFlexItem>
          <ParagraphDataSourceSelector
            disabled={!!isRunning}
            fullWidth={false}
            onSelectedDataSource={onSelectedDataSource}
            defaultOption={
              selectedDataSource !== undefined ? [{ id: selectedDataSource }] : undefined
            }
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
            {getInputType(paragraphState.getBackgroundValue()) === 'ppl' ? (
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
          {paragraphValue.uiState?.viewMode !== 'output_only' ? (
            <EuiCompressedTextArea
              data-test-subj={`editorArea-${paragraphValue.id}`}
              placeholder={inputPlaceholderString}
              id={`editorArea-${paragraphValue.id}`}
              className="editorArea"
              fullWidth
              disabled={!!isRunning}
              isInvalid={!!errorMessage}
              onChange={(evt) => {
                paragraphState.updateInput({
                  inputText: evt.target.value,
                });
                paragraphState.updateUIState({
                  isOutputStale: true,
                });
              }}
              onKeyPress={(evt) => {
                if (evt.key === 'Enter' && evt.shiftKey) {
                  runParagraphHandler();
                }
              }}
              value={paragraphValue.input.inputText}
              autoFocus
            />
          ) : (
            <EuiCodeBlock
              data-test-subj={`paraInputCodeBlock-${paragraphValue.id}`}
              language={paragraphValue.input.inputText.match(/^%(sql|md)/)?.[1]}
              overflowHeight={200}
              paddingSize="s"
            >
              {paragraphValue.input.inputText}
            </EuiCodeBlock>
          )}
        </div>
      </EuiCompressedFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            data-test-subj={`runRefreshBtn-${paragraphValue.id}`}
            onClick={() => {
              runParagraphHandler();
            }}
          >
            {ParagraphState.getOutput(paragraphValue)?.result !== '' ? 'Refresh' : 'Run'}
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
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
                rowCount={queryObject.datarows?.length || 0}
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
