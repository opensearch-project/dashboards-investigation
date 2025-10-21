/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingContent,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSmallButton,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { useObservable } from 'react-use';

import { useHistory } from 'react-router-dom';
import { NotebookReactContext } from '../../context_provider/context_provider';
import { HypothesisItem } from './hypothesis_item';

interface HypothesesPanelProps {
  notebookId: string;
  question?: string;
  isInvestigating: boolean;
  doInvestigate: (props: { investigationQuestion: string; hypothesisIndex?: number }) => void;
  addNewFinding: (newFinding: { hypothesisIndex: number; text: string }) => Promise<void>;
}

export const HypothesesPanel: React.FC<HypothesesPanelProps> = ({
  notebookId,
  question,
  isInvestigating,
  doInvestigate,
  addNewFinding,
}) => {
  const notebookContext = useContext(NotebookReactContext);
  const { hypotheses } = useObservable(
    notebookContext.state.getValue$(),
    notebookContext.state.value
  );
  const history = useHistory();

  const handleClickHypothesis = (hypothesisId: string) => {
    history.push(`/agentic/${notebookId}/hypothesis/${hypothesisId}`);
  };

  // State for the Add Finding modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [findingText, setFindingText] = useState('%md Please add your finding here');
  const [currentHypothesisIndex, setCurrentHypothesisIndex] = useState<number | null>(null);

  const closeModal = () => {
    setIsModalVisible(false);
    setFindingText('%md Please add your finding here');
    setCurrentHypothesisIndex(null);
  };

  const showModal = (index: number) => {
    setCurrentHypothesisIndex(index);
    setIsModalVisible(true);
  };

  const handleAddFinding = async () => {
    if (currentHypothesisIndex === null || !hypotheses) return;

    await addNewFinding({ hypothesisIndex: currentHypothesisIndex, text: findingText });

    closeModal();
  };

  if (!question) {
    return null;
  }

  return (
    <>
      <EuiPanel>
        <EuiAccordion id="hypotheses" buttonContent="Hypotheses" arrowDisplay="right" initialIsOpen>
          {hypotheses?.map((hypothesis, index) => {
            return (
              <EuiFlexGroup alignItems="center" gutterSize="none">
                <HypothesisItem
                  index={index}
                  hypothesis={hypothesis}
                  onClickHypothesis={handleClickHypothesis}
                />
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiSmallButton disabled={isInvestigating} onClick={() => showModal(index)}>
                      Add Finding
                    </EuiSmallButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSmallButton
                      disabled={isInvestigating}
                      onClick={() => {
                        doInvestigate({
                          investigationQuestion: question,
                          hypothesisIndex: index,
                        });
                      }}
                    >
                      Rerun investigation
                    </EuiSmallButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            );
          })}
          {isInvestigating && (
            <>
              <EuiLoadingContent />
            </>
          )}
        </EuiAccordion>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup dir="row" alignItems="center" gutterSize="none" style={{ gap: 8 }}>
          <EuiIcon type="" />
          <EuiText size="s" color="subdued">
            AI Agent continuously evaluates and ranks hypotheses based on evidence
          </EuiText>
        </EuiFlexGroup>
      </EuiPanel>
      {/* Add Finding Modal */}
      {isModalVisible && (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Add Finding</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiTextArea
              fullWidth
              placeholder="Enter your finding here"
              value={findingText}
              onChange={(e) => setFindingText(e.target.value)}
              rows={5}
              aria-label="Add finding text area"
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>
            <EuiButton fill onClick={handleAddFinding}>
              Add
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
