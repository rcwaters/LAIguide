// Re-export all types so consumers can import from a single place if desired.
export type {
    MedicationKey,
    InvegaType,
    MaintenanceDose,
    TrinzaDose,
    AbilifyDoses,
    AristadaDose,
    UzedyDose,
    HafyeraCategory,
    GuidanceResult,
    AristadaGuidanceResult,
    LateTier,
    HaloperidolPriorDoses,
    FluphenazinePriorDoses,
    VivitrolIndication,
    SublocadeType,
    BrixadiType,
    SubmitContext,
} from './types';

export type { LateGuidanceParams, LateGuidanceOutput } from './constants';
export { MED_REGISTRY } from './constants';

import type { MedicationKey } from './types';

import {
    MED_REGISTRY,
    MEDICATION_DISPLAY_NAMES,
    EARLY_GUIDANCE_CONTENT,
    type LateGuidanceParams,
    type LateGuidanceOutput,
} from './constants';

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export function getMedicationDisplayName(medication: string): string {
    return MEDICATION_DISPLAY_NAMES[medication as MedicationKey] ?? medication;
}

export function getEarlyGuidanceContent(medication: string): string {
    return EARLY_GUIDANCE_CONTENT[medication as MedicationKey]
        ?? 'Please consult the DESC LAI standing order document for specific guidance.';
}

// ─── Date / Time Utilities ────────────────────────────────────────────────────

export { daysSinceDate, formatWeeksAndDays, formatDate } from './utils';

// ─── Generic Guidance Dispatcher ─────────────────────────────────────────────

export function getLateGuidance(key: MedicationKey, params: LateGuidanceParams): LateGuidanceOutput {
    return MED_REGISTRY[key].getLateGuidance(params);
}
