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
import { ParagraphProps, Paragraph } from '../paragraph';
import { ParagraphStateValue } from '../../../../../../common/state/paragraph_state';
import { MockContextProvider } from '../../../context_provider/context_provider.mock';
import { OpenSearchDashboardsContextProvider } from '../../../../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  notificationServiceMock,
  uiSettingsServiceMock,
} from '../../../../../../../../src/core/public/mocks';

jest.mock('../../../../../../../../src/plugins/embeddable/public', () => ({
  ViewMode: {
    EDIT: 'edit',
    VIEW: 'view',
  },
}));

jest.mock('../../data_distribution/data_distribution_container', () => ({
  DataDistributionContainer: () => <div />,
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

// Mock Monaco editor completely
jest.mock('@osd/monaco', () => ({
  monaco: jest.fn(),
}));

jest.mock('../../../../../../../../src/plugins/opensearch_dashboards_react/public', () => ({
  ...jest.requireActual('../../../../../../../../src/plugins/opensearch_dashboards_react/public'),
  CodeEditor: () => <div data-test-subj="code-editor" />,
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
        uiSettings: uiSettingsServiceMock.createStartContract(),
        paragraphService: {
          getParagraphRegistry: jest.fn().mockImplementation(() => {
            return {
              ParagraphComponent: () => <div data-test-subj="mock-paragraph" />,
            };
          }),
        },
      }}
    >
      <MockContextProvider paragraphValues={props.paragraphValues}>
        <Paragraph {...props} />
      </MockContextProvider>
    </OpenSearchDashboardsContextProvider>
  );
};

describe('<Paragraphs /> spec', () => {
  configure({ adapter: new Adapter() });

  it('renders the component', () => {
    const deletePara = jest.fn();
    const para = sampleParsedParagraghs1[0];
    const utils = render(
      <ContextAwareParagraphs
        para={para}
        index={0}
        handleSelectedDataSourceChange={jest.fn()}
        scrollToPara={jest.fn()}
        selectedViewId="view_both"
        deletePara={deletePara}
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
    expect(utils.getByTestId('mock-paragraph')).toBeInTheDocument();
  });

  it('use SavedObject find to fetch visualizations when dataSourceEnabled', () => {
    const deletePara = jest.fn();
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
        para={para}
        index={0}
        selectedViewId="view_both"
        deletePara={deletePara}
        handleSelectedDataSourceChange={jest.fn()}
        scrollToPara={jest.fn()}
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

    // Expect the mock paragraph has been rendered
    expect(utils.getByTestId('mock-paragraph')).toBeInTheDocument();
  });
});
