/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { I18nProvider } from '@osd/i18n/react';
import React from 'react';
import { Main as NotebooksHome } from './notebooks/components/main';

const pages = {
  notebooks: NotebooksHome,
};

export const App = () => {
  const ModuleComponent = pages.notebooks;

  return (
    <I18nProvider>
      <ModuleComponent />
    </I18nProvider>
  );
};
