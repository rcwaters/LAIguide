// ─── Medication Data ─────────────────────────────────────────────────────────

const MEDICATION_DISPLAY_NAMES = {
    invega_sustenna:       'Invega Sustenna (paliperidone palmitate)',
    invega_trinza:         'Invega Trinza (paliperidone palmitate 3-month)',
    invega_hafyera:        'Invega Hafyera (paliperidone palmitate 6-month)',
    abilify_maintena:      'Abilify Maintena (aripiprazole)',
    aristada:              'Aristada (aripiprazole lauroxil)',
    uzedy:                 'Uzedy (risperidone subcutaneous)',
    haloperidol_decanoate: 'Haloperidol Decanoate (Haldol Dec)',
    fluphenazine_decanoate:'Fluphenazine Decanoate (formerly Prolixin Dec)',
    vivitrol:              'Vivitrol (naltrexone)',
    sublocade:             'Sublocade (buprenorphine)',
    brixadi:               'Brixadi (buprenorphine)',
};

const EARLY_GUIDANCE_CONTENT = {
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

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

function getMedicationDisplayName(medication) {
    return MEDICATION_DISPLAY_NAMES[medication] || medication;
}

function getEarlyGuidanceContent(medication) {
    return EARLY_GUIDANCE_CONTENT[medication]
        || 'Please consult the DESC LAI standing order document for specific guidance.';
}

// ─── Date / Time Utilities ────────────────────────────────────────────────────

function daysSinceDate(dateString) {
    const past  = new Date(dateString);
    const today = new Date();
    return Math.floor((today - past) / (1000 * 60 * 60 * 24));
}

function formatWeeksAndDays(totalDays) {
    const weeks         = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    if (weeks === 0) {
        return `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    } else if (remainingDays === 0) {
        return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
        return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Guidance Logic ───────────────────────────────────────────────────────────

/**
 * Returns guidance object { idealSteps, pragmaticVariations, providerNotification }
 * for a missed/delayed 2nd initiation (156 mg) Invega Sustenna injection.
 * @param {number} daysSince - days since the first (234 mg) injection
 */
function getInvegaInitiationGuidance(daysSince) {
    if (daysSince <= 12) {
        return {
            idealSteps:            '<p>The 156 mg is either not due or not significantly overdue. Proceed with original plans and orders.</p>',
            pragmaticVariations:   '<p>No variations needed - proceed with standard protocol.</p>',
            providerNotification:  '<p>Only if questions remain</p>',
        };
    } else if (daysSince <= 28) {
        return {
            idealSteps: `<p>(1) Administer 156 mg (in deltoid ideally).</p>
                         <p>(2) Arrange for a 117 mg injection 5 weeks after the first (234 mg) injection, regardless of when the 156 mg injection (in step 1) is administered</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection in gluteal muscle if patient strongly prefers.</p>',
            providerNotification: '<p><strong>Post-injection (156 mg):</strong> Notify provider of the situation and need to order a 117 mg injection if not already done.</p>',
        };
    } else if (daysSince <= 49) {
        return {
            idealSteps: `<p>(1) Administer 156 mg (in deltoid ideally).</p>
                         <p>(2) Arrange for a 2nd 156 mg injection (in deltoid ideally) 1 week after step 1.</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection in gluteal muscle if patient strongly prefers.</p>',
            providerNotification: '<p><strong>Post-injection (1st 156 mg):</strong> Notify provider of the situation and need to order a 2nd 156 mg injection if not already done.</p>',
        };
    } else if (daysSince <= 180) {
        return {
            idealSteps: `<p>(1) Restart initiation: Administer a 234 mg injection if available</p>
                         <p>(2) Arrange for a 156 mg injection 1 week after step 1.</p>
                         <p>(3) Thereafter, start monthly maintenance dosing 4 weeks after step 2.</p>`,
            pragmaticVariations:  '<p>Ok to administer the 156 mg injection at time of patient presentation if a 234 mg injection is not available and arrange for the patient to return in 1 week.</p>',
            providerNotification: '<p><strong>Post-injection:</strong> notify provider of situation and for orders and guidance on next steps</p>',
        };
    } else {
        return {
            idealSteps:           '<p>Consult provider to get orders to proceed</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p><strong>Before any injection:</strong> Consult provider</p>',
        };
    }
}

/**
 * Returns guidance for a missed/delayed monthly maintenance Invega Sustenna injection.
 * @param {number} daysSince
 * @param {string} maintenanceDose - '156-or-less' | '234'
 */
function getInvegaMaintenanceGuidance(daysSince, maintenanceDose) {
    if (daysSince < 28) {
        return {
            idealSteps:           '<p>The maintenance injection is not significantly overdue (less than 4 weeks since last injection). Proceed with administering the usual maintenance dose and continue with normal monthly schedule.</p>',
            pragmaticVariations:  '<p>No variations needed - proceed with standard protocol.</p>',
            providerNotification: '<p>No provider notification needed for routine administration.</p>',
        };
    } else if (daysSince <= 42) {
        return {
            idealSteps: `<p>(1) Administer usual Invega Sustenna dose.</p>
                         <p>(2) Arrange for next usual monthly maintenance dose = 4 weeks later.</p>`,
            pragmaticVariations:  '<p>No change from ideal steps</p>',
            providerNotification: '<p>No need</p>',
        };
    } else if (daysSince <= 180) {
        if (maintenanceDose === '156-or-less') {
            return {
                idealSteps: `<p>(1) Administer usual maintenance dose.</p>
                             <p>(2) Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.</p>
                             <p>(3) Then resume usual monthly doses 4 weeks after step 2.</p>`,
                pragmaticVariations:  '<p>For step (2), ok if the 2nd usual maintenance dose happens anytime 1 week or beyond. Attempt to return to a monthly cycle after the 2nd usual maintenance dose.</p>',
                providerNotification: '<p><strong>Post-injection:</strong> Notify provider of the need to have a 2nd usual maintenance dose ordered.</p>',
            };
        } else {
            return {
                idealSteps: `<p>(1) Administer 156 mg Invega Sustenna</p>
                             <p>(2) Arrange for another 156 mg injection to be administered 1 week later</p>
                             <p>(3) Then resume usual monthly doses with 234 mg at 4 weeks after step 2.</p>`,
                pragmaticVariations:  '<p>If a 156 mg Invega Sustenna injection is not available at the time the patient presents, give the 234 mg injection. Notify the provider to guide next steps.</p>',
                providerNotification: `<p><strong>Post-injection:</strong> Notify provider of the situation. If ideal steps are followed, a 2nd 156 mg injection may need to be ordered.</p>
                                       <p>If the pragmatic variation was followed, the provider will guide next steps.</p>`,
            };
        }
    } else {
        return {
            idealSteps:           '<p>Consult provider: reinitiation will need to happen</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p><strong>Before any injection:</strong> Consult provider</p>',
        };
    }
}

/**
 * Returns guidance for a missed/delayed Invega Trinza injection.
 * @param {number} daysSince
 * @param {string} trinzaDose - '410' | '546' | '819'
 */
function getInvegaTrinzaGuidance(daysSince, trinzaDose) {
    if (daysSince < 90) {
        return {
            idealSteps:           '<p>Please refer to the early dosing guidance. The Trinza injection is not yet due or overdue.</p>',
            pragmaticVariations:  '<p>See early dosing guidance section.</p>',
            providerNotification: '<p>No provider notification needed.</p>',
        };
    } else if (daysSince <= 120) {
        return {
            idealSteps:           '<p>(1) Administer next usual Invega Trinza dose</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>No need but notify full care team of importance of avoiding missed doses of Trinza.</p>',
        };
    } else if (daysSince <= 270) {
        if (trinzaDose === '410') {
            return {
                idealSteps: `<p>(1) Do not administer Trinza dose</p>
                             <p>(2) Administer Invega <strong>Sustenna</strong> 117 mg</p>
                             <p>(3) Arrange for a 2nd Invega Sustenna 117 mg injection 7 days after step 2.</p>
                             <p>(4) Arrange for a 410 mg Invega <strong>Trinza</strong> injection 4 weeks after step 3.</p>`,
                pragmaticVariations:  '<p>None. Consult provider prior to deviating from ideal steps.</p>',
                providerNotification: '<p>Consult provider in all cases.</p>',
            };
        } else {
            return {
                idealSteps: `<p>(1) Do not administer Trinza dose</p>
                             <p>(2) Administer Invega <strong>Sustenna</strong> 156 mg</p>
                             <p>(3) Arrange for a 2nd Invega Sustenna 156 mg injection 7 days after step 2.</p>
                             <p>(4) Arrange for the usual Invega <strong>Trinza</strong> injection 4 weeks after step 3.</p>`,
                pragmaticVariations:  '<p>None. Consult provider prior to deviating from ideal steps.</p>',
                providerNotification: '<p>Consult provider in all cases.</p>',
            };
        }
    } else {
        return {
            idealSteps:           '<p>Consult provider. Reinitiation is necessary</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>Consult provider in all cases</p>',
        };
    }
}

/**
 * Returns guidance category for a missed/delayed Invega Hafyera injection.
 * Returns one of: 'early' | 'on-time' | 'consult'
 * @param {number} daysSince
 */
function getInvegaHafyeraGuidanceCategory(daysSince) {
    if (daysSince < 181)       return 'early';
    if (daysSince <= 202)      return 'on-time';
    return 'consult';
}

/**
 * Returns guidance for a missed/delayed Abilify Maintena injection.
 * @param {number} weeksSince
 * @param {string} abilifyDoses - '1-2' | '3+'
 */
function getAbilifyMaintenaGuidance(weeksSince, abilifyDoses) {
    if (weeksSince < 4) {
        return {
            idealSteps:           '<p>The Abilify Maintena injection is not due. Please consult guidance on early dosing.</p>',
            pragmaticVariations:  '<p>See early dosing guidance section.</p>',
            providerNotification: '<p>No provider notification needed.</p>',
        };
    }

    if (abilifyDoses === '1-2') {
        if (weeksSince <= 5) {
            return {
                idealSteps: `<p>(1) Administer usual Abilify Maintena monthly dose</p>
                             <p>(2) Arrange for next usual monthly dose in 4 weeks</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>No need</p>',
            };
        } else {
            return {
                idealSteps: `<p>Re-initiate:</p>
                             <p>(1) Administer usual Abilify Maintena monthly dose</p>
                             <p>(2) Notify patient of the options recommended for reinitiation: either (a) receive a 2nd Abilify Maintena dose at the same time as the first (in step 1) or within days, or (b) resume oral aripiprazole (10-20 mg) for 14 days</p>`,
                pragmaticVariations:  '<p>If the patient is not able or likely to take oral aripiprazole or get a 2nd injection immediately, consult with provider about accelerating timing of next injection.</p>',
                providerNotification: '<p>Post-injection: notify provider of situation and need for either a 2nd immediate monthly injection or 14 days of oral aripiprazole.</p>',
            };
        }
    } else {
        // 3 or more monthly maintenance doses received
        if (weeksSince <= 6) {
            return {
                idealSteps: `<p>(1) Administer usual Abilify Maintena monthly dose</p>
                             <p>(2) Arrange for next usual monthly dose in 4 weeks</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>No need</p>',
            };
        } else {
            return {
                idealSteps: `<p>Re-initiate:</p>
                             <p>(1) Administer usual Abilify Maintena monthly dose</p>
                             <p>(2) Notify patient of the options recommended for reinitiation: either (a) receive a 2nd Abilify Maintena dose at the same time as the first (in step 1) or within days, or (b) resume oral aripiprazole (10-20 mg) for 14 days</p>`,
                pragmaticVariations:  '<p>If the patient is not able or likely to take oral aripiprazole or get a 2nd injection immediately, consult with provider about accelerating timing of next injection.</p>',
                providerNotification: '<p>Post-injection: notify provider of situation and need for either a 2nd immediate monthly injection or 14 days of oral aripiprazole.</p>',
            };
        }
    }
}

/**
 * Returns guidance for a missed/delayed Aristada injection.
 * @param {number} daysSince
 * @param {string} aristadaDose - '441' | '662' | '882' | '1064'
 */
function getAristadaGuidance(daysSince, aristadaDose) {
    if (daysSince < 28) {
        return {
            notDue: true,
            message: '<p>The Aristada injection is not yet due. Please consult the guidance on early dosing.</p>',
        };
    }

    let supplementation      = '';
    let providerNotification = '';

    if (aristadaDose === '441') {
        if (daysSince <= 42) {
            supplementation      = '<p>No supplementation required</p>';
            providerNotification = '<p>No need</p>';
        } else if (daysSince <= 49) {
            supplementation      = '<p>Oral aripiprazole for 7 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        } else {
            supplementation      = '<p>Oral aripiprazole for 21 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        }
    } else if (aristadaDose === '662' || aristadaDose === '882') {
        if (daysSince <= 56) {
            supplementation      = '<p>No supplementation required</p>';
            providerNotification = '<p>No need</p>';
        } else if (daysSince <= 84) {
            supplementation      = '<p>Oral aripiprazole for 7 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        } else {
            supplementation      = '<p>Oral aripiprazole for 21 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        }
    } else if (aristadaDose === '1064') {
        if (daysSince <= 70) {
            supplementation      = '<p>No supplementation required</p>';
            providerNotification = '<p>No need</p>';
        } else if (daysSince <= 84) {
            supplementation      = '<p>Oral aripiprazole for 7 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        } else {
            supplementation      = '<p>Oral aripiprazole for 21 days <strong>OR</strong> Aristada Initio 675 mg IM once (now or within next few days)</p>';
            providerNotification = '<p>Notify provider with patient preference for supplementation and to order medications</p>';
        }
    }

    return { notDue: false, supplementation, providerNotification };
}

/**
 * Returns guidance for a missed/delayed Uzedy injection.
 * @param {number} daysSince
 * @param {string} uzedyDose - '150-or-less' | '200-or-more'
 */
function getUzedyGuidance(daysSince, uzedyDose) {
    if (daysSince < 28) {
        return {
            idealSteps:           '<p>Uzedy is not yet due. Please consult the Uzedy early administration guidance.</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>No provider notification needed.</p>',
        };
    } else if (daysSince <= 119) {
        return {
            idealSteps:           '<p>Administer usual Uzedy maintenance dose (unless it is not yet due, in which case consult the early administration guidance). Then arrange for the next injection at the usual dosing interval.</p>',
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
        };
    } else if (daysSince <= 180) {
        return {
            idealSteps: `<p>(1) Administer usual Uzedy maintenance dose</p>
                         <p>(2) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>
                         <p>(3) Next injection at usual dosing interval</p>`,
            pragmaticVariations:  '<p>Same</p>',
            providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
        };
    } else {
        if (uzedyDose === '150-or-less') {
            return {
                idealSteps: `<p>(1) Administer usual Uzedy maintenance dose (150 mg or less)</p>
                             <p>(2) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>
                             <p>(3) Next injection at usual dosing interval</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>After the injection, notify the provider as an FYI on the injection timing.</p>',
            };
        } else {
            return {
                idealSteps: `<p>(1) Try to contact prescriber for discussion on whether this person is at risk for sedation or other severe antipsychotic adverse events</p>
                             <p>(2) If prescriber cannot be reached, administer approximately 150 mg of the injection. Example: the typical injection is 200 mg; administer approximately ¾ of the medication</p>
                             <p>(3) Arrange for care team to check in with patient within 1-2 days, to assess for sedation</p>`,
                pragmaticVariations:  '<p>Same</p>',
                providerNotification: '<p>If not already contacted, notify the provider after the injection to get guidance on next steps.</p>',
            };
        }
    }
}
