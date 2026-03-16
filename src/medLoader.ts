import type { LateTier, GuidanceResult, SubmitContext } from './interfaces/guidance';
import type { MedicationKey, LateGuidanceParams, InfoRowSpec, LateSpec, SelectOption, FieldSpec, FormGroupSpec, MedDefinition, RawTier, CoreDef, VariantEntry, EarlyVariantDef } from './interfaces/med';
import { DAYS_PER_MONTH } from './interfaces/med';
import { daysSinceDate, formatDate, formatWeeksAndDays } from './utils';

// ─── JSON imports (all med files in ./meds/ loaded eagerly) ─────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MED_JSONS: any[] = Object.values(import.meta.glob('./meds/*.json', { eager: true, import: 'default' }));

// ─── Internal utilities ──────────────────────────────────────────────────────────────────

function days(n: number | null): number { return n === null ? Infinity : n; }

export function pluralDays(n: number): string {
    return n % 7 === 0 && n >= 7
        ? `${n / 7} week${n / 7 === 1 ? '' : 's'}`
        : `${n} day${n === 1 ? '' : 's'}`;
}

export function composeEarlyGuidance(daysBeforeDue: number | undefined, minDays: number | undefined, note: string | undefined): string {
    let core: string;
    if (daysBeforeDue != null && minDays != null) {
        core = `${pluralDays(daysBeforeDue)} before due date; no sooner than ${pluralDays(minDays)} after last injection`;
    } else if (daysBeforeDue != null) {
        core = `${pluralDays(daysBeforeDue)} before due date`;
    } else {
        core = `No sooner than ${pluralDays(minDays!)} after last injection`;
    }
    return note ? `${core}  \n*(${note})*` : core;
}


function buildTier(raw: RawTier): LateTier {
    const maxDays = days(raw['maxDays'] as number | null);
    if (raw['guidanceByDose'] != null || raw['guidanceByDoseRules'] != null) {
        return {
            type: 'dose-variant',
            maxDays,
            ...(raw['guidanceByDose'] != null ? { guidanceByDose: raw['guidanceByDose'] as Record<string, GuidanceResult> } : {}),
            ...(raw['guidanceByDoseRules'] != null ? {
                guidanceByDoseRules: raw['guidanceByDoseRules'] as { doses: string[]; guidance: GuidanceResult }[],
                ...(raw['defaultGuidance'] != null ? { defaultGuidance: raw['defaultGuidance'] as GuidanceResult } : {}),
            } : {}),
        };
    }
    return { type: 'static', maxDays, guidance: raw['guidance'] as GuidanceResult };
}

function buildTiers(raws: RawTier[]): LateTier[] { return raws.map(buildTier); }

/** Builds a variant→tiers map; entries with `sameAs` reuse another variant's built value (avoids duplication in JSON). */
function buildVariantMap<T>(variants: VariantEntry[], build: (tiers: RawTier[]) => T): Record<string, T> {
    const map: Record<string, T> = {};
    for (const v of variants) { if (v.tiers)  map[v.key] = build(v.tiers); }
    for (const v of variants) { if (v.sameAs) map[v.key] = map[v.sameAs]; }
    return map;
}

function resolveLateTier(tiers: LateTier[], daysSince: number, dose?: string): GuidanceResult {
    try {
        const tier = tiers.find(t => daysSince <= t.maxDays) ?? tiers[tiers.length - 1];
        if (tier.type === 'dose-variant') {
            if (tier.guidanceByDoseRules) {
                const matched = tier.guidanceByDoseRules.find(rule => dose != null && rule.doses.includes(dose));
                if (matched) return matched.guidance;
                if (tier.defaultGuidance) return tier.defaultGuidance;
                console.error(
                    '[resolveLateTier] Missing or unknown dose for rules:',
                    dose,
                    '— available:',
                    tier.guidanceByDoseRules.flatMap(r => r.doses),
                );
                return { idealSteps: [''] };
            }
            if (!tier.guidanceByDose || !dose || !(dose in tier.guidanceByDose)) {
                console.error('[resolveLateTier] Missing or unknown dose:', dose, '— available:', Object.keys(tier.guidanceByDose ?? {}));
                return { idealSteps: [''] };
            }
            return tier.guidanceByDose[dose!];
        }
        return tier.guidance;
    } catch (err) {
        console.error('[resolveLateTier] Failed to resolve tier for daysSince=%d dose=%s:', daysSince, dose, err);
        return { idealSteps: [''] };
    }
}

// ─── Core guidance logic (dispatches on late.kind) ─────────────────────────

type RawEarlyVariant = { key: string; minDays?: number; noGuidanceMessage?: string; sameAs?: string };

/** Builds the early variant map, resolving `sameAs` aliases. */
function buildEarlyVariantMap(variants: RawEarlyVariant[]): Record<string, EarlyVariantDef> {
    const map: Record<string, EarlyVariantDef> = {};
    for (const v of variants) {
        if (!v.sameAs) map[v.key] = { minDays: v.minDays, noGuidanceMessage: v.noGuidanceMessage };
    }
    for (const v of variants) {
        if (v.sameAs) map[v.key] = map[v.sameAs]!;
    }
    return map;
}

/** Builds the early-guidance portion of a CoreDef from `guidance.early` and optional `earlySpec`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEarlyFields(early: any, earlySpec: any): Omit<Partial<CoreDef>, 'earlyGuidance'> {
    const daysBeforeDue        = early?.daysBeforeDue        as number   | undefined;
    const minDays              = early?.minDays              as number   | undefined;
    const providerNotifications = early?.providerNotifications as string[] | undefined;
    const rawVariants          = early?.variants             as RawEarlyVariant[] | undefined;
    const paramField           = earlySpec?.paramField       as string   | undefined;
    const dateField            = earlySpec?.dateField        as string   | undefined;
    return {
        ...(daysBeforeDue != null          ? { earlyDaysBeforeDue:        daysBeforeDue                    } : {}),
        ...(minDays       != null          ? { earlyMinDays:              minDays                          } : {}),
        ...(providerNotifications?.length  ? { earlyProviderNotification: providerNotifications            } : {}),
        ...(rawVariants                    ? { earlyVariantMap:           buildEarlyVariantMap(rawVariants) } : {}),
        ...(paramField                     ? { earlyParamField: paramField, earlyDateField: dateField }      : {}),
    };
}

/** Builds the `getLateGuidance` closure from a pre-built tiers map. */
function buildLateGuidanceFn(tiersMap: Record<string, LateTier[]>): MedDefinition['getLateGuidance'] {
    return ({ daysSince, variant, dose }) => {
        // Use explicit variant if given; else fall back to dose key if it exists in the map
        // (e.g. Aristada doses "441"/"662" ARE variant keys; Uzedy doses "150-or-less" are not)
        const variantKey = variant ?? (dose != null && tiersMap[dose] ? dose : 'default');
        const tiers = tiersMap[variantKey];
        if (!tiers) throw new Error(`[getLateGuidance] Unknown variant key: "${variantKey}" — available: ${Object.keys(tiersMap).join(', ')}`);
        return resolveLateTier(tiers, daysSince!, dose);
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCoreDef(json: any): CoreDef {
    const lg         = json.guidance.late as Record<string, unknown>;
    const commonNotifs = json.guidance.shared?.providerNotifications as string[] | undefined;

    if (!lg['variants']) throw new Error(`No variants in late guidance for ${json.key}`);
    const tiersMap = buildVariantMap(lg['variants'] as VariantEntry[], buildTiers);

    const early = json.guidance.early;
    return {
        displayName:   json.displayName as string,
        earlyGuidance: composeEarlyGuidance(early?.daysBeforeDue, early?.minDays, early?.guidanceNote as string | undefined),
        ...buildEarlyFields(early, json.earlySpec),
        ...(commonNotifs?.length ? { commonProviderNotifications: commonNotifs } : {}),
        getLateGuidance: buildLateGuidanceFn(tiersMap),
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
        firstField.type === 'select' && firstField.onchange
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
function buildStandardDef(json: any): Omit<MedDefinition, 'displayName' | 'earlyGuidance' | 'earlyDaysBeforeDue' | 'earlyMinDays' | 'getLateGuidance'> {
    const formGroupsSpec = json.formGroupsSpec as FormGroupSpec[];
    const optionsByField: Record<string, SelectOption[]> = Object.fromEntries(
        formGroupsSpec.flatMap(g => g.fields)
            .filter((f): f is Extract<FieldSpec, { type: 'select' }> => f.type === 'select')
            .map(f => [f.id, f.options]),
    );
    const baseUI = {
        optgroupLabel: json.optgroupLabel as string,
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
        const displayDays  = Math.max(0, daysSince);  // clamp future dates to 0
        const approxMonths = Math.round(displayDays / DAYS_PER_MONTH);
        const bareLabel    = `${displayDays} day${displayDays !== 1 ? 's' : ''}`;
        const weeksBreak   = displayDays > 0 ? formatWeeksAndDays(displayDays) : null;
        const t = row.format === 'days-months'
            ? `${bareLabel}${approxMonths > 0 ? ` (approximately ${approxMonths} months)` : ''}`
            : row.format === 'days-weeks-months'
                ? `${bareLabel}${weeksBreak && weeksBreak !== bareLabel ? ` (${weeksBreak})` : ''}`
                : `${bareLabel}${weeksBreak && weeksBreak !== bareLabel ? ` (${weeksBreak})` : ''}`;
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
                const failBase   = requiredBase.find(({ id }) => !ctx[id]);
                if (failBase) return failBase.message;
                return branches[ctx[branchField]]?.requiredFields.find(({ id }) => !ctx[id])?.message ?? null;
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
        validateLate: (ctx) =>
            lateSpec.requiredFields.find(({ id }) => !ctx[id])?.message ?? null,
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

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.fromEntries(ALL_MED_JSONS.flatMap((json: any) => {
        try {
            return [[json.key, { ...buildCoreDef(json), ...buildStandardDef(json) } as MedDefinition]];
        } catch (err) {
            console.error('[MED_REGISTRY] Failed to build definition for med:', json?.key ?? '(unknown)', err);
            return [];
        }
    })) as Record<MedicationKey, MedDefinition>;
