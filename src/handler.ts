import type { MedicationKey, LateGuidanceParams, LateGuidanceOutput } from './data/types';
import { MED_REGISTRY } from './data/loader';
import { MEDICATION_DISPLAY_NAMES, EARLY_GUIDANCE_CONTENT } from './data/constants';

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export function getMedicationDisplayName(medication: string): string {
    return MEDICATION_DISPLAY_NAMES[medication as MedicationKey] ?? medication;
}

export function getEarlyGuidanceContent(medication: string): string {
    return EARLY_GUIDANCE_CONTENT[medication as MedicationKey]
        ?? 'Please consult the DESC LAI standing order document for specific guidance.';
}

// ─── Generic Guidance Dispatcher ─────────────────────────────────────────────

export function getLateGuidance(key: MedicationKey, params: LateGuidanceParams): LateGuidanceOutput {
    return MED_REGISTRY[key].getLateGuidance(params);
}
