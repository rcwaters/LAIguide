import type { LateTier, GuidanceResult, SupplementalGuidanceResult, SubmitContext } from './interfaces/guidance';
import type { MedicationKey, LateGuidanceParams, RenderType, InfoRowSpec, LateSpec, SelectOption, FieldSpec, FormGroupSpec, MedDefinition, RawTier, CoreDef } from './interfaces/med';
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

type VariantEntry = { key: string; tiers?: RawTier[]; sameAs?: string };
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCoreDef(json: any): CoreDef {
    const lg            = json.guidance.late              as Record<string, unknown>;
    const early         = json.guidance.early;
    const daysBeforeDue = early?.daysBeforeDue            as number | undefined;
    const minDays       = early?.minDays                  as number | undefined;
    const providerNotifications = early?.providerNotifications as string[] | undefined;
    const commonNotifs  = json.guidance.shared?.providerNotifications as string[] | undefined;
    const base = {
        displayName:   json.displayName as string,
        earlyGuidance: composeEarlyGuidance(daysBeforeDue, minDays, early?.guidanceNote as string | undefined),
        ...(daysBeforeDue != null           ? { earlyDaysBeforeDue:           daysBeforeDue         } : {}),
        ...(minDays       != null           ? { earlyMinDays:                  minDays               } : {}),
        ...(providerNotifications?.length    ? { earlyProviderNotification:     providerNotifications } : {}),
        ...(commonNotifs?.length             ? { commonProviderNotifications:   commonNotifs          } : {}),
    };

    if (lg['variants']) {
        // variants with a `sameAs` key reuse another variant's tiers (avoids duplication in JSON)
        const variants = lg['variants'] as VariantEntry[];

        const notDueCfg = lg['notDue'] as { beforeDays: number; message: string } | undefined;
        if (notDueCfg) {
            const notDueBeforeDays = notDueCfg.beforeDays;
            const notDueMessage    = notDueCfg.message;
            type SupplementalTier = { maxDays: number; supplementation?: string; providerNotifications?: string[] };
            const buildSupplementalTiers = (raws: RawTier[]): SupplementalTier[] => raws.map(t => ({
                maxDays:               days(t['maxDays'] as number | null),
                supplementation:       t['supplementation']       as string | undefined,
                providerNotifications: t['providerNotifications'] as string[] | undefined,
            }));
            const tiersMap = buildVariantMap(variants, buildSupplementalTiers);

            return { ...base, getLateGuidance: ({ daysSince, variant, dose }): SupplementalGuidanceResult => {
                if (daysSince! < notDueBeforeDays) return { notDue: true, message: notDueMessage };

                const variantKey = variant ?? dose;
                const config = variantKey ? tiersMap[variantKey] : undefined;
                if (!config) {
                    console.error('[getLateGuidance] Missing or unknown variant for supplementation tiers:', variantKey, '— available:', Object.keys(tiersMap));
                    return { notDue: false };
                }

                const tier = config.find(t => daysSince! <= t.maxDays) ?? config[config.length - 1];
                return { notDue: false, supplementation: tier.supplementation, providerNotifications: tier.providerNotifications };
            }};
        }

        const tiersMap = buildVariantMap(variants, buildTiers);
        return { ...base, getLateGuidance: ({ daysSince, variant, dose }) => resolveLateTier(tiersMap[variant!], daysSince!, dose) };
    }

    if (lg['tiers']) {
        const tiers = buildTiers(lg['tiers'] as RawTier[]);
        return { ...base, getLateGuidance: ({ daysSince, dose }) => resolveLateTier(tiers, daysSince!, dose) };
    }

    throw new Error(`No tiers or variants in late guidance for ${json.key}`);
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
