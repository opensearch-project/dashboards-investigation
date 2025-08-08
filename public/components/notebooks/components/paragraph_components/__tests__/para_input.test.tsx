/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import { sampleParsedParagraghs1 } from '../../../../../../test/notebooks_constants';
import { ParaInput } from '../para_input';

describe('<para_input /> spec', () => {
  configure({ adapter: new Adapter() });
  const visOptions1 = Array.from({ length: 5 }, (v, k) => ({
    label: `visualization-${k}`,
    key: `key-${k}`,
  }));
  const visOptions2 = Array.from({ length: 5 }, (v, k) => ({
    label: `visualization-${k}`,
    key: `key-${k}`,
  }));
  const visOptions = [
    { label: 'VisOptions1', options: visOptions1 },
    { label: 'VisOptions2', options: visOptions2 },
  ];

  it('renders the visualization component', () => {
    const para = sampleParsedParagraghs1[2];
    const setStartTime = jest.fn();
    const setEndTime = jest.fn();
    const setIsOutputStale = jest.fn();
    const setSelectedVisOption = jest.fn();
    const setVisType = jest.fn();
    const utils = render(
      <ParaInput
        para={para}
        index={1}
        runParaError={false}
        startTime={para.visStartTime}
        setStartTime={setStartTime}
        endTime={para.visEndTime}
        setEndTime={setEndTime}
        setIsOutputStale={setIsOutputStale}
        visOptions={visOptions}
        selectedVisOption={[visOptions1[0]]}
        setSelectedVisOption={setSelectedVisOption}
        setVisType={setVisType}
      />
    );
    expect(utils.container.firstChild).toMatchSnapshot();
  });

  it('clicks the visualization component', async () => {
    const para = sampleParsedParagraghs1[2];
    const setStartTime = jest.fn();
    const setEndTime = jest.fn();
    const setIsOutputStale = jest.fn();
    const setSelectedVisOption = jest.fn();
    const setVisType = jest.fn();
    const utils = render(
      <ParaInput
        para={para}
        index={1}
        runParaError={false}
        startTime={para.visStartTime}
        setStartTime={setStartTime}
        endTime={para.visEndTime}
        setEndTime={setEndTime}
        setIsOutputStale={setIsOutputStale}
        visOptions={visOptions}
        selectedVisOption={[visOptions2[0]]}
        setSelectedVisOption={setSelectedVisOption}
        setVisType={setVisType}
      />
    );
    const datepicker = utils.container.querySelectorAll(
      'button[data-test-subj="superDatePickerstartDatePopoverButton"]'
    );
    fireEvent.click(datepicker[0]);

    utils.getByTestId('para-input-visualization-browse-button').click();
    await waitFor(() => {
      // modal should show up
      utils.getByTestId('para-input-select-button').click();
    });
  });
});
