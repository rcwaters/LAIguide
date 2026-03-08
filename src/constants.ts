import type {
    MedicationKey,
    LateTier,
    AristadaDoseConfig,
    AbilifyPriorDoseGroup,
    GuidanceResult,
    HaloperidolPriorDoseGroup,
    FluphenazinePriorDoseGroup,
    VivitrolIndication,
    SublocadeType,
    BrixadiType,
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

// ─── Shared HTML fragment ─────────────────────────────────────────────────────

const FENTANYL_CRITERIA_HTML = `
<p><strong>Criteria for "minimal or no fentanyl dependence" — all must apply:</strong></p>
<ul>
  <li>Client does not experience significant opioid withdrawal symptoms during a typical day (no more than mild morning withdrawals)</li>
  <li>Client does not feel significant effects of fentanyl if they use it</li>
  <li>Client can go 6 or more hours without fentanyl or other unregulated opioids without significant withdrawal</li>
  <li>Client's fentanyl use remains "much less" than before starting MOUD</li>
</ul>`;

// ─── Haloperidol Decanoate ────────────────────────────────────────────────────

const HALDOL_CHECKIN_GUIDANCE: GuidanceResult = {
    idealSteps: `
<p>(1) Administer usual haloperidol decanoate injection <strong>if the dose is 200 mg or less</strong>.</p>
<p style="margin-left:1rem">If the dose is greater than 200 mg, consult provider <em>before</em> administering.</p>
<p>(2) If symptoms of psychosis have returned or worsened, recommend oral haloperidol supplementation (consult provider for order).</p>
<p>(3) Schedule a check-in with patient in <strong>6–7 days</strong> (near peak dose) to assess for haloperidol-related adverse effects.</p>`,
    pragmaticVariations:  '<p>Same, no change from ideal steps.</p>',
    providerNotification: `
<p><strong>Pre-injection:</strong> Consult provider only if haloperidol decanoate dose is greater than 200 mg.</p>
<p><strong>Post-injection:</strong> Notify provider of the situation and request an order for oral supplementation if needed (returned or worsened psychosis symptoms).</p>`,
};

const HALDOL_ROUTINE_GUIDANCE: GuidanceResult = {
    idealSteps:           '<p>(1) Administer usual haloperidol decanoate injection.</p><p>(2) Arrange for next injection in 4 weeks.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No need.</p>',
};

const HALDOL_CONSULT_GUIDANCE: GuidanceResult = {
    idealSteps:           '<p>Do not administer. Reinitiation is required. <strong>Consult provider BEFORE any injection.</strong></p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p><strong>Before any injection:</strong> Consult provider in all cases.</p>',
};

export const HALOPERIDOL_DOSE_GROUPS: HaloperidolPriorDoseGroup[] = [
    {
        priorDoses: '1-3',
        tiers: [
            { type: 'static', maxDays: 84,       guidance: HALDOL_CHECKIN_GUIDANCE },
            { type: 'static', maxDays: Infinity,  guidance: HALDOL_CONSULT_GUIDANCE  },
        ],
    },
    {
        priorDoses: '4+',
        tiers: [
            { type: 'static', maxDays: 41,       guidance: HALDOL_ROUTINE_GUIDANCE  },
            { type: 'static', maxDays: 84,       guidance: HALDOL_CHECKIN_GUIDANCE  },
            { type: 'static', maxDays: Infinity,  guidance: HALDOL_CONSULT_GUIDANCE  },
        ],
    },
];

// ─── Fluphenazine Decanoate ───────────────────────────────────────────────────

const FLUPH_CHECKIN_GUIDANCE: GuidanceResult = {
    idealSteps: `
<p>(1) Administer usual fluphenazine decanoate injection <strong>if the dose is 50 mg or less</strong>.</p>
<p style="margin-left:1rem">If the dose is greater than 50 mg, consult provider <em>before</em> administering.</p>
<p>(2) If symptoms of psychosis have returned or worsened, recommend oral fluphenazine supplementation (consult provider for order).</p>
<p>(3) Schedule a check-in with patient in approximately <strong>24 hours</strong> (near peak dose) to assess for fluphenazine-related adverse effects.</p>`,
    pragmaticVariations:  '<p>Same, no change from ideal steps.</p>',
    providerNotification: `
<p><strong>Pre-injection:</strong> Consult provider only if fluphenazine decanoate dose is greater than 50 mg.</p>
<p><strong>Post-injection:</strong> Notify provider of the situation and request an order for oral supplementation if needed (returned or worsened psychosis symptoms).</p>`,
};

const FLUPH_ROUTINE_GUIDANCE: GuidanceResult = {
    idealSteps:           '<p>(1) Administer usual fluphenazine decanoate injection.</p><p>(2) Arrange for next injection at the previously planned dosing interval.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No need.</p>',
};

const FLUPH_CONSULT_GUIDANCE: GuidanceResult = {
    idealSteps:           '<p>Do not administer. Reinitiation is required. <strong>Consult provider BEFORE any injection.</strong></p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p><strong>Before any injection:</strong> Consult provider in all cases.</p>',
};

export const FLUPHENAZINE_DOSE_GROUPS: FluphenazinePriorDoseGroup[] = [
    {
        priorDoses: '1-2',
        tiers: [
            { type: 'static', maxDays: 120,      guidance: FLUPH_CHECKIN_GUIDANCE },
            { type: 'static', maxDays: Infinity,  guidance: FLUPH_CONSULT_GUIDANCE  },
        ],
    },
    {
        priorDoses: '3+',
        tiers: [
            { type: 'static', maxDays: 41,       guidance: FLUPH_ROUTINE_GUIDANCE  },
            { type: 'static', maxDays: 120,      guidance: FLUPH_CHECKIN_GUIDANCE  },
            { type: 'static', maxDays: Infinity,  guidance: FLUPH_CONSULT_GUIDANCE  },
        ],
    },
];

// ─── Vivitrol ─────────────────────────────────────────────────────────────────

const VIVITROL_NOT_DUE: GuidanceResult = {
    idealSteps:           '<p>Vivitrol is not yet overdue. Please consult the early administration guidance (no sooner than 3 weeks after the last injection).</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No provider notification needed.</p>',
};

const VIVITROL_CONSULT: GuidanceResult = {
    idealSteps:           '<p><strong>Consult provider before administering Vivitrol.</strong> The injection is more than 8 weeks overdue. Provider guidance is required before proceeding.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>Consult provider before any injection.</p>',
};

export const VIVITROL_TIERS: Record<VivitrolIndication, LateTier[]> = {
    'oud': [
        { type: 'static', maxDays: 20, guidance: VIVITROL_NOT_DUE },
        {
            type: 'static', maxDays: 27,
            guidance: {
                idealSteps: `
<p><strong>Administer Vivitrol 380 mg IM</strong> as long as the patient meets criteria for "minimal or no fentanyl dependence". No UDS required at this interval.</p>
${FENTANYL_CRITERIA_HTML}
<p><em>If there is ongoing active fentanyl or other unregulated opioid use, discuss a switch to buprenorphine for more robust OUD treatment.</em></p>`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Do not administer and consult provider if patient does not meet criteria for "minimal or no fentanyl dependence".</p>',
            },
        },
        {
            type: 'static', maxDays: 34,
            guidance: {
                idealSteps: `
<p>First, assess fentanyl dependence using the criteria below — if not met, do <strong>NOT</strong> administer and consult provider.</p>
${FENTANYL_CRITERIA_HTML}
<p><strong>If NO intentional fentanyl use reported:</strong> Administer Vivitrol (no UDS needed), provided patient meets criteria above.</p>
<p><strong>If intentional fentanyl use IS reported:</strong> Obtain a point-of-care UDS (document in chasers):</p>
<ul>
  <li>UDS <strong>Negative</strong> → Administer Vivitrol (if patient meets criteria above).</li>
  <li>UDS <strong>Positive</strong> → Consult provider. If history truly confirms no/minimal withdrawal and no significant fentanyl effects, may administer or consider naloxone challenge.</li>
</ul>`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Consult provider if UDS positive, or if patient does not meet "minimal or no fentanyl dependence" criteria.</p>',
            },
        },
        {
            type: 'static', maxDays: 55,
            guidance: {
                idealSteps: `
<p>First, assess fentanyl dependence using the criteria below — if not met, do <strong>NOT</strong> administer and consult provider.</p>
${FENTANYL_CRITERIA_HTML}
<p><strong>Obtain a point-of-care UDS</strong> (consult provider if unable to perform UDS):</p>
<ul>
  <li>UDS <strong>Negative</strong> → Administer Vivitrol (if patient meets criteria above).</li>
  <li>UDS <strong>Positive</strong> → Do NOT administer. Further discussion needed on degree of opioid dependence. Consult provider.</li>
</ul>`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Consult provider if unable to obtain UDS, if UDS is positive, or if patient does not meet "minimal or no fentanyl dependence" criteria.</p>',
            },
        },
        { type: 'static', maxDays: Infinity, guidance: VIVITROL_CONSULT },
    ],
    'overdose-prevention': [
        { type: 'static', maxDays: 20, guidance: VIVITROL_NOT_DUE },
        {
            type: 'static', maxDays: 34,
            guidance: {
                idealSteps: `
<p><strong>Administer Vivitrol 380 mg IM</strong> as long as the patient has no intentional daily use of opioids. No UDS required at this interval.</p>
<p>If there is regular opioid use, do <strong>NOT</strong> administer — consult provider.</p>`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Consult provider if patient has regular opioid use.</p>',
            },
        },
        {
            type: 'static', maxDays: 41,
            guidance: {
                idealSteps: `
<p>Obtain a point-of-care UDS unless you have strong confidence the patient has not used opioids (document in chasers).</p>
<ul>
  <li>UDS <strong>Negative</strong> → Administer Vivitrol (if patient meets criteria for minimal/no fentanyl dependence).</li>
  <li>UDS <strong>Positive</strong> → Consult provider. If history truly confirms no/minimal withdrawal, may administer or consider naloxone challenge.</li>
</ul>
${FENTANYL_CRITERIA_HTML}`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Consult provider if UDS positive or if there is concern about opioid dependence.</p>',
            },
        },
        {
            type: 'static', maxDays: 55,
            guidance: {
                idealSteps: `
<p><strong>Obtain a point-of-care UDS</strong> (consult provider if unable).</p>
<ul>
  <li>UDS <strong>Negative</strong> → Administer Vivitrol (if patient meets criteria for minimal/no fentanyl dependence).</li>
  <li>UDS <strong>Positive</strong> → Do NOT administer. Consult provider.</li>
</ul>
${FENTANYL_CRITERIA_HTML}`,
                pragmaticVariations:  '<p>Same.</p>',
                providerNotification: '<p>Consult provider if unable to obtain UDS, if UDS is positive, or if there is concern about opioid dependence.</p>',
            },
        },
        { type: 'static', maxDays: Infinity, guidance: VIVITROL_CONSULT },
    ],
};

// ─── Sublocade / Brixadi — shared tier building blocks ───────────────────────

const BRIX_SUB_NOT_DUE: GuidanceResult = {
    idealSteps:           '<p>The injection is not yet overdue (less than 3 weeks since last administration). Please consult the early administration guidance.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No provider notification needed.</p>',
};

const BRIX_SUB_ADMINISTER_REGARDLESS: GuidanceResult = {
    idealSteps:           '<p><strong>Administer the next injection</strong>, regardless of the level of unregulated opioid use.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No need.</p>',
};

/** Used for Sublocade 100 mg and all Brixadi monthly — includes note about considering upgrade to 300 mg. */
const BRIX_SUB_ADMINISTER_WITH_SWITCH_NOTE: GuidanceResult = {
    idealSteps:
`<p><strong>Administer the next injection</strong>, regardless of the level of unregulated opioid use.</p>
<p><em>Note: If the patient reports active use of unregulated opioids, discuss a switch to Sublocade 300 mg and consult prescriber if the patient is interested.</em></p>`,
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>No need.</p>',
};

const BRIX_SUB_CONDITIONAL_WITH_MODERATE: GuidanceResult = {
    idealSteps: `
<p>Conduct a fentanyl dependence assessment before administering:</p>
${FENTANYL_CRITERIA_HTML}
<p>Determine appropriate action:</p>
<p>✔ <strong>Administer</strong> if client has "minimal or no fentanyl dependence" — <em>or</em> — client has taken at least <strong>8 mg sublingual buprenorphine in the last 24 hours</strong>.</p>
<p>✔ <strong>Administer</strong> if client has moderate fentanyl dependence <em>and</em> is OK with the risk of some buprenorphine-induced withdrawal.</p>
<p>✖ <strong>Otherwise — consult prescriber</strong> before administering.</p>`,
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>Consult prescriber if patient does not meet minimal/no fentanyl dependence criteria and is not OK with withdrawal risk, or if unsure.</p>',
};

const BRIX_SUB_CONDITIONAL_STRICT: GuidanceResult = {
    idealSteps: `
<p>Conduct a fentanyl dependence assessment before administering:</p>
${FENTANYL_CRITERIA_HTML}
<p>Determine appropriate action:</p>
<p>✔ <strong>Administer</strong> if client has "minimal or no fentanyl dependence" — <em>or</em> — client has taken at least <strong>8 mg sublingual buprenorphine in the last 24 hours</strong>.</p>
<p>✖ <strong>Otherwise — consult prescriber</strong> before administering.</p>`,
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>Consult prescriber if patient does not meet minimal/no fentanyl dependence criteria or has not taken ≥8 mg sublingual buprenorphine in the last 24 hours.</p>',
};

const BRIX_SUB_CONSULT: GuidanceResult = {
    idealSteps:           '<p><strong>Consult a prescriber in real-time</strong> before administering. The goal is to avoid having the patient leave without guidance. You may consult the ORCA Center or medical director.</p>',
    pragmaticVariations:  '<p>Same.</p>',
    providerNotification: '<p>Consult prescriber before any injection.</p>',
};

/** Tier array shared by Sublocade 100 mg, Brixadi 64 mg, Brixadi 96 mg, Brixadi 128 mg. */
const BRIX_SUB_STANDARD_MONTHLY_TIERS: LateTier[] = [
    { type: 'static', maxDays: 20,       guidance: BRIX_SUB_NOT_DUE                     },
    { type: 'static', maxDays: 34,       guidance: BRIX_SUB_ADMINISTER_WITH_SWITCH_NOTE  },
    { type: 'static', maxDays: 41,       guidance: BRIX_SUB_CONDITIONAL_WITH_MODERATE    },
    { type: 'static', maxDays: 55,       guidance: BRIX_SUB_CONDITIONAL_STRICT           },
    { type: 'static', maxDays: Infinity, guidance: BRIX_SUB_CONSULT                      },
];

const SUBLOCADE_300_FEW_TIERS: LateTier[] = [
    { type: 'static', maxDays: 20,       guidance: BRIX_SUB_NOT_DUE                  },
    { type: 'static', maxDays: 34,       guidance: BRIX_SUB_ADMINISTER_REGARDLESS     },
    { type: 'static', maxDays: 48,       guidance: BRIX_SUB_CONDITIONAL_WITH_MODERATE },
    { type: 'static', maxDays: 55,       guidance: BRIX_SUB_CONDITIONAL_STRICT        },
    { type: 'static', maxDays: Infinity, guidance: BRIX_SUB_CONSULT                   },
];

const SUBLOCADE_300_ESTABLISHED_TIERS: LateTier[] = [
    { type: 'static', maxDays: 20,       guidance: BRIX_SUB_NOT_DUE                  },
    { type: 'static', maxDays: 48,       guidance: BRIX_SUB_ADMINISTER_REGARDLESS     },
    { type: 'static', maxDays: 55,       guidance: BRIX_SUB_CONDITIONAL_WITH_MODERATE },
    { type: 'static', maxDays: 69,       guidance: BRIX_SUB_CONDITIONAL_STRICT        },
    { type: 'static', maxDays: Infinity, guidance: BRIX_SUB_CONSULT                   },
];

// ─── Sublocade ────────────────────────────────────────────────────────────────

export const SUBLOCADE_TIERS: Record<SublocadeType, LateTier[]> = {
    '100mg':             BRIX_SUB_STANDARD_MONTHLY_TIERS,
    '300mg-few':         SUBLOCADE_300_FEW_TIERS,
    '300mg-established': SUBLOCADE_300_ESTABLISHED_TIERS,
};

// ─── Brixadi ──────────────────────────────────────────────────────────────────

const BRIXADI_WEEKLY_TIERS: LateTier[] = [
    {
        type: 'static', maxDays: 9,
        guidance: {
            idealSteps:           '<p>Administer the weekly Brixadi injection. Missed weekly doses (24 mg or 32 mg) may be given up to <strong>9 days</strong> after the last injection per the standing order.</p>',
            pragmaticVariations:  '<p>Same.</p>',
            providerNotification: '<p>No need for routine late administrations within the 9-day window.</p>',
        },
    },
    {
        type: 'static', maxDays: Infinity,
        guidance: {
            idealSteps:           '<p>The weekly Brixadi injection is more than 9 days overdue. <strong>Administer per prescriber guidance</strong> — contact the prescriber for specific instructions before proceeding.</p>',
            pragmaticVariations:  '<p>Same.</p>',
            providerNotification: '<p>Contact prescriber for guidance before administering.</p>',
        },
    },
];

export const BRIXADI_TIERS: Record<BrixadiType, LateTier[]> = {
    'monthly-64':  BRIX_SUB_STANDARD_MONTHLY_TIERS,
    'monthly-96':  BRIX_SUB_STANDARD_MONTHLY_TIERS,
    'monthly-128': BRIX_SUB_STANDARD_MONTHLY_TIERS,
    'weekly':      BRIXADI_WEEKLY_TIERS,
};
