/**
 * src/meds/loader.ts
 *
 * Parses each medication JSON file into a MedDefinition with a getLateGuidance()
 * closure. MED_REGISTRY is the single place that knows about specific meds;
 * all code outside src/meds works through the registry generically.
 */

import type { LateTier, GuidanceResult, CategoricalGuidanceResult, SupplementalGuidanceResult, SubmitContext } from '../types';
import type { MedicationKey, LateGuidanceParams, RenderType, InfoRowSpec, LateSpec, SelectOption, FieldSpec, FormGroupSpec, MedDefinition } from './types';
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

// ─── Private interfaces ──────────────────────────────────────────────────────

interface RawGuidance {
    idealSteps:           string;
    pragmaticVariations:  string;
    providerNotification: string;
}

type RawTier = Record<string, unknown>;

// ─── Internal utilities ──────────────────────────────────────────────────────────────────

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

// ─── Core guidance logic (dispatches on lateGuidance.kind) ───────────────────

type CoreDef = Pick<MedDefinition, 'displayName' | 'earlyGuidance' | 'getLateGuidance'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCoreDef(json: any): CoreDef {
    const lg   = json.lateGuidance as Record<string, unknown>;
    const base = { displayName: json.displayName as string, earlyGuidance: json.earlyGuidance as string };

    switch (lg['kind']) {

        case 'tiers': {
            const tiers = buildTiers(lg['tiers'] as RawTier[]);
            return { ...base, getLateGuidance: ({ daysSince, dose }) => resolveLateTier(tiers, daysSince!, dose) };
        }

        case 'prior-dose-tier-groups': {
            const groups = (lg['priorDoseGroups'] as { priorDoses: string; tiers: RawTier[] }[])
                .map(pg => ({ priorDoses: pg.priorDoses, tiers: buildTiers(pg.tiers) }));
            return { ...base, getLateGuidance: ({ daysSince, variant }) => {
                const group = groups.find(g => g.priorDoses === variant)!;
                return resolveLateTier(group.tiers, daysSince!);
            }};
        }

        case 'keyed-tiers': {
            const tiersMap: Record<string, LateTier[]> = {};
            for (const v of (lg['variants'] as { key: string; tiers: RawTier[] }[])) tiersMap[v.key] = buildTiers(v.tiers);
            return { ...base, getLateGuidance: ({ daysSince, variant }) => resolveLateTier(tiersMap[variant!], daysSince!) };
        }

        case 'invega-sustenna': {
            const initTiers  = buildTiers(lg['initiationTiers']  as RawTier[]);
            const maintTiers = buildTiers(lg['maintenanceTiers'] as RawTier[]);
            return { ...base, getLateGuidance: ({ daysSince, variant, dose }) =>
                variant === 'initiation'
                    ? resolveLateTier(initTiers, daysSince!)
                    : resolveLateTier(maintTiers, daysSince!, dose),
            };
        }

        case 'hafyera': {
            const earlyMaxDays  = lg['earlyMaxDays']  as number;
            const onTimeMaxDays = lg['onTimeMaxDays'] as number;
            return { ...base, getLateGuidance: ({ daysSince }): CategoricalGuidanceResult => {
                if (daysSince! <= earlyMaxDays)  return 'early';
                if (daysSince! <= onTimeMaxDays) return 'on-time';
                return 'consult';
            }};
        }

        case 'abilify': {
            const notDue     = buildGuidance(lg['notDueGuidance']     as RawGuidance);
            const routine    = buildGuidance(lg['routineGuidance']    as RawGuidance);
            const reinitiate = buildGuidance(lg['reinitiateGuidance'] as RawGuidance);
            const groups     = lg['priorDoseGroups'] as { priorDoses: string; routineMaxWeeks: number }[];
            return { ...base, getLateGuidance: ({ weeksSince, variant }) => {
                if (weeksSince! < 4) return notDue;
                const group = groups.find(g => g.priorDoses === variant)!;
                return weeksSince! <= group.routineMaxWeeks ? routine : reinitiate;
            }};
        }

        case 'aristada': {
            const notDueBeforeDays = lg['notDueBeforeDays'] as number;
            const notDueMessage    = lg['notDueMessage']    as string;
            const doseConfigs = (lg['doseConfigs'] as { dose: string; tiers: { maxDays: number | null; supplementation: string; providerNotification: string }[] }[])
                .map(dc => ({ dose: dc.dose, tiers: dc.tiers.map(t => ({ maxDays: days(t.maxDays), supplementation: t.supplementation, providerNotification: t.providerNotification })) }));
            return { ...base, getLateGuidance: ({ daysSince, dose }): SupplementalGuidanceResult => {
                if (daysSince! < notDueBeforeDays) return { notDue: true, message: notDueMessage };
                const config = doseConfigs.find(c => c.dose === dose)!;
                const tier   = config.tiers.find(t => daysSince! <= t.maxDays) ?? config.tiers[config.tiers.length - 1];
                return { notDue: false, supplementation: tier.supplementation, providerNotification: tier.providerNotification };
            }};
        }

        default:
            throw new Error(`Unknown lateGuidance kind: "${lg['kind']}" in ${json.key}`);
    }
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

// ─── Standard + branched definition builder ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStandardDef(json: any): Omit<MedDefinition, 'displayName' | 'earlyGuidance' | 'getLateGuidance'> {
    const formGroupsSpec = json.formGroupsSpec as FormGroupSpec[];
    const optionsByField: Record<string, SelectOption[]> = Object.fromEntries(
        formGroupsSpec.flatMap(g => g.fields)
            .filter((f): f is Extract<FieldSpec, { type: 'select' }> => f.type === 'select')
            .map(f => [f.id, f.options]),
    );
    const baseUI = {
        optgroupLabel: json.optgroupLabel as string,
        renderType:    json.renderType    as RenderType,
        ...withGroups(formGroupsSpec),
    };

    function renderInfoRow(row: InfoRowSpec, ctx: SubmitContext, daysSince: number): [string, string] {
        if ('value' in row) return [row.label, row.value];
        if ('field' in row) {
            const raw = ctx[row.field];
            return [row.label, row.format === 'date'
                ? formatDate(raw)
                : (optionsByField[row.field]?.find(o => o.value === raw)?.label ?? raw)];
        }
        const t = row.format === 'days-months'
            ? `${daysSince} days (approximately ${Math.floor(daysSince / 30.44)} months)`
            : row.format === 'days-weeks-months'
                ? `${daysSince} days (${formatWeeksAndDays(daysSince)} or approximately ${Math.floor(daysSince / 30.44)} months)`
                : `${daysSince} days (${formatWeeksAndDays(daysSince)})`;
        return [row.label, t];
    }

    // Branched lateSpec — used by invega_sustenna (branches on sub-group selector value)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec = json.lateSpec as any;
    if (spec.kind === 'branched') {
        type Branch = {
            requiredFields: { id: string; message: string }[];
            dateField: string; showGroup: string;
            params?: Record<string, string>; paramKey?: string; paramField?: string;
            infoRows: InfoRowSpec[];
        };
        const branchField   = spec.branchField  as string;
        const requiredBase  = spec.requiredBase  as { id: string; message: string }[];
        const branches      = spec.branches      as Record<string, Branch>;
        const subGroupSpecs = formGroupsSpec.slice(1);

        return {
            ...baseUI,
            handleSubGroupChange: (branchVal, show, hide, clear) => {
                const branch = branches[branchVal];
                for (const g of subGroupSpecs) {
                    if (branch?.showGroup === g.groupId) { show(g.groupId); }
                    else { hide(g.groupId); g.fields.forEach(f => clear(f.id)); }
                }
            },
            validateLate: (ctx) => {
                for (const { id, message } of requiredBase) if (!ctx[id]) return message;
                for (const { id, message } of (branches[ctx[branchField]]?.requiredFields ?? [])) if (!ctx[id]) return message;
                return null;
            },
            buildLateParams: (ctx) => {
                const branch    = branches[ctx[branchField]];
                const daysSince = daysSinceDate(ctx[branch.dateField]);
                const params: LateGuidanceParams = { daysSince, ...branch.params };
                if (branch.paramKey && branch.paramField) params[branch.paramKey as 'dose' | 'variant'] = ctx[branch.paramField];
                return params;
            },
            buildLateInfoRows: (ctx, daysSince) =>
                branches[ctx[branchField]].infoRows.map(row => renderInfoRow(row, ctx, daysSince)),
        };
    }

    // Standard (single-path) lateSpec
    const lateSpec = spec as LateSpec;
    return {
        ...baseUI,
        validateLate: (ctx) => {
            for (const { id, message } of lateSpec.requiredFields) if (!ctx[id]) return message;
            return null;
        },
        buildLateParams: (ctx) => {
            const daysSince = daysSinceDate(ctx[lateSpec.dateField]);
            const params: LateGuidanceParams = { daysSince };
            if (lateSpec.paramKey && lateSpec.paramField) params[lateSpec.paramKey] = ctx[lateSpec.paramField];
            if (lateSpec.includeWeeksSince) params.weeksSince = Math.floor(daysSince / 7);
            return params;
        },
        buildLateInfoRows: (ctx, daysSince) => lateSpec.infoRows.map(row => renderInfoRow(row, ctx, daysSince)),
    };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMedDef(json: any): MedDefinition {
    return { ...buildCoreDef(json), ...buildStandardDef(json) } as MedDefinition;
}

const ALL_MED_JSONS = [
    invegaSustennaJson, invegaTrinzaJson, invegaHafyeraJson,
    abilifyMaintenaJson, aristadaJson, uzedyJson,
    haloperidolDecJson, fluphenazineDecJson,
    vivitrolJson, sublocadeJson, brixadiJson,
];

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> =
    Object.fromEntries(ALL_MED_JSONS.map(json => [json.key, buildMedDef(json)])) as Record<MedicationKey, MedDefinition>;
