/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { euiPaletteForStatus } from '@elastic/eui';

const paletteColors = euiPaletteForStatus(5);

export const SEVERITY_OPTIONS = [
  {
    value: '1',
    badgeText: 'Highest',
    color: { background: paletteColors[4], text: 'white' },
  },
  {
    value: '2',
    badgeText: 'High',
    color: { background: paletteColors[3], text: 'white' },
  },
  {
    value: '3',
    badgeText: 'Medium',
    color: { background: paletteColors[2], text: 'black' },
  },
  {
    value: '4',
    badgeText: 'Low',
    color: { background: paletteColors[1], text: 'white' },
  },
  {
    value: '5',
    badgeText: 'Lowest',
    color: { background: paletteColors[0], text: 'white' },
  },
];
