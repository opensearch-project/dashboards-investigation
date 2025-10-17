/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLocation } from 'react-router-dom';

export enum SubRouter {
  Hypothesis = 'hypothesis',
  Investigation = 'investigation',
}

export const useSubRouter = () => {
  const location = useLocation();
  const isHypothesisRoute = location.pathname.includes('/hypothesis/');

  return {
    page: isHypothesisRoute ? SubRouter.Hypothesis : SubRouter.Investigation,
  };
};
