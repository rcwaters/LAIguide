/**
 * src/meds/loader.ts
 *
 * Parses each medication JSON file into a MedDefinition with a getLateGuidance()
 * closure. MED_REGISTRY is the single place that knows about specific meds;
 * all code outside src/meds works through the registry generically.
 */

import type {
    LateTier,
    GuidanceResult,
    CategoricalGuidanceResult,
    SupplementalGuidanceResult,
    SubmitContext,
} from '../types';

// ─── Medication registry key ───────────────────────────────────────────────────────────

/** Unique string key for each medication entry in the registry. */
export type MedicationKey =
    | 'invega_sustenna' | 'invega_trinza' | 'invega_hafyera'
    | 'abilify_maintena' | 'aristada' | 'uzedy'
    | 'haloperidol_decanoate' | 'fluphenazine_decanoate'
    | 'vivitrol' | 'sublocade' | 'brixadi';

import { daysSinceDate, formatDate, formatWeeksAndDays } from '../utils';

// ─── JSON imports ─────────────────────────────────────────────────────────────

import invegaSustennaJson  from './invega_sustenna.json';
import invegaTrinzaJson    from './invega_trinza.json';
import invegaHafyeraJson   from './invega_hafyera.json';
import abilifyMaintenaJson from './abilify_maintena.json';
import aristadaJson        from './aristada.json';
import uzedyJson           from './uzedy.json';
import haloperidolDecJson  from './haloperidol_decanoate.json';
import fluphenazineDecJson from './fluphenazine_decanoate.json';
import vivitrolJson        from './vivitrol.json';
import sublocadeJson       from './sublocade.json';
import brixadiJson         from './brixadi.json';

// ─── Raw shape interfaces (private) ──────────────────────────────────────────

interface RawGuidance {
    idealSteps:           string;
    pragmaticVariations:  string;
    providerNotification: string;
}

type RawTier = Record<string, unknown>;

// ─── Public types ─────────────────────────────────────────────────────────────

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

export type RenderType = 'three-part' | 'categorical' | 'supplementation';

/** Spec row used by buildStandardDef to auto-generate buildLateInfoRows */
export type InfoRowSpec =
    | { label: string; field: string; format: 'date' | 'option-label' }
    | { label: string; format: 'days-weeks' | 'days-months' | 'days-weeks-months' };

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

// ─── Internal utilities ───────────────────────────────────────────────────────

function days(n: number | null): number { return n === null ? Infinity : n; }

function buildGuidance(raw: RawGuidance): GuidanceResult {
    return {
        idealSteps:           raw.idealSteps,
        pragmaticVariations:  raw.pragmaticVariations,
        providerNotification: raw.providerNotification,
    };
}

function buildTier(raw: RawTier): LateTier {
    const maxDays = days(raw['maxDays'] as number | null);
    if (raw['guidanceByDose'] != null) {
        const guidanceByDose: Record<string, GuidanceResult> = {};
        for (const [dose, g] of Object.entries(raw['guidanceByDose'] as Record<string, RawGuidance>)) {
            guidanceByDose[dose] = buildGuidance(g);
        }
        return { type: 'dose-variant', maxDays, guidanceByDose };
    }
    return { type: 'static', maxDays, guidance: buildGuidance(raw['guidance'] as RawGuidance) };
}

function buildTiers(raws: RawTier[]): LateTier[] { return raws.map(buildTier); }

function resolveLateTier(tiers: LateTier[], daysSince: number, dose?: string): GuidanceResult {
    const tier = tiers.find(t => daysSince <= t.maxDays) ?? tiers[tiers.length - 1];
    if (tier.type === 'dose-variant') return tier.guidanceByDose[dose!];
    return tier.guidance;
}

// ─── Core-only builders (guidance logic, no UI config) ────────────────────────

type CoreDef = Pick<MedDefinition, 'displayName' | 'earlyGuidance' | 'getLateGuidance'>;

function buildFromTiers(json: { displayName: string; earlyGuidance: string; lateGuidance: unknown }): CoreDef {
    const tiers = buildTiers((json.lateGuidance as { tiers: RawTier[] }).tiers);
    return {
        displayName:     json.displayName,
        earlyGuidance:   json.earlyGuidance,
        getLateGuidance: ({ daysSince, dose }) => resolveLateTier(tiers, daysSince!, dose),
    };
}

function buildFromPriorDoseGroups(json: { displayName: string; earlyGuidance: string; lateGuidance: unknown }): CoreDef {
    const groups = (json.lateGuidance as { priorDoseGroups: { priorDoses: string; tiers: RawTier[] }[] })
        .priorDoseGroups.map(pg => ({ priorDoses: pg.priorDoses, tiers: buildTiers(pg.tiers) }));
    return {
        displayName:     json.displayName,
        earlyGuidance:   json.earlyGuidance,
        getLateGuidance: ({ daysSince, variant }) => {
            const group = groups.find(g => g.priorDoses === variant)!;
            return resolveLateTier(group.tiers, daysSince!);
        },
    };
}

function buildFromKeyedTiers(json: { displayName: string; earlyGuidance: string; lateGuidance: unknown }): CoreDef {
    const tiersMap: Record<string, LateTier[]> = {};
    for (const v of (json.lateGuidance as { variants: { key: string; tiers: RawTier[] }[] }).variants) {
        tiersMap[v.key] = buildTiers(v.tiers);
    }
    return {
        displayName:     json.displayName,
        earlyGuidance:   json.earlyGuidance,
        getLateGuidance: ({ daysSince, variant }) => resolveLateTier(tiersMap[variant!], daysSince!),
    };
}

function buildInvegaSustenna(): CoreDef {
    const lg = invegaSustennaJson.lateGuidance as unknown as { initiationTiers: RawTier[]; maintenanceTiers: RawTier[] };
    const initTiers  = buildTiers(lg.initiationTiers);
    const maintTiers = buildTiers(lg.maintenanceTiers);
    return {
        displayName:     invegaSustennaJson.displayName,
        earlyGuidance:   invegaSustennaJson.earlyGuidance,
        getLateGuidance: ({ daysSince, variant, dose }) =>
            variant === 'initiation'
                ? resolveLateTier(initTiers, daysSince!)
                : resolveLateTier(maintTiers, daysSince!, dose),
    };
}

function buildInvegaHafyera(): CoreDef {
    const { earlyMaxDays, onTimeMaxDays } =
        invegaHafyeraJson.lateGuidance as unknown as { earlyMaxDays: number; onTimeMaxDays: number };
    return {
        displayName:     invegaHafyeraJson.displayName,
        earlyGuidance:   invegaHafyeraJson.earlyGuidance,
        getLateGuidance: ({ daysSince }): CategoricalGuidanceResult => {
            if (daysSince! <= earlyMaxDays)  return 'early';
            if (daysSince! <= onTimeMaxDays) return 'on-time';
            return 'consult';
        },
    };
}

function buildAbilifyMaintena(): CoreDef {
    const lg = abilifyMaintenaJson.lateGuidance as unknown as {
        notDueGuidance:     RawGuidance;
        routineGuidance:    RawGuidance;
        reinitiateGuidance: RawGuidance;
        priorDoseGroups:    { priorDoses: string; routineMaxWeeks: number }[];
    };
    const notDue     = buildGuidance(lg.notDueGuidance);
    const routine    = buildGuidance(lg.routineGuidance);
    const reinitiate = buildGuidance(lg.reinitiateGuidance);
    const groups     = lg.priorDoseGroups;
    return {
        displayName:     abilifyMaintenaJson.displayName,
        earlyGuidance:   abilifyMaintenaJson.earlyGuidance,
        getLateGuidance: ({ weeksSince, variant }) => {
            if (weeksSince! < 4) return notDue;
            const group = groups.find(g => g.priorDoses === variant)!;
            return weeksSince! <= group.routineMaxWeeks ? routine : reinitiate;
        },
    };
}

function buildAristada(): CoreDef {
    const lg = aristadaJson.lateGuidance as unknown as {
        notDueBeforeDays: number;
        notDueMessage:    string;
        doseConfigs: {
            dose:  string;
            tiers: { maxDays: number | null; supplementation: string; providerNotification: string }[];
        }[];
    };
    const notDueBeforeDays = lg.notDueBeforeDays;
    const notDueMessage    = lg.notDueMessage;
    const doseConfigs      = lg.doseConfigs.map(dc => ({
        dose:  dc.dose,
        tiers: dc.tiers.map(t => ({
            maxDays:              days(t.maxDays),
            supplementation:      t.supplementation,
            providerNotification: t.providerNotification,
        })),
    }));
    return {
        displayName:     aristadaJson.displayName,
        earlyGuidance:   aristadaJson.earlyGuidance,
        getLateGuidance: ({ daysSince, dose }): SupplementalGuidanceResult => {
            if (daysSince! < notDueBeforeDays) return { notDue: true, message: notDueMessage };
            const config = doseConfigs.find(c => c.dose === dose)!;
            const tier   = config.tiers.find(t => daysSince! <= t.maxDays) ?? config.tiers[config.tiers.length - 1];
            return { notDue: false, supplementation: tier.supplementation, providerNotification: tier.providerNotification };
        },
    };
}

// ─── Form spec helper ─────────────────────────────────────────────────────────

/**
 * Derives lateFieldsGroup, subFieldGroups, formFieldIds, and subGroupSelectorId
 * from a FormGroupSpec array — the single source of truth for form structure.
 */
function withGroups(spec: FormGroupSpec[]) {
    const firstField = spec[0].fields[0];
    const subGroupSelectorId =
        firstField.type === 'select' && 'onchange' in firstField && firstField.onchange
            ? firstField.id : undefined;
    return {
        formGroupsSpec:    spec,
        lateFieldsGroup:   spec[0].groupId,
        subFieldGroups:    spec.length > 1 ? spec.slice(1).map(g => g.groupId) : undefined,
        formFieldIds:      spec.flatMap(g => g.fields.map(f => f.id)),
        subGroupSelectorId,
    };
}

// ─── Standard definition builder ────────────────────────────────────────────

/**
 * Reads optgroupLabel, renderType, formGroupsSpec, and lateSpec from a JSON
 * file and returns everything except displayName, earlyGuidance, getLateGuidance.
 * Used by all meds except invega_sustenna (which has custom sub-group branching).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStandardDef(json: any): Omit<MedDefinition, 'displayName' | 'earlyGuidance' | 'getLateGuidance'> {
    const spec: LateSpec = json.lateSpec;
    const optionsByField: Record<string, SelectOption[]> = Object.fromEntries(
        (json.formGroupsSpec as FormGroupSpec[])
            .flatMap((g: FormGroupSpec) => g.fields)
            .filter((f: FieldSpec): f is Extract<FieldSpec, { type: 'select' }> => f.type === 'select')
            .map((f: Extract<FieldSpec, { type: 'select' }>) => [f.id, f.options]),
    );
    return {
        optgroupLabel: json.optgroupLabel as string,
        renderType:    json.renderType    as RenderType,
        ...withGroups(json.formGroupsSpec as FormGroupSpec[]),
        validateLate: (ctx) => {
            for (const { id, message } of spec.requiredFields) {
                if (!ctx[id]) return message;
            }
            return null;
        },
        buildLateParams: (ctx) => {
            const daysSince = daysSinceDate(ctx[spec.dateField]);
            const params: LateGuidanceParams = { daysSince };
            if (spec.paramKey && spec.paramField) params[spec.paramKey] = ctx[spec.paramField];
            if (spec.includeWeeksSince) params.weeksSince = Math.floor(daysSince / 7);
            return params;
        },
        buildLateInfoRows: (ctx, daysSince) => (spec.infoRows as InfoRowSpec[]).map((row): [string, string] => {
            if ('field' in row) {
                const raw = ctx[row.field];
                const value = row.format === 'date'
                    ? formatDate(raw)
                    : (optionsByField[row.field]?.find(o => o.value === raw)?.label ?? raw);
                return [row.label, value];
            }
            const time = row.format === 'days-months'
                ? `${daysSince} days (approximately ${Math.floor(daysSince / 30.44)} months)`
                : row.format === 'days-weeks-months'
                    ? `${daysSince} days (${formatWeeksAndDays(daysSince)} or approximately ${Math.floor(daysSince / 30.44)} months)`
                    : `${daysSince} days (${formatWeeksAndDays(daysSince)})`;
            return [row.label, time];
        }),
    };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> = {

    invega_sustenna: {
        ...buildInvegaSustenna(),
        optgroupLabel: invegaSustennaJson.optgroupLabel,
        renderType:    invegaSustennaJson.renderType as RenderType,
        ...withGroups(invegaSustennaJson.formGroupsSpec as unknown as FormGroupSpec[]),
        handleSubGroupChange: (invegaType, show, hide, clear) => {
            if (invegaType === 'initiation') {
                show('first-injection-date');
                hide('maintenance-fields');
                clear('last-maintenance');
                clear('maintenance-dose');
            } else if (invegaType === 'maintenance') {
                hide('first-injection-date');
                show('maintenance-fields');
                clear('first-injection');
            } else {
                hide('first-injection-date');
                hide('maintenance-fields');
                clear('first-injection');
                clear('last-maintenance');
                clear('maintenance-dose');
            }
        },
        validateLate: (ctx) => {
            if (!ctx['invega-type']) return 'Please select the Invega Sustenna injection type.';
            if (ctx['invega-type'] === 'initiation' && !ctx['first-injection'])
                return 'Please enter the date of first (234 mg) injection.';
            if (ctx['invega-type'] === 'maintenance' && !ctx['last-maintenance'])
                return 'Please enter the date of last maintenance injection.';
            if (ctx['invega-type'] === 'maintenance' && !ctx['maintenance-dose'])
                return 'Please select the monthly maintenance injection dose.';
            return null;
        },
        buildLateParams: (ctx) => ctx['invega-type'] === 'initiation'
            ? { daysSince: daysSinceDate(ctx['first-injection']), variant: 'initiation' }
            : { daysSince: daysSinceDate(ctx['last-maintenance']), variant: 'maintenance', dose: ctx['maintenance-dose'] },
        buildLateInfoRows: (ctx, daysSince) => ctx['invega-type'] === 'initiation'
            ? [
                ['Injection Type:',                        'Missed/delayed 2nd initiation (156 mg) injection'],
                ['Date of first (234 mg) injection:',      formatDate(ctx['first-injection'])],
                ['Time since first (234 mg) injection:',   `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
            ]
            : [
                ['Injection Type:',                        'Missed/delayed monthly maintenance injection'],
                ['Date of last maintenance injection:',    formatDate(ctx['last-maintenance'])],
                ['Monthly maintenance dose:',              ctx['maintenance-dose'] === '156-or-less' ? '156 mg or less' : '234 mg'],
                ['Time since last maintenance injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
            ],
    },

    invega_trinza: {
        ...buildFromTiers(invegaTrinzaJson),
        ...buildStandardDef(invegaTrinzaJson),
    },

    invega_hafyera: {
        ...buildInvegaHafyera(),
        ...buildStandardDef(invegaHafyeraJson),
    },

    abilify_maintena: {
        ...buildAbilifyMaintena(),
        ...buildStandardDef(abilifyMaintenaJson),
    },

    aristada: {
        ...buildAristada(),
        ...buildStandardDef(aristadaJson),
    },

    uzedy: {
        ...buildFromTiers(uzedyJson),
        ...buildStandardDef(uzedyJson),
    },

    haloperidol_decanoate: {
        ...buildFromPriorDoseGroups(haloperidolDecJson),
        ...buildStandardDef(haloperidolDecJson),
    },

    fluphenazine_decanoate: {
        ...buildFromPriorDoseGroups(fluphenazineDecJson),
        ...buildStandardDef(fluphenazineDecJson),
    },

    vivitrol: {
        ...buildFromKeyedTiers(vivitrolJson),
        ...buildStandardDef(vivitrolJson),
    },

    sublocade: {
        ...buildFromKeyedTiers(sublocadeJson),
        ...buildStandardDef(sublocadeJson),
    },

    brixadi: {
        ...buildFromKeyedTiers(brixadiJson),
        ...buildStandardDef(brixadiJson),
    },
};

export const MEDICATION_DISPLAY_NAMES: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.displayName])) as Record<MedicationKey, string>;

export const EARLY_GUIDANCE_CONTENT: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.earlyGuidance])) as Record<MedicationKey, string>;
