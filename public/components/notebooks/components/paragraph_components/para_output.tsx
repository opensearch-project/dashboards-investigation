/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import MarkdownRender from '@nteract/markdown';
import { Media } from '@nteract/outputs';
import moment from 'moment';
import React from 'react';
import { useContext } from 'react';
import { Observable } from 'rxjs';
import { ParagraphStateValue } from 'common/state/paragraph_state';
import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import { NoteBookServices } from 'public/types';
import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import { DashboardContainerInput } from '../../../../../../../src/plugins/dashboard/public';
import {
  AnomalyVisualizationAnalysisOutputResult,
  ParaType,
} from '../../../../../common/types/notebooks';
import { uiSettingsService } from '../../../../../common/utils';
import { QueryDataGridMemo } from './para_query_grid';
import { BubbleUpContainer } from '../bubbleup/bubble_up_container';
import { LogPatternContainer } from '../log_analytics/log_pattern_container';
import { DashboardPanelState } from '../../../../../../../src/plugins/dashboard/public/application';
import { EmbeddableInput } from '../../../../../../../src/plugins/embeddable/public';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';

const createQueryColumns = (jsonColumns: any[]) => {
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

const getQueryOutputData = (queryObject: any) => {
  const data = [];
  let index = 0;
  let schemaIndex = 0;
  for (index = 0; index < queryObject.datarows.length; ++index) {
    const datarowValue = {};
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

const OutputBody = ({
  index,
  typeOut,
  val,
  para,
  visInput,
  setVisInput,
}: {
  index: number;
  typeOut: string;
  val: string;
  para: ParaType;
  visInput: DashboardContainerInput;
  setVisInput: (input: DashboardContainerInput) => void;
}) => {
  /* Returns a component to render paragraph outputs using the para.typeOut property
   * Currently supports HTML, TABLE, IMG
   * TODO: add table rendering
   */
  const context = useContext(NotebookReactContext);
  const {
    services: {
      dashboard: { DashboardContainerByValueRenderer },
    },
  } = useOpenSearchDashboards<NoteBookServices>();

  const paragraph$: Observable<ParagraphStateValue<any>> = context.state.value.paragraphs[
    index
  ].getValue$();

  const dateFormat = uiSettingsService.get('dateFormat');

  if (typeOut !== undefined) {
    switch (typeOut) {
      case 'QUERY':
        const inputQuery = para.inp.substring(4, para.inp.length);
        const queryObject = JSON.parse(val);
        if (queryObject.hasOwnProperty('error')) {
          return <EuiCodeBlock>{val}</EuiCodeBlock>;
        } else {
          const columns = createQueryColumns(queryObject.schema);
          const data = getQueryOutputData(queryObject);
          return (
            <div>
              <EuiText key={'query-input-key'} className="wrapAll" data-test-subj="queryOutputText">
                <b>{inputQuery}</b>
              </EuiText>
              <EuiSpacer />
              <QueryDataGridMemo
                rowCount={queryObject.datarows.length}
                queryColumns={columns}
                dataValues={data}
              />
            </div>
          );
        }
      case 'MARKDOWN':
        return (
          <EuiText
            className="wrapAll markdown-output-text"
            data-test-subj="markdownOutputText"
            size="s"
          >
            <MarkdownRender source={val} />
          </EuiText>
        );
      case 'VISUALIZATION':
      case 'OBSERVABILITY_VISUALIZATION':
        let from = moment(visInput?.timeRange?.from).format(dateFormat);
        let to = moment(visInput?.timeRange?.to).format(dateFormat);
        from = from === 'Invalid date' ? visInput.timeRange.from : from;
        to = to === 'Invalid date' ? visInput.timeRange.to : to;

        const panels = Object.entries(visInput?.panels || {}).reduce(
          (
            acc,
            [panelKey, panel]: [
              string,
              DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>
            ]
          ) => {
            const savedObjectId: string = panel.explicitInput.savedObjectId as string;
            if (savedObjectId.includes('observability-visualization:')) {
              return {
                ...acc,
                [panelKey]: {
                  ...panel,
                  type: 'observability-visualization',
                  explicitInput: {
                    ...panel.explicitInput,
                    savedObjectId: savedObjectId.replace('observability-visualization:', ''),
                  },
                },
              };
            }

            return {
              ...acc,
              [panelKey]: panel,
            };
          },
          {} as DashboardContainerInput['panels']
        );

        return (
          <>
            <EuiText size="s" style={{ marginLeft: 9 }}>
              {`${from} - ${to}`}
            </EuiText>
            <DashboardContainerByValueRenderer
              input={{
                ...visInput,
                panels,
              }}
              onInputUpdated={setVisInput}
            />
          </>
        );
      case 'HTML':
        return (
          <EuiText>
            {/* eslint-disable-next-line react/jsx-pascal-case */}
            <Media.HTML data={val} />
          </EuiText>
        );
      case 'TABLE':
        return <pre>{val}</pre>;
      case 'IMG':
        return <img alt="" src={'data:image/gif;base64,' + val} />;
      case ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE:
        return (
          <BubbleUpContainer
            paragraph$={
              paragraph$ as Observable<
                ParagraphStateValue<AnomalyVisualizationAnalysisOutputResult>
              >
            }
          />
        );
      case LOG_PATTERN_PARAGRAPH_TYPE:
        return (
          <LogPatternContainer
            para={para}
            paragraph$={paragraph$ as Observable<ParagraphStateValue<LogPatternAnalysisResult>>}
          />
        );
      default:
        return <pre>{val}</pre>;
    }
  } else {
    console.log('output not supported', typeOut);
    return <pre />;
  }
};

/*
 * "ParaOutput" component is used by notebook to populate paragraph outputs for an open notebook.
 *
 * Props taken in as params are:
 * para - parsed paragraph from notebook
 *
 * Outputs component of nteract used as a container for notebook UI.
 * https://components.nteract.io/#outputs
 */
export interface ParaOutputProps {
  index: number;
  para: ParaType;
  visInput: DashboardContainerInput;
  setVisInput: (input: DashboardContainerInput) => void;
}

export const ParaOutput = (props: ParaOutputProps) => {
  const { index, para, visInput, setVisInput } = props;

  return (
    !para.isRunning && (
      <>
        {para.typeOut.map((typeOut: string, tIdx: number) => {
          return (
            <OutputBody
              index={index}
              key={para.uniqueId + '_paraOutputBody'}
              typeOut={typeOut}
              val={para.out[tIdx]}
              para={para}
              visInput={visInput}
              setVisInput={setVisInput}
            />
          );
        })}
      </>
    )
  );
};
