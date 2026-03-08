// ─── Medication Keys ──────────────────────────────────────────────────────────

export type MedicationKey =
    | 'invega_sustenna' | 'invega_trinza' | 'invega_hafyera'
    | 'abilify_maintena' | 'aristada' | 'uzedy'
    | 'haloperidol_decanoate' | 'fluphenazine_decanoate'
    | 'vivitrol' | 'sublocade' | 'brixadi';

export type InvegaType      = 'initiation' | 'maintenance';
export type MaintenanceDose = '156-or-less' | '234';
export type TrinzaDose      = '410' | '546' | '819';
export type AbilifyDoses    = '1-2' | '3+';
export type AristadaDose    = '441' | '662' | '882' | '1064';
export type UzedyDose       = '150-or-less' | '200-or-more';
export type HafyeraCategory = 'early' | 'on-time' | 'consult';

// ─── Guidance Return Types ────────────────────────────────────────────────────

/** Standard three-part guidance returned by most late-injection functions. */
export interface GuidanceResult {
    idealSteps: string;
    pragmaticVariations: string;
    providerNotification: string;
}

/** Aristada returns a different shape because it may not be due yet. */
export type AristadaGuidanceResult =
    | { notDue: true;  message: string }
    | { notDue: false; supplementation: string; providerNotification: string };

// ─── Late Guidance Config Types ───────────────────────────────────────────────

/**
 * A time-based tier where all doses receive the same guidance.
 * Applies when daysSince <= maxDays (and previous tier did not match).
 */
export interface StaticTier {
    type: 'static';
    maxDays: number;
    guidance: GuidanceResult;
}

/**
 * A time-based tier where guidance varies by the patient's current dose.
 * Applies when daysSince <= maxDays (and previous tier did not match).
 */
export interface DoseVariantTier {
    type: 'dose-variant';
    maxDays: number;
    guidanceByDose: Record<string, GuidanceResult>;
}

export type LateTier = StaticTier | DoseVariantTier;

/**
 * Supplementation guidance tier used within each Aristada dose config.
 * Applies when daysSince <= maxDays (and previous tier did not match).
 */
export interface AristadaSupplementTier {
    maxDays: number;
    supplementation: string;
    providerNotification: string;
}

/** All time-based supplementation tiers for one specific Aristada dose. */
export interface AristadaDoseConfig {
    dose: AristadaDose;
    tiers: AristadaSupplementTier[];
}

/** Maps a prior-dose history group to how many weeks before reinitiation is required. */
export interface AbilifyPriorDoseGroup {
    priorDoses: AbilifyDoses;
    /** Administer routine guidance when weeksSince <= this value. */
    routineMaxWeeks: number;
}

// ─── Haloperidol / Fluphenazine Decanoate ─────────────────────────────────────

export type HaloperidolPriorDoses = '1-3' | '4+';

export interface HaloperidolPriorDoseGroup {
    priorDoses: HaloperidolPriorDoses;
    tiers: LateTier[];
}

export type FluphenazinePriorDoses = '1-2' | '3+';

export interface FluphenazinePriorDoseGroup {
    priorDoses: FluphenazinePriorDoses;
    tiers: LateTier[];
}

// ─── Vivitrol / Sublocade / Brixadi ──────────────────────────────────────────

export type VivitrolIndication = 'oud' | 'overdose-prevention';
export type SublocadeType      = '100mg' | '300mg-few' | '300mg-established';
export type BrixadiType        = 'monthly-64' | 'monthly-96' | 'monthly-128' | 'weekly';
