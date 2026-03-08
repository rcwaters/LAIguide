/**
 * src/constants.ts
 *
 * All medication data now lives in individual JSON files under src/meds/.
 * This file is kept as a re-export barrel so the rest of the codebase
 * continues to import from './constants' without any changes.
 */
export * from './meds/types';
export * from './meds/loader';
export * from './meds/constants';
