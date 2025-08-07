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
import { ParagraphProps, Paragraphs } from '../paragraphs';
import { ParagraphStateValue } from '../../../../../../common/state/paragraph_state';
import { MockContextProvider } from '../../../context_provider/context_provider.mock';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import { notificationServiceMock } from '../../../../../../../../src/core/public/mocks';

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

jest.mock('../../../../../../public/services', () => ({
  getDataSourceManagementSetup: jest.fn(() => ({
    dataSourceManagement: {
      ui: { DataSourceSelector: () => <div data-test-sub="dataSourceSelector" /> },
    },
  })),
}));

const ContextAwareParagraphs = (
  props: ParagraphProps & {
    paragraphValues: ParagraphStateValue[];
  }
) => {
  return (
    <OpenSearchDashboardsContextProvider
      services={{
        http: getOSDHttp(),
        dashboard: {
          DashboardContainerByValueRenderer: jest.fn(),
        },
        savedObjects: { client: { find: mockFind } },
        dataSource: {},
        notifications: notificationServiceMock.createStartContract(),
      }}
    >
      <MockContextProvider paragraphValues={props.paragraphValues}>
        <Paragraphs {...props} />
      </MockContextProvider>
    </OpenSearchDashboardsContextProvider>
  );
};

describe('<Paragraphs /> spec', () => {
  configure({ adapter: new Adapter() });

  it('renders the component', () => {
    const setPara = jest.fn();
    const paragraphSelector = jest.fn();
    const addPara = jest.fn();
    const DashboardContainerByValueRenderer = jest.fn();
    const deletePara = jest.fn();
    const runPara = jest.fn();
    const para = sampleParsedParagraghs1[0];
    const utils = render(
      <ContextAwareParagraphs
        ref={jest.fn()}
        para={para}
        setPara={setPara}
        dateModified="2023-11-01 01:02:03"
        index={0}
        paraCount={2}
        paragraphSelector={paragraphSelector}
        addPara={addPara}
        DashboardContainerByValueRenderer={DashboardContainerByValueRenderer}
        http={getOSDHttp()}
        selectedViewId="view_both"
        deletePara={deletePara}
        runPara={runPara}
        dataSourceEnabled={false}
        paragraphs={[]}
        paragraphValues={[
          {
            ...sampleParsedParagraghs1[0],
            input: {
              inputType: 'CODE',
              inputText: '%md # Type your input here',
            },
            dateCreated: '',
            dateModified: '',
            id: '',
          },
        ]}
      />
    );
    expect(utils.container.firstChild).toMatchSnapshot();
  });

  it('use SavedObject find to fetch visualizations when dataSourceEnabled', () => {
    const setPara = jest.fn();
    const paragraphSelector = jest.fn();
    const addPara = jest.fn();
    const DashboardContainerByValueRenderer = jest.fn();
    const deletePara = jest.fn();
    const runPara = jest.fn();
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
      <ContextAwareParagraphs
        ref={jest.fn()}
        para={para}
        setPara={setPara}
        dateModified="2023-11-01 01:02:03"
        index={0}
        paraCount={2}
        paragraphSelector={paragraphSelector}
        addPara={addPara}
        DashboardContainerByValueRenderer={DashboardContainerByValueRenderer}
        http={getOSDHttp()}
        selectedViewId="view_both"
        deletePara={deletePara}
        runPara={runPara}
        dataSourceEnabled={true}
        dataSourceManagement={{ ui: { DataSourceSelector: () => null } }}
        paragraphs={[]}
        paragraphValues={[
          {
            ...para,
            input: {
              inputType: 'VISUALIZATION',
              inputText: '%md # Type your input here',
            },
            dateCreated: '',
            dateModified: '',
            id: '',
          },
        ]}
      />
    );
    expect(utils.container.firstChild).toMatchSnapshot();
    expect(mockFind).toHaveBeenCalledWith({
      type: 'visualization',
    });
  });
});
