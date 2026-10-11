/**
 * Storelistener Desktop — Store Configuration (Module 3)
 * File: src/config/stores.js
 *
 * Configurable local development stores for the 3 iPhone retail locations.
 */

export const CONFIGURED_STORES = [
  {
    id: 'store-01',
    name: 'iPhone Store 01',
    code: 'STR-01',
    terminal: 'POS Counter 01',
    label: 'iPhone Store 01 (Flagship)',
  },
  {
    id: 'store-02',
    name: 'iPhone Store 02',
    code: 'STR-02',
    terminal: 'POS Counter 02',
    label: 'iPhone Store 02 (Galleria)',
  },
  {
    id: 'store-03',
    name: 'iPhone Store 03',
    code: 'STR-03',
    terminal: 'POS Counter 03',
    label: 'iPhone Store 03 (Metropolitan)',
  },
];

export const DEFAULT_STORE_ID = 'store-01';
