/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSmallButton,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { useContext, useState } from 'react';
import { useObservable } from 'react-use';

import { NotebookReactContext } from '../context_provider/context_provider';

interface HypothesesPanelProps {
  question?: string;
  isInvestigating: boolean;
  doInvestigate: (props: { investigationQuestion: string; hypothesisIndex?: number }) => void;
  addNewFinding: (newFinding: { hypothesisIndex: number; text: string }) => Promise<void>;
}

export const HypothesesPanel: React.FC<HypothesesPanelProps> = ({
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
        <EuiTitle size="s">
          <h3>Hypotheses</h3>
        </EuiTitle>
        <EuiSpacer />
        {hypotheses?.map(({ title, description, likelihood }, index) => (
          <React.Fragment key={index}>
            <EuiCard
              textAlign="left"
              title={
                <>
                  {title}&nbsp;&nbsp;
                  <EuiBadge color="success">{likelihood}%</EuiBadge>
                </>
              }
              footer={
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
              }
            >
              {description}
            </EuiCard>
            <EuiSpacer />
          </React.Fragment>
        ))}
        {isInvestigating && (
          <>
            <EuiLoadingContent />
          </>
        )}
      </EuiPanel>
      <EuiSpacer />

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
