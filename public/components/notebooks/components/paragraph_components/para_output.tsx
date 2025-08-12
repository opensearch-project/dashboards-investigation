/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiText } from '@elastic/eui';
import { Media } from '@nteract/outputs';
import React from 'react';
import { useContext } from 'react';
import { Observable } from 'rxjs';
import { ParagraphStateValue } from 'common/state/paragraph_state';
import { LogPatternAnalysisResult } from 'common/types/log_pattern';
import {
  ANOMALY_VISUALIZATION_ANALYSIS_PARAGRAPH_TYPE,
  LOG_PATTERN_PARAGRAPH_TYPE,
} from '../../../../../common/constants/notebooks';
import {
  AnomalyVisualizationAnalysisOutputResult,
  ParaType,
} from '../../../../../common/types/notebooks';
import { BubbleUpContainer } from '../bubbleup/bubble_up_container';
import { LogPatternContainer } from '../log_analytics/log_pattern_container';
import { NotebookReactContext } from '../../context_provider/context_provider';

const OutputBody = ({ index, typeOut, val }: { index: number; typeOut: string; val: string }) => {
  /* Returns a component to render paragraph outputs using the para.typeOut property
   * Currently supports HTML, TABLE, IMG
   * TODO: add table rendering
   */
  const context = useContext(NotebookReactContext);

  const paragraph$: Observable<ParagraphStateValue<any>> = context.state.value.paragraphs[
    index
  ].getValue$();

  if (typeOut !== undefined) {
    switch (typeOut) {
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
}

export const ParaOutput = (props: ParaOutputProps) => {
  const { index, para } = props;

  return (
    <>
      {!para.isRunning && (
        <>
          {para.typeOut.map((typeOut: string, tIdx: number) => {
            return (
              <OutputBody
                index={index}
                key={para.uniqueId + '_paraOutputBody'}
                typeOut={typeOut}
                val={para.out[tIdx]}
              />
            );
          })}
        </>
      )}
    </>
  );
};
