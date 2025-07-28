/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from '@testing-library/react';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import { getOSDHttp } from '../../../../../../common/utils';
import { sampleParsedParagraghs1 } from '../../../../../../test/notebooks_constants';
import { Paragraphs } from '../paragraphs';

jest.mock('../../../../../../../../src/plugins/embeddable/public', () => ({
  ViewMode: {
    EDIT: 'edit',
    VIEW: 'view',
  },
}));

jest.mock('../../bubbleup/bubble_up_container', () => ({
  BubbleUpContainer: () => <div />,
}));

const mockFind = jest.fn().mockResolvedValue({
  savedObjects: [],
});

jest.mock('../../../../../framework/core_refs', () => ({
  coreRefs: {
    savedObjectsClient: {
      find: (options) => mockFind(options),
    },
  },
}));

describe('<Paragraphs /> spec', () => {
  configure({ adapter: new Adapter() });

  it('renders the component', () => {
    const setPara = jest.fn();
    const paragraphSelector = jest.fn();
    const textValueEditor = jest.fn();
    const handleKeyPress = jest.fn();
    const addPara = jest.fn();
    const DashboardContainerByValueRenderer = jest.fn();
    const deleteVizualization = jest.fn();
    const setSelectedViewId = jest.fn();
    const deletePara = jest.fn();
    const runPara = jest.fn();
    const clonePara = jest.fn();
    const movePara = jest.fn();
    const para = sampleParsedParagraghs1[0];
    const utils = render(
      <Paragraphs
        ref={jest.fn()}
        para={para}
        setPara={setPara}
        dateModified="2023-11-01 01:02:03"
        index={0}
        paraCount={2}
        paragraphSelector={paragraphSelector}
        textValueEditor={textValueEditor}
        handleKeyPress={handleKeyPress}
        addPara={addPara}
        DashboardContainerByValueRenderer={DashboardContainerByValueRenderer}
        deleteVizualization={deleteVizualization}
        http={getOSDHttp()}
        selectedViewId="view_both"
        setSelectedViewId={setSelectedViewId}
        deletePara={deletePara}
        runPara={runPara}
        clonePara={clonePara}
        movePara={movePara}
        showQueryParagraphError={false}
        queryParagraphErrorMessage="error-message"
        dataSourceEnabled={false}
        paragraphs={[]}
      />
    );
    expect(utils.container.firstChild).toMatchSnapshot();

    utils.getByLabelText('Open paragraph menu').click();
    utils.getByText('Run input').click();
    utils.getByLabelText('Open paragraph menu').click();
    utils.getByText('Duplicate').click();
    utils.getByLabelText('Open paragraph menu').click();
    utils.getByText('Delete').click();
  });

  it('use SavedObject find to fetch visualizations when dataSourceEnabled', () => {
    const setPara = jest.fn();
    const paragraphSelector = jest.fn();
    const textValueEditor = jest.fn();
    const handleKeyPress = jest.fn();
    const addPara = jest.fn();
    const DashboardContainerByValueRenderer = jest.fn();
    const deleteVizualization = jest.fn();
    const setSelectedViewId = jest.fn();
    const deletePara = jest.fn();
    const runPara = jest.fn();
    const clonePara = jest.fn();
    const movePara = jest.fn();
    const para = {
      uniqueId: 'paragraph_1a710988-ec19-4caa-83cc-38eb609427d1',
      isRunning: false,
      inQueue: false,
      showAddPara: false,
      isVizualisation: true,
      vizObjectInput: '{}',
      id: 1,
      inp: '# Type your input here',
      isOutputStale: false,
      paraDivRef: undefined,
      visEndTime: undefined,
      visSavedObjId: undefined,
      visStartTime: undefined,
      lang: 'text/x-md',
      editorLanguage: 'md',
      typeOut: ['MARKDOWN'],
      out: ['# Type your input here'],
    };
    const utils = render(
      <Paragraphs
        ref={jest.fn()}
        para={para}
        setPara={setPara}
        dateModified="2023-11-01 01:02:03"
        index={0}
        paraCount={2}
        paragraphSelector={paragraphSelector}
        textValueEditor={textValueEditor}
        handleKeyPress={handleKeyPress}
        addPara={addPara}
        DashboardContainerByValueRenderer={DashboardContainerByValueRenderer}
        deleteVizualization={deleteVizualization}
        http={getOSDHttp()}
        selectedViewId="view_both"
        setSelectedViewId={setSelectedViewId}
        deletePara={deletePara}
        runPara={runPara}
        clonePara={clonePara}
        movePara={movePara}
        showQueryParagraphError={false}
        queryParagraphErrorMessage="error-message"
        dataSourceEnabled={true}
        dataSourceManagement={{ ui: { DataSourceSelector: <></> } }}
        paragraphs={[]}
      />
    );
    expect(utils.container.firstChild).toMatchSnapshot();
    expect(mockFind).toHaveBeenCalledWith({
      type: 'visualization',
    });
  });
});
