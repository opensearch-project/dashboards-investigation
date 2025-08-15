/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { Subscription } from 'rxjs';

import { Embeddable, IContainer } from '../../../../../../../../src/plugins/embeddable/public';
import {
  ExpressionRenderError,
  ExpressionsStart,
  IExpressionLoaderParams,
} from '../../../../../../../../src/plugins/expressions/public';
import { TimeRange } from '../../../../../../../../src/plugins/data/public';
import { DataDistributionInput, DataDistributionOutput } from './types';
import { PersistedState } from '../../../../../../../../src/plugins/visualizations/public';
import { getExpressions } from '../../../../../services';

type ExpressionLoader = InstanceType<ExpressionsStart['ExpressionLoader']>;

export class DataDistributionEmbeddable extends Embeddable<
  DataDistributionInput,
  DataDistributionOutput
> {
  public readonly type = 'vega_visualization';
  private handler?: ExpressionLoader;
  private domNode?: HTMLDivElement;
  private abortController?: AbortController;
  private timeRange?: TimeRange;
  private subscriptions: Subscription[] = [];
  private uiState: PersistedState;
  private visInput?: DataDistributionInput['visInput'];

  constructor(
    // timeFilter: TimefilterContract,
    initialInput: DataDistributionInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: initialInput.title,
        editPath: '',
        editApp: '',
        editUrl: '',
        editable: false,
        visTypeName: 'Natural Language Query',
      },
      parent
    );
    // TODO: right now, there is nothing in ui state will trigger visualization to reload, so we set it to empty
    // In the future, we may need to add something to ui state to trigger visualization to reload
    this.uiState = new PersistedState();
    this.visInput = initialInput.visInput;

    this.subscriptions.push(
      this.getInput$().subscribe(() => {
        const dirty = this.dirtyCheck();
        if (dirty) {
          this.updateHandler();
        }
      })
    );

    // this.subscriptions.push(
    //   timeFilter.getAutoRefreshFetch$().subscribe(() => this.updateHandler())
    // );
  }

  /**
   * Build expression for the visualization, it only supports vega type visualization now
   */
  private buildPipeline = async () => {
    const jsonString = JSON.stringify(this.visInput?.spec).replace(/'/g, '\\u0027');
    return `vega spec='${jsonString}'`;
  };

  private dirtyCheck() {
    let dirty = false;

    // Check if timerange has changed
    if (!isEqual(this.input.timeRange, this.timeRange)) {
      this.timeRange = cloneDeep(this.input.timeRange);
      dirty = true;
    }
    return dirty;
  }

  private updateHandler = async () => {
    const expressionParams: IExpressionLoaderParams = {
      uiState: this.uiState,
    };
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const abortController = this.abortController;
    const expression = await this.buildPipeline();

    if (this.handler && !abortController.signal.aborted) {
      this.handler.update(expression, expressionParams);
    }
  };

  onContainerError = (error: ExpressionRenderError) => {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.renderComplete.dispatchError();
    this.updateOutput({ loading: false, error });
  };

  onContainerLoading = () => {
    this.renderComplete.dispatchInProgress();
    this.updateOutput({ loading: true, error: undefined });
  };

  onContainerRender = () => {
    this.renderComplete.dispatchComplete();
    this.updateOutput({ loading: false, error: undefined });
  };

  public getInspectorAdapters = () => {
    if (!this.handler) {
      return undefined;
    }
    return this.handler.inspect();
  };

  public async render(domNode: HTMLElement) {
    this.timeRange = cloneDeep(this.input.timeRange);

    const div = document.createElement('div');
    div.className = `visualize panel-content panel-content--fullWidth`;
    domNode.appendChild(div);
    domNode.classList.add('data-distribution-viz-canvas');

    this.domNode = div;
    super.render(this.domNode);

    const expressions = getExpressions();
    this.handler = new expressions.ExpressionLoader(this.domNode, undefined, {
      onRenderError: (element: HTMLElement, error: ExpressionRenderError) => {
        this.onContainerError(error);
      },
    });

    if (this.handler) {
      this.subscriptions.push(this.handler.loading$.subscribe(this.onContainerLoading));
      this.subscriptions.push(this.handler.render$.subscribe(this.onContainerRender));
    }

    this.updateHandler();
  }

  public reload = () => {
    this.updateHandler();
  };

  public destroy() {
    super.destroy();
    this.subscriptions.forEach((s) => s.unsubscribe());

    if (this.handler) {
      this.handler.destroy();
      this.handler.getElement().remove();
    }
  }
}
