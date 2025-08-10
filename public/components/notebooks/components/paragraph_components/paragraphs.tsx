/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useRef } from 'react';
import { useContext } from 'react';
import { NoteBookServices } from 'public/types';
import { useObservable } from 'react-use';
import {
  DASHBOARDS_VISUALIZATION_TYPE,
  OBSERVABILITY_VISUALIZATION_TYPE,
} from '../../../../../common/constants/notebooks';
import { DeepResearchOutputResult, ParaType } from '../../../../../common/types/notebooks';
import { uiSettingsService } from '../../../../../common/utils';
import { dataSourceFilterFn } from '../../../../../common/utils/shared';
import { ParaOutput } from './para_output';
import { DataSourceSelectorProps } from '../../../../../../../src/plugins/data_source_management/public/components/data_source_selector/data_source_selector';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { PPLParagraph } from './ppl';
import { getInputType } from '../../../../../common/utils/paragraph';
import { MarkdownParagraph } from './markdown';
import { ParagraphState } from '../../../../../common/state/paragraph_state';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { getDataSourceManagementSetup } from '../../../../../public/services';
import { DeepResearchParagraph } from './deep_research';
import { VisualizationParagraph } from './visualization';

/*
 * "Paragraphs" component is used to render cells of the notebook open and "add para div" between paragraphs
 *
 * Props taken in as params are:
 * para - parsed paragraph from notebook
 * index - index of paragraph in the notebook
 * selectedViewId - selected view: view_both, input_only, output_only
 *
 * Cell component of nteract used as a container for paragraphs in notebook UI.
 * https://components.nteract.io/#cell
 */
export interface ParagraphProps {
  para: ParaType;
  index: number;
  selectedViewId: string;
  deletePara: (index: number) => void;
  handleSelectedDataSourceChange: (
    dataSourceMDSId: string | undefined,
    dataSourceMDSLabel: string | undefined
  ) => void;
  scrollToPara: (idx: number) => void;
}

export const Paragraphs = (props: ParagraphProps) => {
  const { para, index, handleSelectedDataSourceChange, scrollToPara, deletePara } = props;
  const {
    services: { notifications, dataSource, savedObjects: savedObjectsMDSClient },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { dataSourceManagement } = getDataSourceManagementSetup();
  const dataSourceEnabled = !!dataSource;

  const shouldSkipAgentIdResetRef = useRef(true);
  const context = useContext(NotebookReactContext);
  const paragraph = context.state.value.paragraphs[index];
  const paragraphValue = useObservable(paragraph.getValue$(), paragraph.value);

  // output is available if it's not cleared and vis paragraph has a selected visualization
  const isOutputAvailable =
    (para.out.length > 0 && para.out[0] !== '') ||
    para.isAnomalyVisualizationAnalysis ||
    para.isLogPattern;

  // do not show output if it is a visualization paragraph and visInput is not loaded yet
  const paraOutput = (para.isAnomalyVisualizationAnalysis || para.isLogPattern) && (
    <ParaOutput index={index} key={para.uniqueId} para={para} />
  );

  // do not show input and EuiPanel if view mode is output_only
  if (props.selectedViewId === 'output_only') {
    return <>{paraOutput}</>;
  }

  const paraClass = `notebooks-paragraph notebooks-paragraph-${
    uiSettingsService.get('theme:darkMode') ? 'dark' : 'light'
  }`;
  const DataSourceSelector: React.ComponentType<DataSourceSelectorProps> =
    dataSourceEnabled && dataSourceManagement
      ? (dataSourceManagement.ui.DataSourceSelector as React.ComponentType<DataSourceSelectorProps>)
      : () => <></>;
  const onSelectedDataSource = (e) => {
    const dataConnectionId = e[0] ? e[0].id : undefined;
    const dataConnectionLabel = e[0] ? e[0].label : undefined;
    if (dataConnectionId !== paragraphValue.dataSourceMDSId) {
      shouldSkipAgentIdResetRef.current = false;
    }
    shouldSkipAgentIdResetRef.current = false;
    handleSelectedDataSourceChange(dataConnectionId, dataConnectionLabel);
  };

  return (
    <EuiPanel
      className="notebookParagraphWrapper"
      hasShadow={false}
      paddingSize="none"
      hasBorder={false}
    >
      {<ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />}
      {(() => {
        const paragraphType = getInputType(paragraphValue);
        switch (paragraphType.toLowerCase()) {
          case 'ppl':
          case 'sql': {
            return (
              <div key={paragraph.value.id} className={paraClass}>
                <PPLParagraph paragraphState={paragraph as ParagraphState<string>} />
              </div>
            );
          }
          case 'md': {
            return (
              <div key={paragraph.value.id} className={paraClass}>
                <MarkdownParagraph paragraphState={paragraph as ParagraphState<string>} />
              </div>
            );
          }
          case 'DEEP_RESEARCH': {
            return (
              <div key={paragraph.value.id} className={paraClass}>
                <DeepResearchParagraph
                  paragraphState={
                    paragraph as ParagraphState<
                      DeepResearchOutputResult | { agent_id?: string } | string
                    >
                  }
                />
              </div>
            );
          }
          case DASHBOARDS_VISUALIZATION_TYPE:
          case OBSERVABILITY_VISUALIZATION_TYPE: {
            return (
              <div key={paragraph.value.id} className={paraClass}>
                <VisualizationParagraph paragraphState={paragraph as ParagraphState<string>} />
              </div>
            );
          }
          default: {
            return (
              <>
                {dataSourceEnabled &&
                  !para.isVizualisation &&
                  !para.isAnomalyVisualizationAnalysis &&
                  !para.isLogPattern && (
                    <EuiFlexGroup style={{ marginTop: 0 }}>
                      <EuiFlexItem>
                        <DataSourceSelector
                          savedObjectsClient={savedObjectsMDSClient.client}
                          notifications={notifications.toasts}
                          onSelectedDataSource={onSelectedDataSource}
                          disabled={false}
                          fullWidth={false}
                          removePrepend={false}
                          defaultOption={
                            paragraphValue.dataSourceMDSId !== undefined
                              ? [{ id: paragraphValue.dataSourceMDSId }]
                              : undefined
                          }
                          dataSourceFilter={dataSourceFilterFn}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                <div key={index} className={paraClass}>
                  {props.selectedViewId !== 'input_only' && isOutputAvailable && (
                    <div style={{ opacity: para.isOutputStale ? 0.5 : 1 }}>{paraOutput}</div>
                  )}
                </div>
              </>
            );
          }
        }
      })()}
    </EuiPanel>
  );
};
