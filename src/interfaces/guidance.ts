// ─── Guidance Return Types ──────────────────────────────────────────────────

/** Standard three-part guidance returned by most late-injection functions. */
export interface GuidanceResult {
    /**
     * Ideal step-by-step guidance that may be rendered as multiple ordered
     * items. Provided as an array to preserve ordering in structured UI.
     */
    idealSteps: string[];
    /** Omit when there are no meaningful pragmatic variations. */
    pragmaticVariations?: string[];
    /** Omit when no provider notification is needed; defaults to "No provider notification needed." */
    providerNotifications?: string[];
}

/**
 * Categorical output: the guidance decision is one of a small set of named
 * states (e.g. not-yet-due, proceeed, or consult-required).
 */
export type CategoricalGuidanceResult = 'early' | 'on-time' | 'consult';

/**
 * Supplemental output: the medication is overdue but the guidance may include
 * dose-specific supplementation rather than a straight three-part response.
 */
export type SupplementalGuidanceResult =
    | { notDue: true;  message: string }
    | { notDue: false; supplementation?: string; providerNotifications?: string[] };

// ─── Late Guidance Tier Types ─────────────────────────────────────────────────

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

// ─── UI helpers ───────────────────────────────────────────────────────────────

/** All form field values keyed by HTML element ID, passed to registry UI methods. */
export type SubmitContext = Record<string, string>;
