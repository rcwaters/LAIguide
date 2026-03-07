import type {
    MedicationKey,
    LateTier,
    AristadaDoseConfig,
    AbilifyPriorDoseGroup,
    GuidanceResult,
} from './types';

// ─── Display Names ────────────────────────────────────────────────────────────

export const MEDICATION_DISPLAY_NAMES: Record<MedicationKey, string> = {
    invega_sustenna:        'Invega Sustenna (paliperidone palmitate)',
    invega_trinza:          'Invega Trinza (paliperidone palmitate 3-month)',
    invega_hafyera:         'Invega Hafyera (paliperidone palmitate 6-month)',
    abilify_maintena:       'Abilify Maintena (aripiprazole)',
    aristada:               'Aristada (aripiprazole lauroxil)',
    uzedy:                  'Uzedy (risperidone subcutaneous)',
    haloperidol_decanoate:  'Haloperidol Decanoate (Haldol Dec)',
    fluphenazine_decanoate: 'Fluphenazine Decanoate (formerly Prolixin Dec)',
    vivitrol:               'Vivitrol (naltrexone)',
    sublocade:              'Sublocade (buprenorphine)',
    brixadi:                'Brixadi (buprenorphine)',
};

// ─── Early Guidance ───────────────────────────────────────────────────────────

export const EARLY_GUIDANCE_CONTENT: Record<MedicationKey, string> = {
    invega_sustenna:        '1 week before due date<br><em>(Note: after completing full initiation process)</em>',
    invega_trinza:          '2 weeks before due date',
    invega_hafyera:         '2 weeks before due date',
    abilify_maintena:       'No sooner than 26 days after last injection',
    aristada:               '1 week before due date',
    uzedy:                  '3 days before due date<br><em>(DESC created guidance)</em>',
    haloperidol_decanoate:  '3 days before due date<br><em>(DESC created guidance)</em>',
    fluphenazine_decanoate: '3 days before due date<br><em>(DESC created guidance)</em>',
    vivitrol:               'No sooner than 3 weeks after last injection',
    sublocade:              'No sooner than 3 weeks after last injection<br><em>(This may be given earlier with provider approval)</em>',
    brixadi:                'No sooner than 3 weeks after last injection<br><em>(This may be given earlier with provider approval)</em>',
};

// ─── Invega Sustenna — Initiation (days since first 234 mg injection) ─────────

export const INVEGA_INITIATION_TIERS: LateTier[] = [
    {
        type: 'static',
        maxDays: 12,
        guidance: {
            idealSteps:           '<p>The 156 mg is either not due or not significantly overdue. Proceed with original plans and orders.</p>',
            pragmaticVariations:  '<p>No variations needed - proceed with standard protocol.</p>',
            providerNotification: '<p>Only if questions remain</p>',
        },
    },
    {
        type: 'static',
        maxDays: 28,
        guidance: {
            idealSteps: `<p>(1) Administer 156 mg (in deltoid ideally).</p>
                         <p>(2) Arrange for a 117 mg injection 5 weeks after the first (234 mg) injection, regardless of when the 156 mg injection (in step 1) is administered</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection in gluteal muscle if patient strongly prefers.</p>',
            providerNotification: '<p><strong>Post-injection (156 mg):</strong> Notify provider of the situation and need to order a 117 mg injection if not already done.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 49,
        guidance: {
            idealSteps: `<p>(1) Administer 156 mg (in deltoid ideally).</p>
                         <p>(2) Arrange for a 2nd 156 mg injection (in deltoid ideally) 1 week after step 1.</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection in gluteal muscle if patient strongly prefers.</p>',
            providerNotification: '<p><strong>Post-injection (1st 156 mg):</strong> Notify provider of the situation and need to order a 2nd 156 mg injection if not already done.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 180,
        guidance: {
            idealSteps: `<p>(1) Restart initiation: Administer a 234 mg injection if available</p>
                         <p>(2) Arrange for a 156 mg injection 1 week after step 1.</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection at time of patient presentation if a 234 mg injection is not available and arrange for the patient to return in 1 week.</p>',
            providerNotification: '<p><strong>Post-injection:</strong> notify provider of situation and for orders and guidance on next steps</p>',
        },
    },
    {
        type: 'static',
        maxDays: Infinity,
        guidance: {
            idealSteps:           '<p>Consult provider to get orders to proceed</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p><strong>Before any injection:</strong> Consult provider</p>',
        },
    },
];

// ─── Invega Sustenna — Maintenance (days since last monthly dose) ─────────────

export const INVEGA_MAINTENANCE_TIERS: LateTier[] = [
    {
        type: 'static',
        maxDays: 27,
        guidance: {
            idealSteps:           '<p>The maintenance injection is not significantly overdue (less than 4 weeks since last injection). Proceed with administering the usual maintenance dose and continue with normal monthly schedule.</p>',
            pragmaticVariations:  '<p>No variations needed - proceed with standard protocol.</p>',
            providerNotification: '<p>No provider notification needed for routine administration.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 42,
        guidance: {
            idealSteps: `<p>(1) Administer usual Invega Sustenna dose.</p>
                         <p>(2) Arrange for next usual monthly maintenance dose = 4 weeks later.</p>`,
            pragmaticVariations:  '<p>No change from ideal steps</p>',
            providerNotification: '<p>No need</p>',
        },
    },
    {
        type: 'dose-variant',
        maxDays: 180,
        guidanceByDose: {
            '156-or-less': {
                idealSteps: `<p>(1) Administer usual maintenance dose.</p>
                             <p>(2) Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.</p>
                             <p>(3) Then resume usual monthly doses 4 weeks after step 2.</p>`,
                pragmaticVariations:  '<p>For step (2), ok if the 2nd usual maintenance dose happens anytime 1 week or beyond. Attempt to return to a monthly cycle after the 2nd usual maintenance dose.</p>',
                providerNotification: '<p><strong>Post-injection:</strong> Notify provider of the need to have a 2nd usual maintenance dose ordered.</p>',
            },
            '234': {
                idealSteps: `<p>(1) Administer 156 mg Invega Sustenna</p>
                             <p>(2) Arrange for another 156 mg injection to be administered 1 week later</p>
                             <p>(3) Then resume usual monthly doses with 234 mg at 4 weeks after step 2.</p>`,
                pragmaticVariations:  '<p>If a 156 mg Invega Sustenna injection is not available at the time the patient presents, give the 234 mg injection. Notify the provider to guide next steps.</p>',
                providerNotification: `<p><strong>Post-injection:</strong> Notify provider of the situation. If ideal steps are followed, a 2nd 156 mg injection may need to be ordered.</p>
                                       <p>If the pragmatic variation was followed, the provider will guide next steps.</p>`,
            },
        },
    },
    {
        type: 'static',
        maxDays: Infinity,
        guidance: {
            idealSteps:           '<p>Consult provider: reinitiation will need to happen</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p><strong>Before any injection:</strong> Consult provider</p>',
        },
    },
];

// ─── Invega Trinza (days since last Trinza injection) ─────────────────────────

export const INVEGA_TRINZA_TIERS: LateTier[] = [
    {
        type: 'static',
        maxDays: 89,
        guidance: {
            idealSteps:           '<p>Please refer to the early dosing guidance. The Trinza injection is not yet due or overdue.</p>',
            pragmaticVariations:  '<p>See early dosing guidance section.</p>',
            providerNotification: '<p>No provider notification needed.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 120,
        guidance: {
            idealSteps:           '<p>(1) Administer next usual Invega Trinza dose</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>No need but notify full care team of importance of avoiding missed doses of Trinza.</p>',
        },
    },
    {
        type: 'dose-variant',
        maxDays: 270,
        guidanceByDose: {
            '410': {
                idealSteps: `<p>(1) Do not administer Trinza dose</p>
                             <p>(2) Administer Invega <strong>Sustenna</strong> 117 mg</p>
                             <p>(3) Arrange for a 2nd Invega Sustenna 117 mg injection 7 days after step 2.</p>
                             <p>(4) Arrange for a 410 mg Invega <strong>Trinza</strong> injection 4 weeks after step 3.</p>`,
                pragmaticVariations:  '<p>None. Consult provider prior to deviating from ideal steps.</p>',
                providerNotification: '<p>Consult provider in all cases.</p>',
            },
            '546': {
                idealSteps: `<p>(1) Do not administer Trinza dose</p>
                             <p>(2) Administer Invega <strong>Sustenna</strong> 156 mg</p>
                             <p>(3) Arrange for a 2nd Invega Sustenna 156 mg injection 7 days after step 2.</p>
                             <p>(4) Arrange for the usual Invega <strong>Trinza</strong> injection 4 weeks after step 3.</p>`,
                pragmaticVariations:  '<p>None. Consult provider prior to deviating from ideal steps.</p>',
                providerNotification: '<p>Consult provider in all cases.</p>',
            },
            '819': {
                idealSteps: `<p>(1) Do not administer Trinza dose</p>
                             <p>(2) Administer Invega <strong>Sustenna</strong> 156 mg</p>
                             <p>(3) Arrange for a 2nd Invega Sustenna 156 mg injection 7 days after step 2.</p>
                             <p>(4) Arrange for the usual Invega <strong>Trinza</strong> injection 4 weeks after step 3.</p>`,
                pragmaticVariations:  '<p>None. Consult provider prior to deviating from ideal steps.</p>',
                providerNotification: '<p>Consult provider in all cases.</p>',
            },
        },
    },
    {
        type: 'static',
        maxDays: Infinity,
        guidance: {
            idealSteps:           '<p>Consult provider. Reinitiation is necessary</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>Consult provider in all cases</p>',
        },
    },
];

// ─── Invega Hafyera (day thresholds for category resolution) ──────────────────

export const HAFYERA_THRESHOLDS = {
    /** Days <= this are "early" (not yet overdue). */
    earlyMaxDays: 180,
    /** Days <= this are "on-time" (acceptable window). */
    onTimeMaxDays: 202,
    // Beyond onTimeMaxDays → 'consult'
} as const;

// ─── Abilify Maintena ─────────────────────────────────────────────────────────

export const ABILIFY_NOT_DUE_GUIDANCE: GuidanceResult = {
    idealSteps:           '<p>The Abilify Maintena injection is not due. Please consult guidance on early dosing.</p>',
    pragmaticVariations:  '<p>See early dosing guidance section.</p>',
    providerNotification: '<p>No provider notification needed.</p>',
};

export const ABILIFY_ROUTINE_GUIDANCE: GuidanceResult = {
    idealSteps: `<p>(1) Administer usual Abilify Maintena monthly dose</p>
                 <p>(2) Arrange for next usual monthly dose in 4 weeks</p>`,
    pragmaticVariations:  '<p>Same</p>',
    providerNotification: '<p>No need</p>',
};

export const ABILIFY_REINITIATE_GUIDANCE: GuidanceResult = {
    idealSteps: `<p>Re-initiate:</p>
                 <p>(1) Administer usual Abilify Maintena monthly dose</p>
                 <p>(2) Notify patient of the options recommended for reinitiation: either (a) receive a 2nd Abilify Maintena dose at the same time as the first (in step 1) or within days, or (b) resume oral aripiprazole (10-20 mg) for 14 days</p>`,
    pragmaticVariations:  '<p>If the patient is not able or likely to take oral aripiprazole or get a 2nd injection immediately, consult with provider about accelerating timing of next injection.</p>',
    providerNotification: '<p>Post-injection: notify provider of situation and need for either a 2nd immediate monthly injection or 14 days of oral aripiprazole.</p>',
};

/** Defines the routine window (in weeks) per prior-dose history. Beyond this → reinitiate. */
export const ABILIFY_PRIOR_DOSE_GROUPS: AbilifyPriorDoseGroup[] = [
    { priorDoses: '1-2', routineMaxWeeks: 5 },
    { priorDoses: '3+',  routineMaxWeeks: 6 },
];

// ─── Aristada (per-dose supplementation tiers, days since last injection) ──────

export const ARISTADA_NOT_DUE_BEFORE_DAYS = 28;

export const ARISTADA_NOT_DUE_MESSAGE =
    '<p>The Aristada injection is not yet due. Please consult the guidance on early dosing.</p>';

const ARISTADA_NO_SUPPLEMENTATION  = '<p>No supplementation required</p>';
const ARISTADA_SEVEN_DAY_SUPP      = '<p>Oral aripiprazole for 7 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
const ARISTADA_TWENTY_ONE_DAY_SUPP = '<p>Oral aripiprazole for 21 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
const ARISTADA_NO_NOTIFY           = '<p>No need</p>';
const ARISTADA_NOTIFY_PROVIDER     = '<p>Notify provider with patient preference for supplementation and to order medications</p>';

export const ARISTADA_DOSE_CONFIGS: AristadaDoseConfig[] = [
    {
        dose: '441',
        tiers: [
            { maxDays: 42,       supplementation: ARISTADA_NO_SUPPLEMENTATION,  providerNotification: ARISTADA_NO_NOTIFY       },
            { maxDays: 49,       supplementation: ARISTADA_SEVEN_DAY_SUPP,      providerNotification: ARISTADA_NOTIFY_PROVIDER },
            { maxDays: Infinity, supplementation: ARISTADA_TWENTY_ONE_DAY_SUPP, providerNotification: ARISTADA_NOTIFY_PROVIDER },
        ],
    },
    {
        dose: '662',
        tiers: [
            { maxDays: 56,       supplementation: ARISTADA_NO_SUPPLEMENTATION,  providerNotification: ARISTADA_NO_NOTIFY       },
            { maxDays: 84,       supplementation: ARISTADA_SEVEN_DAY_SUPP,      providerNotification: ARISTADA_NOTIFY_PROVIDER },
            { maxDays: Infinity, supplementation: ARISTADA_TWENTY_ONE_DAY_SUPP, providerNotification: ARISTADA_NOTIFY_PROVIDER },
        ],
    },
    {
        dose: '882',
        tiers: [
            { maxDays: 56,       supplementation: ARISTADA_NO_SUPPLEMENTATION,  providerNotification: ARISTADA_NO_NOTIFY       },
            { maxDays: 84,       supplementation: ARISTADA_SEVEN_DAY_SUPP,      providerNotification: ARISTADA_NOTIFY_PROVIDER },
            { maxDays: Infinity, supplementation: ARISTADA_TWENTY_ONE_DAY_SUPP, providerNotification: ARISTADA_NOTIFY_PROVIDER },
        ],
    },
    {
        dose: '1064',
        tiers: [
            { maxDays: 70,       supplementation: ARISTADA_NO_SUPPLEMENTATION,  providerNotification: ARISTADA_NO_NOTIFY       },
            { maxDays: 84,       supplementation: ARISTADA_SEVEN_DAY_SUPP,      providerNotification: ARISTADA_NOTIFY_PROVIDER },
            { maxDays: Infinity, supplementation: ARISTADA_TWENTY_ONE_DAY_SUPP, providerNotification: ARISTADA_NOTIFY_PROVIDER },
        ],
    },
];

// ─── Uzedy (days since last injection) ───────────────────────────────────────

export const UZEDY_TIERS: LateTier[] = [
    {
        type: 'static',
        maxDays: 27,
        guidance: {
            idealSteps:           '<p>Uzedy is not yet due. Please consult the Uzedy early administration guidance.</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>No provider notification needed.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 119,
        guidance: {
            idealSteps:           '<p>Administer usual Uzedy maintenance dose (unless it is not yet due, in which case consult the early administration guidance). Then arrange for the next injection at the usual dosing interval.</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
        },
    },
    {
        type: 'static',
        maxDays: 180,
        guidance: {
            idealSteps: `<p>(1) Administer usual Uzedy maintenance dose</p>
                         <p>(2) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>
                         <p>(3) Next injection at usual dosing interval</p>`,
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
        },
    },
    {
        type: 'dose-variant',
        maxDays: Infinity,
        guidanceByDose: {
            '150-or-less': {
                idealSteps: `<p>(1) Administer usual Uzedy maintenance dose (150 mg or less)</p>
                             <p>(2) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>
                             <p>(3) Next injection at usual dosing interval</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
            },
            '200-or-more': {
                idealSteps: `<p>(1) Try to contact prescriber for discussion on whether this person is at risk for sedation or other severe antipsychotic adverse events</p>
                             <p>(2) If prescriber cannot be reached, administer approximately 150 mg of the injection. Example: the typical injection is 200 mg; administer approximately ¾ of the medication</p>
                             <p>(3) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>If not already contacted, notify the provider after the injection to get guidance on next steps.</p>',
            },
        },
    },
];
