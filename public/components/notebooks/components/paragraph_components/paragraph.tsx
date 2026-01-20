/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useState } from 'react';
import { useObservable } from 'react-use';
import { useParams } from 'react-router-dom';
import { uiSettingsService } from '../../../../../common/utils';
import { ParagraphActionPanel } from './paragraph_actions_panel';
import { FindingHeader } from './finding_header';
import { FindingFooter } from './finding_footer';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { getInputType } from '../../../../../common/utils/paragraph';
import { useOpenSearchDashboards } from '../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { NoteBookServices } from '../../../../types';
import {
  NotebookType,
  FindingParagraphParameters,
  ParagraphBackendType,
  HypothesisItem,
} from '../../../../../common/types/notebooks';
import { Topology } from '../topology';
import { ParagraphState } from '../../../../../common/state/paragraph_state';

export interface ParagraphProps {
  index: number;
  isParagraphReadonly?: boolean;
  deletePara?: (index: number) => void;
  scrollToPara?: (idx: number) => void;
}

export const Paragraph = (props: ParagraphProps) => {
  const { index, scrollToPara, deletePara } = props;

  const context = useContext(NotebookReactContext);
  const { saveParagraph } = context.paragraphHooks;
  const paragraph = context.state.value.paragraphs[index];
  const { hypotheses } = useObservable(context.state.getValue$(), context.state.value);
  const {
    services: { notifications, paragraphService, http },
  } = useOpenSearchDashboards<NoteBookServices>();
  const { id: notebookId } = useParams<{ id: string }>();
  const [isSaving, setIsSaving] = useState(false);

  const paragraphObservable = paragraph?.getValue$() ?? {
    subscribe: () => ({ unsubscribe: () => {} }),
  };
  const paragraphValue = useObservable(paragraphObservable, paragraph?.value);

  if (!paragraph || !paragraphValue) {
    return null;
  }

  const paraClass = `notebooks-paragraph notebooks-paragraph-${
    uiSettingsService.get('theme:darkMode') ? 'dark' : 'light'
  }`;
  const { ParagraphComponent } =
    paragraphService.getParagraphRegistry(getInputType(paragraphValue)) || {};

  const notebookType = context.state.getContext()?.notebookType;
  const isClassicNotebook = notebookType === NotebookType.CLASSIC;

  if (isClassicNotebook) {
    return (
      <div className="notebookParagraphWrapper">
        <ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />
        {ParagraphComponent && (
          <div key={paragraph.value.id} className={paraClass}>
            <ParagraphComponent paragraphState={paragraph} actionDisabled={false} />
          </div>
        )}
      </div>
    );
  }

  // Agentic notebook logic
  const isFindingParagraph = !!(paragraphValue.input.parameters as FindingParagraphParameters)
    ?.finding;
  const isAIGenerated = paragraphValue.aiGenerated === true;
  const isActionVisible = !context.state.value.isNotebookReadonly && !props.isParagraphReadonly;
  const output = ParagraphState.getOutput(paragraphValue);

  const supportingHypothesesCount =
    hypotheses?.filter(
      (h) =>
        (h.supportingFindingParagraphIds?.includes(paragraphValue.id) ||
          h.userSelectedFindingParagraphIds?.includes(paragraphValue.id)) &&
        !h.irrelevantFindingParagraphIds?.includes(paragraphValue.id)
    ).length || 0;

  const getCurrentHypothesis = () => {
    const match = window.location.href.match(/\/hypothesis\/(H\d+)/);
    if (!match) return null;
    const hypothesisId = match[1];
    return hypotheses?.find((h) => h.id === hypothesisId);
  };

  const handleFeedback = async (feedbackType: 'CONFIRMED' | 'REJECTED') => {
    const parameters = paragraphValue.input.parameters as FindingParagraphParameters;
    const currentFeedback = parameters?.finding?.feedback;
    const newFeedback = currentFeedback === feedbackType ? undefined : feedbackType;

    setIsSaving(true);
    try {
      paragraph.updateInput({
        parameters: {
          ...parameters,
          finding: {
            ...parameters.finding,
            feedback: newFeedback,
          },
        },
      });
      await saveParagraph({ paragraphStateValue: paragraph.value, showLoading: false });
    } catch (error) {
      notifications.toasts.addError(error, { title: 'Updating finding failed.' });
      paragraph.updateInput({
        parameters: {
          ...parameters,
          finding: parameters?.finding,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkFinding = async (listType: 'irrelevant' | 'selected') => {
    const hypothesis = getCurrentHypothesis();
    if (!hypothesis) return;

    const supportingIds = hypothesis.supportingFindingParagraphIds || [];
    const irrelevantIds = hypothesis.irrelevantFindingParagraphIds || [];
    const selectedIds = hypothesis.userSelectedFindingParagraphIds || [];

    // Remove from all lists first
    const updatedSupportingIds = supportingIds.filter((id) => id !== paragraphValue.id);
    const updatedIrrelevantIds = irrelevantIds.filter((id) => id !== paragraphValue.id);
    const updatedSelectedIds = selectedIds.filter((id) => id !== paragraphValue.id);

    // Determine current state
    const isInIrrelevant = irrelevantIds.includes(paragraphValue.id);
    const isInSelected = selectedIds.includes(paragraphValue.id);

    // Add to appropriate list based on action and current state
    if (listType === 'irrelevant') {
      if (!isInIrrelevant) {
        updatedIrrelevantIds.push(paragraphValue.id);
      } else {
        updatedSupportingIds.push(paragraphValue.id);
      }
    } else if (listType === 'selected') {
      if (!isInSelected) {
        updatedSelectedIds.push(paragraphValue.id);
      } else {
        updatedSupportingIds.push(paragraphValue.id);
      }
    }

    const updatedHypotheses = hypotheses?.map((h: HypothesisItem) =>
      h.id === hypothesis.id
        ? {
            ...h,
            supportingFindingParagraphIds: updatedSupportingIds,
            irrelevantFindingParagraphIds: updatedIrrelevantIds,
            userSelectedFindingParagraphIds: updatedSelectedIds,
          }
        : h
    );

    setIsSaving(true);
    try {
      await http.put(`/api/investigation/savedNotebook/${notebookId}/hypothesis/${hypothesis.id}`, {
        body: JSON.stringify({
          supportingFindingParagraphIds: updatedSupportingIds,
          irrelevantFindingParagraphIds: updatedIrrelevantIds,
          userSelectedFindingParagraphIds: updatedSelectedIds,
        }),
      });

      context.state.updateValue({ hypotheses: updatedHypotheses });

      const message =
        listType === 'irrelevant'
          ? isInIrrelevant
            ? 'Marked as relevant'
            : 'Marked as irrelevant'
          : isInSelected
          ? 'Unselected finding'
          : 'Selected finding';
      notifications.toasts.addSuccess(message);
    } catch (error) {
      notifications.toasts.addError(error, {
        title: 'Failed to update finding',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const parameters = paragraphValue.input.parameters as FindingParagraphParameters;
  const feedback = parameters?.finding?.feedback;
  const hypothesis = getCurrentHypothesis();
  const showHypothesisActions = !!hypothesis;
  const isMarkedIrrelevant =
    hypothesis?.irrelevantFindingParagraphIds?.includes(paragraphValue.id) || false;
  const isMarkedSelected =
    hypothesis?.userSelectedFindingParagraphIds?.includes(paragraphValue.id) || false;

  const isTopology = paragraphValue.input.inputText.toLowerCase().includes('┌──────────');

  if (isTopology) {
    return (
      <Topology
        legacyTopology={paragraphValue as ParagraphBackendType<string, FindingParagraphParameters>}
      />
    );
  }

  return (
    <div className="notebookParagraphWrapper">
      {isActionVisible && ((!isAIGenerated && isFindingParagraph) || isClassicNotebook) && (
        <ParagraphActionPanel idx={index} scrollToPara={scrollToPara} deletePara={deletePara} />
      )}
      {ParagraphComponent && (
        <div key={paragraph.value.id} className={paraClass}>
          {isFindingParagraph && !!output && (
            <FindingHeader
              parameters={paragraphValue.input.parameters as FindingParagraphParameters}
              dateModified={paragraphValue.dateModified}
              isAIGenerated={isAIGenerated}
              supportingHypothesesCount={supportingHypothesesCount}
            />
          )}
          <ParagraphComponent paragraphState={paragraph} actionDisabled={true} />
          {isActionVisible &&
            isAIGenerated &&
            output &&
            isFindingParagraph &&
            showHypothesisActions && (
              <FindingFooter
                feedback={feedback}
                isMarkedIrrelevant={isMarkedIrrelevant}
                isMarkedSelected={isMarkedSelected}
                isSaving={isSaving}
                onFeedback={handleFeedback}
                onMarkFinding={handleMarkFinding}
              />
            )}
        </div>
      )}
    </div>
  );
};
