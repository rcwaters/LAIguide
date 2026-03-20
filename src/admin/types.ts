/** Guidance text and bullet points for a single tier window. */
export interface RawTierGuidance {
    idealSteps: string[];
    pragmaticVariations?: string[];
    providerNotifications?: string[];
}

/** A time-window tier within a variant (e.g. ≤ 27 days overdue). */
export interface RawTier {
    maxDays: number | null;
    guidance: RawTierGuidance;
}

/** A late-guidance variant (e.g. "initiation" vs "maintenance"). */
export interface RawVariant {
    key: string;
    /** If set, this variant inherits tiers from the named variant. */
    sameAs?: string;
    tiers?: RawTier[];
}

export interface RawLateGuidance {
    variants: RawVariant[];
    internalNotes?: string[];
}

export interface RawSharedGuidance {
    providerNotifications?: string[];
}

export interface RawEarlyGuidance {
    minDays?: number;
    daysBeforeDue?: number;
    guidanceNote?: string;
}

export interface RawGuidance {
    shared?: RawSharedGuidance;
    early?: RawEarlyGuidance;
    late: RawLateGuidance;
}

/**
 * The shape of a medication JSON file as stored in src/meds/*.json.
 * Fields beyond these are preserved on save but not surfaced in the form editor.
 */
export interface RawMedJson {
    key: string;
    displayName: string;
    optgroupLabel: string;
    guidance: RawGuidance;
    [key: string]: unknown;
}
