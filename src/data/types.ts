/** Shared types and interfaces for the medication registry. */

import type {
    GuidanceResult,
    CategoricalGuidanceResult,
    SupplementalGuidanceResult,
    SubmitContext,
} from '../types';

// ─── Registry key ─────────────────────────────────────────────────────────────

/** Unique string key for each medication entry in the registry. */
export type MedicationKey =
    | 'invega_sustenna' | 'invega_trinza' | 'invega_hafyera'
    | 'abilify_maintena' | 'aristada' | 'uzedy'
    | 'haloperidol_decanoate' | 'fluphenazine_decanoate'
    | 'vivitrol' | 'sublocade' | 'brixadi';

// ─── Guidance params / output ─────────────────────────────────────────────────

/**
 * Parameters passed to getLateGuidance. Use only the fields relevant to
 * the medication — unused fields are ignored by each closure.
 */
export interface LateGuidanceParams {
    daysSince?:  number;
    weeksSince?: number;
    variant?:    string;
    dose?:       string;
}

export type LateGuidanceOutput = GuidanceResult | SupplementalGuidanceResult | CategoricalGuidanceResult;

// ─── Form / UI types ──────────────────────────────────────────────────────────

export type RenderType = 'three-part' | 'categorical' | 'supplementation';

/** A row in the guidance summary panel. */
export type InfoRowSpec =
    | { label: string; value: string }                                          // static string
    | { label: string; field: string; format: 'date' | 'option-label' }        // field value
    | { label: string; format: 'days-weeks' | 'days-months' | 'days-weeks-months' }; // computed time

/** Auto-derives validateLate / buildLateParams / buildLateInfoRows from JSON data */
export interface LateSpec {
    requiredFields:     { id: string; message: string }[];
    dateField:          string;
    paramKey?:          'dose' | 'variant';
    paramField?:        string;
    includeWeeksSince?: boolean;
    infoRows:           InfoRowSpec[];
}

/** A single option in a select field */
export interface SelectOption { value: string; label: string; }

/** Describes one form field (date input or select) */
export type FieldSpec =
    | { type: 'date';   id: string; label: string }
    | { type: 'select'; id: string; label: string; placeholder?: string; onchange?: string; options: SelectOption[] };

/** A named group of fields shown/hidden together */
export interface FormGroupSpec { groupId: string; fields: FieldSpec[]; }

// ─── MedDefinition ────────────────────────────────────────────────────────────

export interface MedDefinition {
    displayName:   string;
    earlyGuidance: string;
    getLateGuidance(params: LateGuidanceParams): LateGuidanceOutput;

    // UI config: used by app.ts to generically handle form interaction
    optgroupLabel:   string;           // medication <select> optgroup label
    formGroupsSpec:  FormGroupSpec[];  // declarative spec; drives runtime HTML generation
    lateFieldsGroup: string;
    subFieldGroups?: string[];         // extra groups to hide on medication change
    renderType:      RenderType;
    /** All form field IDs this med uses — used to build ctx and clear fields on change */
    formFieldIds: string[];
    /** ID of the sub-group selector element (if this med has a sub-group toggle) */
    subGroupSelectorId?: string;
    /** Optional: handle a sub-group selector change (e.g. injection type toggle) */
    handleSubGroupChange?(subGroupVal: string, show: (id: string) => void, hide: (id: string) => void, clear: (id: string) => void): void;
    validateLate(ctx: SubmitContext): string | null;
    buildLateParams(ctx: SubmitContext): LateGuidanceParams;
    buildLateInfoRows(ctx: SubmitContext, daysSince: number): [string, string][];
}

// ─── Internal raw JSON shapes (used by loader) ────────────────────────────────

export type RawTier = Record<string, unknown>;

/** Internal: the three guidance-logic fields built by buildCoreDef. */
export type CoreDef = Pick<MedDefinition, 'displayName' | 'earlyGuidance' | 'getLateGuidance'>;

/** Average days per month (365.25 / 12). */
export const DAYS_PER_MONTH = 30.44;
