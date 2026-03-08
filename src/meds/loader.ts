/**
 * src/meds/loader.ts
 *
 * Parses each medication JSON file into a MedDefinition with a getLateGuidance()
 * closure. MED_REGISTRY is the single place that knows about specific meds;
 * all code outside src/meds works through the registry generically.
 */

import type {
    MedicationKey,
    LateTier,
    GuidanceResult,
    AristadaGuidanceResult,
    HafyeraCategory,
    SubmitContext,
} from '../types';

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

export type LateGuidanceOutput = GuidanceResult | AristadaGuidanceResult | HafyeraCategory;

export type RenderType = 'three-part' | 'hafyera-category' | 'aristada';

export interface MedDefinition {
    displayName:   string;
    earlyGuidance: string;
    getLateGuidance(params: LateGuidanceParams): LateGuidanceOutput;

    // UI config: used by app.ts to generically handle form interaction
    lateFieldsGroup: string;
    subFieldGroups?: string[];   // extra groups to hide on medication change
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
        getLateGuidance: ({ daysSince }): HafyeraCategory => {
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
        getLateGuidance: ({ daysSince, dose }): AristadaGuidanceResult => {
            if (daysSince! < notDueBeforeDays) return { notDue: true, message: notDueMessage };
            const config = doseConfigs.find(c => c.dose === dose)!;
            const tier   = config.tiers.find(t => daysSince! <= t.maxDays) ?? config.tiers[config.tiers.length - 1];
            return { notDue: false, supplementation: tier.supplementation, providerNotification: tier.providerNotification };
        },
    };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> = {

    invega_sustenna: {
        ...buildInvegaSustenna(),
        lateFieldsGroup:  'invega-sustenna-options',
        subFieldGroups:   ['first-injection-date', 'maintenance-fields'],
        renderType:       'three-part',
        formFieldIds:     ['invega-type', 'first-injection', 'last-maintenance', 'maintenance-dose'],
        subGroupSelectorId: 'invega-type',
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
        lateFieldsGroup: 'trinza-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-trinza', 'trinza-dose'],
        validateLate: (ctx) => {
            if (!ctx['last-trinza']) return 'Please enter the date of last Trinza injection.';
            if (!ctx['trinza-dose']) return 'Please select the Trinza injection dose.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-trinza']), dose: ctx['trinza-dose'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last Trinza injection:',    formatDate(ctx['last-trinza'])],
            ['Trinza injection dose:',            `${ctx['trinza-dose']} mg`],
            ['Time since last Trinza injection:', `${daysSince} days (approximately ${Math.floor(daysSince / 30.44)} months)`],
        ],
    },

    invega_hafyera: {
        ...buildInvegaHafyera(),
        lateFieldsGroup: 'hafyera-fields',
        renderType:      'hafyera-category',
        formFieldIds:    ['last-hafyera'],
        validateLate:      (ctx) => ctx['last-hafyera'] ? null : 'Please enter the date of last Hafyera injection.',
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-hafyera']) }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last Hafyera injection:', formatDate(ctx['last-hafyera'])],
            ['Time since last injection:',      `${daysSince} days (${formatWeeksAndDays(daysSince)} or approximately ${Math.floor(daysSince / 30.44)} months)`],
        ],
    },

    abilify_maintena: {
        ...buildAbilifyMaintena(),
        lateFieldsGroup: 'abilify-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-abilify', 'abilify-doses'],
        validateLate: (ctx) => {
            if (!ctx['last-abilify'])  return 'Please enter the date of last Abilify Maintena injection.';
            if (!ctx['abilify-doses']) return 'Please select the number of prior consecutive monthly injections.';
            return null;
        },
        buildLateParams: (ctx) => {
            const daysSince = daysSinceDate(ctx['last-abilify']);
            return { daysSince, weeksSince: Math.floor(daysSince / 7), variant: ctx['abilify-doses'] };
        },
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last injection:',    formatDate(ctx['last-abilify'])],
            ['Prior consecutive doses:',   ctx['abilify-doses'] === '1-2' ? '1 or 2 monthly doses' : '3 or more monthly doses'],
            ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    aristada: {
        ...buildAristada(),
        lateFieldsGroup: 'aristada-fields',
        renderType:      'aristada',
        formFieldIds:    ['last-aristada', 'aristada-dose'],
        validateLate: (ctx) => {
            if (!ctx['last-aristada']) return 'Please enter the date of last Aristada injection.';
            if (!ctx['aristada-dose']) return 'Please select the dose of last Aristada injection.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-aristada']), dose: ctx['aristada-dose'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last injection:',    formatDate(ctx['last-aristada'])],
            ['Dose of last injection:',    `${ctx['aristada-dose']} mg`],
            ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    uzedy: {
        ...buildFromTiers(uzedyJson),
        lateFieldsGroup: 'uzedy-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-uzedy', 'uzedy-dose'],
        validateLate: (ctx) => {
            if (!ctx['last-uzedy']) return 'Please enter the date of last Uzedy injection.';
            if (!ctx['uzedy-dose']) return 'Please select the Uzedy maintenance dose.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-uzedy']), dose: ctx['uzedy-dose'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last injection:',    formatDate(ctx['last-uzedy'])],
            ['Uzedy maintenance dose:',    ctx['uzedy-dose'] === '150-or-less' ? '150 mg or less' : '200 mg or more'],
            ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    haloperidol_decanoate: {
        ...buildFromPriorDoseGroups(haloperidolDecJson),
        lateFieldsGroup: 'haloperidol-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-haloperidol', 'haloperidol-prior-doses'],
        validateLate: (ctx) => {
            if (!ctx['last-haloperidol'])        return 'Please enter the date of last Haloperidol Decanoate injection.';
            if (!ctx['haloperidol-prior-doses']) return 'Please select the number of prior Haloperidol Decanoate injections.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-haloperidol']), variant: ctx['haloperidol-prior-doses'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last injection:',        formatDate(ctx['last-haloperidol'])],
            ['Prior consecutive injections:',  ctx['haloperidol-prior-doses'] === '1-3' ? '1\u20133 monthly injections' : '4 or more monthly injections'],
            ['Time since last injection:',     `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    fluphenazine_decanoate: {
        ...buildFromPriorDoseGroups(fluphenazineDecJson),
        lateFieldsGroup: 'fluphenazine-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-fluphenazine', 'fluphenazine-prior-doses'],
        validateLate: (ctx) => {
            if (!ctx['last-fluphenazine'])        return 'Please enter the date of last Fluphenazine Decanoate injection.';
            if (!ctx['fluphenazine-prior-doses']) return 'Please select the number of prior Fluphenazine Decanoate injections.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-fluphenazine']), variant: ctx['fluphenazine-prior-doses'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Date of last injection:',        formatDate(ctx['last-fluphenazine'])],
            ['Prior consecutive injections:',  ctx['fluphenazine-prior-doses'] === '1-2' ? '1\u20132 injections' : '3 or more injections'],
            ['Time since last injection:',     `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    vivitrol: {
        ...buildFromKeyedTiers(vivitrolJson),
        lateFieldsGroup: 'vivitrol-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-vivitrol', 'vivitrol-indication'],
        validateLate: (ctx) => {
            if (!ctx['last-vivitrol'])       return 'Please enter the date of last Vivitrol injection.';
            if (!ctx['vivitrol-indication']) return 'Please select the Vivitrol indication.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-vivitrol']), variant: ctx['vivitrol-indication'] }),
        buildLateInfoRows: (ctx, daysSince) => [
            ['Indication:',                ctx['vivitrol-indication'] === 'oud' ? 'OUD treatment' : 'Overdose prevention (not OUD)'],
            ['Date of last injection:',    formatDate(ctx['last-vivitrol'])],
            ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
        ],
    },

    sublocade: {
        ...buildFromKeyedTiers(sublocadeJson),
        lateFieldsGroup: 'sublocade-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-sublocade', 'sublocade-type'],
        validateLate: (ctx) => {
            if (!ctx['last-sublocade']) return 'Please enter the date of last Sublocade injection.';
            if (!ctx['sublocade-type']) return 'Please select the Sublocade dose and history.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-sublocade']), variant: ctx['sublocade-type'] }),
        buildLateInfoRows: (ctx, daysSince) => {
            const typeLabels: Record<string, string> = {
                '100mg':             'Sublocade 100 mg',
                '300mg-few':         'Sublocade 300 mg (1\u20132 prior injections)',
                '300mg-established': 'Sublocade 300 mg (3+ prior injections)',
            };
            return [
                ['Dose/history:',              typeLabels[ctx['sublocade-type']] ?? ctx['sublocade-type']],
                ['Date of last injection:',    formatDate(ctx['last-sublocade'])],
                ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
            ];
        },
    },

    brixadi: {
        ...buildFromKeyedTiers(brixadiJson),
        lateFieldsGroup: 'brixadi-fields',
        renderType:      'three-part',
        formFieldIds:    ['last-brixadi', 'brixadi-type'],
        validateLate: (ctx) => {
            if (!ctx['last-brixadi']) return 'Please enter the date of last Brixadi injection.';
            if (!ctx['brixadi-type']) return 'Please select the Brixadi formulation and dose.';
            return null;
        },
        buildLateParams:   (ctx) => ({ daysSince: daysSinceDate(ctx['last-brixadi']), variant: ctx['brixadi-type'] }),
        buildLateInfoRows: (ctx, daysSince) => {
            const typeLabels: Record<string, string> = {
                'monthly-64':  'Monthly 64 mg',
                'monthly-96':  'Monthly 96 mg',
                'monthly-128': 'Monthly 128 mg',
                'weekly':      'Weekly 24 mg or 32 mg',
            };
            return [
                ['Formulation/dose:',          typeLabels[ctx['brixadi-type']] ?? ctx['brixadi-type']],
                ['Date of last injection:',    formatDate(ctx['last-brixadi'])],
                ['Time since last injection:', `${daysSince} days (${formatWeeksAndDays(daysSince)})`],
            ];
        },
    },
};

export const MEDICATION_DISPLAY_NAMES: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.displayName])) as Record<MedicationKey, string>;

export const EARLY_GUIDANCE_CONTENT: Record<MedicationKey, string> =
    Object.fromEntries(Object.entries(MED_REGISTRY).map(([k, v]) => [k, v.earlyGuidance])) as Record<MedicationKey, string>;
