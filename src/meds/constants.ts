/**
 * src/meds/constants.ts
 *
 * Derived display constants computed from MED_REGISTRY.
 */

import type { MedicationKey } from './types';
import { MED_REGISTRY } from './loader';

export const MEDICATION_DISPLAY_NAMES: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.displayName])) as Record<MedicationKey, string>;

export const EARLY_GUIDANCE_CONTENT: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.earlyGuidance])) as Record<MedicationKey, string>;
