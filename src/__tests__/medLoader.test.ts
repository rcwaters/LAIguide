import { describe, it, expect } from 'vitest';
import { MED_REGISTRY, pluralDays, composeEarlyGuidance } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';

/** Returns true if any element of the providerNotifications array contains the substring. */
function hasNotif(arr: string[] | undefined, sub: string): boolean {
    return !!arr?.some(s => s.includes(sub));
}

function localDaysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Local wrappers that preserve the original test call signatures
function getInvegaInitiationGuidance(days: number): GuidanceResult {
    return MED_REGISTRY['invega_sustenna'].getLateGuidance({ daysSince: days, variant: 'initiation' }) as GuidanceResult;
}
function getInvegaMaintenanceGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['invega_sustenna'].getLateGuidance({ daysSince: days, variant: 'maintenance', dose }) as GuidanceResult;
}
function getInvegaTrinzaGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['invega_trinza'].getLateGuidance({ daysSince: days, dose }) as GuidanceResult;
}
function getInvegaHafyeraGuidance(days: number): GuidanceResult {
    return MED_REGISTRY['invega_hafyera'].getLateGuidance({ daysSince: days }) as GuidanceResult;
}
function getAbilifyMaintenaGuidance(weeks: number, doses: string): GuidanceResult {
    return MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: weeks * 7, variant: doses }) as GuidanceResult;
}
function getAristadaGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['aristada'].getLateGuidance({ daysSince: days, dose }) as GuidanceResult;
}
function getUzedyGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['uzedy'].getLateGuidance({ daysSince: days, dose }) as GuidanceResult;
}
// ─── buildLateInfoRows — "Time since last injection" formatting ─────────────
// Uses haloperidol_decanoate which has a `format: "days-weeks"` info row.
// Verifies the fix that prevents "6 days (6 days)" when days < 7.
describe('buildLateInfoRows — time-since formatting', () => {
    const med = MED_REGISTRY['haloperidol_decanoate'];
    const ctx = {
        'last-haloperidol': '2026-01-01',
        'haloperidol-prior-doses': '4+',
    } as Parameters<typeof med.buildLateInfoRows>[0];

    function timeSince(days: number): string {
        const rows = med.buildLateInfoRows(ctx, days);
        const row  = rows.find(([label]) => label === 'Time since last injection:');
        if (!row) throw new Error('Row not found');
        return row[1];
    }

    it('0 days → "0 days" (no parenthetical)', () => {
        expect(timeSince(0)).toBe('0 days');
    });

    it('1 day → "1 day" (singular, no parenthetical)', () => {
        expect(timeSince(1)).toBe('1 day');
    });

    it('6 days → "6 days" (no duplicate parenthetical)', () => {
        // Before the fix this produced "6 days (6 days)".
        expect(timeSince(6)).toBe('6 days');
    });

    it('7 days → "7 days (1 week)"', () => {
        expect(timeSince(7)).toBe('7 days (1 week)');
    });

    it('8 days → "8 days (1 week and 1 day)"', () => {
        expect(timeSince(8)).toBe('8 days (1 week and 1 day)');
    });

    it('14 days → "14 days (2 weeks)"', () => {
        expect(timeSince(14)).toBe('14 days (2 weeks)');
    });

    it('30 days → "30 days (4 weeks and 2 days)"', () => {
        expect(timeSince(30)).toBe('30 days (4 weeks and 2 days)');
    });
});

describe('displayName', () => {
    it('returns full name for known medication keys', () => {
        expect(MED_REGISTRY['invega_sustenna'].displayName).toBe('Invega Sustenna (paliperidone palmitate)');
        expect(MED_REGISTRY['vivitrol'].displayName).toBe('Vivitrol (naltrexone)');
        expect(MED_REGISTRY['uzedy'].displayName).toBe('Uzedy (risperidone subcutaneous)');
    });
});
describe('earlyGuidance', () => {
    // ── pluralDays ──────────────────────────────────────────────────────────
    describe('pluralDays', () => {
        it('1 day  → "1 day"',   () => expect(pluralDays(1)).toBe('1 day'));
        it('3 days → "3 days"',  () => expect(pluralDays(3)).toBe('3 days'));
        it('6 days → "6 days"',  () => expect(pluralDays(6)).toBe('6 days'));
        it('7 days → "1 week"',  () => expect(pluralDays(7)).toBe('1 week'));
        it('14 days → "2 weeks"',() => expect(pluralDays(14)).toBe('2 weeks'));
        it('21 days → "3 weeks"',() => expect(pluralDays(21)).toBe('3 weeks'));
        it('26 days → "26 days"',() => expect(pluralDays(26)).toBe('26 days'));
    });

    // ── composeEarlyGuidance ────────────────────────────────────────────────
    describe('composeEarlyGuidance', () => {
        it('before-next, no note',   () => expect(composeEarlyGuidance(7,  undefined, undefined)).toBe('1 week before due date'));
        it('before-next, with note', () => expect(composeEarlyGuidance(3,  undefined, 'DESC created guidance')).toBe('3 days before due date  \n*(DESC created guidance)*'));
        it('since-last, no note',    () => expect(composeEarlyGuidance(undefined, 21, undefined)).toBe('No sooner than 3 weeks after last injection'));
        it('since-last, with note',  () => expect(composeEarlyGuidance(undefined, 21, 'This may be given earlier with provider approval')).toBe('No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'));
        it('since-last, non-week days', () => expect(composeEarlyGuidance(undefined, 26, undefined)).toBe('No sooner than 26 days after last injection'));
        it('dual constraint, no note',  () => expect(composeEarlyGuidance(7, 21, undefined)).toBe('1 week before due date; no sooner than 3 weeks after last injection'));
    });

    // ── Registry: earlyGuidance string ─────────────────────────────────────
    describe('registry earlyGuidance string', () => {
        it('returns early guidance content for known medications', () => {
            expect(MED_REGISTRY['invega_trinza'].earlyGuidance).toBe('1 week before due date');
            expect(MED_REGISTRY['abilify_maintena'].earlyGuidance).toBe('No sooner than 26 days after last injection');
        });
        const cases: [string, string][] = [
            ['aristada',             '2 days before due date; no sooner than 3 weeks after last injection'],
            ['invega_sustenna',      '2 days before due date; no sooner than 3 weeks after last injection  \n*(Note: after completing full initiation process)*'],
            ['invega_hafyera',       '2 weeks before due date'],
            ['fluphenazine_decanoate','2 days before due date; no sooner than 2 weeks after last injection  \n*(DESC created guidance)*'],
            ['haloperidol_decanoate','2 days before due date; no sooner than 2 weeks after last injection  \n*(DESC created guidance)*'],
            ['uzedy',               '2 days before due date; no sooner than 3 weeks after last injection  \n*(DESC created guidance)*'],
            ['brixadi',             'No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'],
            ['sublocade',           'No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'],
            ['vivitrol',            'No sooner than 3 weeks after last injection'],
        ];
        for (const [key, expected] of cases) {
            it(`${key} earlyGuidance`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyGuidance).toBe(expected));
        }
    });

    // ── Registry: earlyDaysBeforeDue / earlyMinDays ─────────────────────────
    describe('registry earlyDaysBeforeDue and earlyMinDays', () => {
        const daysBeforeDueCases: [string, number][] = [
            ['aristada',              2],
            ['invega_sustenna',       2],
            ['invega_trinza',         7],
            ['invega_hafyera',       14],
            ['fluphenazine_decanoate', 2],
            ['haloperidol_decanoate',  2],
            ['uzedy',                  2],
        ];
        for (const [key, days] of daysBeforeDueCases) {
            it(`${key} earlyDaysBeforeDue = ${days}`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyDaysBeforeDue).toBe(days));
        }
        const minDayCases: [string, number][] = [
            ['abilify_maintena', 26],
            ['brixadi',          21],
            ['sublocade',        21],
            ['vivitrol',         21],
            ['invega_sustenna',  21],
            ['aristada',          21],
            ['uzedy',             21],
            ['haloperidol_decanoate', 14],
            ['fluphenazine_decanoate', 14],
        ];
        for (const [key, days] of minDayCases) {
            it(`${key} earlyMinDays = ${days}`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyMinDays).toBe(days));
        }
        it('purely-before-next meds have no earlyMinDays', () => {
            expect(MED_REGISTRY['invega_trinza'].earlyMinDays).toBeUndefined();
        });
        it('purely-since-last meds have no earlyDaysBeforeDue', () => {
            expect(MED_REGISTRY['abilify_maintena'].earlyDaysBeforeDue).toBeUndefined();
        });
    });
});
describe('getInvegaInitiationGuidance', () => {
    const stepText = (idealSteps: string[]) =>
        idealSteps.join('\n\n');

    it('≤12 days: not significantly overdue', () => {
        const r0  = getInvegaInitiationGuidance(0);
        const r12 = getInvegaInitiationGuidance(12);
        expect(stepText(r0.idealSteps)).toContain('not significantly overdue');
        expect(stepText(r12.idealSteps)).toContain('not significantly overdue');
    });

    it('13–28 days: administer 156 mg, then 117 mg at week 5', () => {
        const r13 = getInvegaInitiationGuidance(13);
        const r28 = getInvegaInitiationGuidance(28);
        expect(stepText(r13.idealSteps)).toContain('156 mg');
        expect(stepText(r13.idealSteps)).toContain('117 mg');
        expect(stepText(r28.idealSteps)).toContain('117 mg');
        expect(hasNotif(r13.providerNotifications, '117 mg')).toBe(true);
    });

    it('29–49 days: 156 mg then 2nd 156 mg 1 week later', () => {
        const r29 = getInvegaInitiationGuidance(29);
        const r49 = getInvegaInitiationGuidance(49);
        expect(stepText(r29.idealSteps)).toContain('2nd 156 mg');
        expect(stepText(r49.idealSteps)).toContain('2nd 156 mg');
    });

    it('50–120 days (>7 weeks to 4 months): restart with 234 mg', () => {
        const r50  = getInvegaInitiationGuidance(50);
        const r120 = getInvegaInitiationGuidance(120);
        expect(stepText(r50.idealSteps)).toContain('234 mg');
        expect(stepText(r120.idealSteps)).toContain('234 mg');
    });

    it('121+ days (>4 months): consult provider before any injection', () => {
        const r121 = getInvegaInitiationGuidance(121);
        const r365 = getInvegaInitiationGuidance(365);
        expect(r121.idealSteps.some(s => s.includes('Consult provider'))).toBe(true);
        expect(hasNotif(r121.providerNotifications, 'Before any injection')).toBe(true);
        expect(hasNotif(r365.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 12, 28, 49, 120, Infinity)', () => {
        expect(stepText(getInvegaInitiationGuidance(12).idealSteps)).toContain('not significantly overdue');
        expect(stepText(getInvegaInitiationGuidance(13).idealSteps)).toContain('117 mg');
        expect(stepText(getInvegaInitiationGuidance(28).idealSteps)).toContain('117 mg');
        expect(stepText(getInvegaInitiationGuidance(29).idealSteps)).toContain('2nd 156 mg');
        expect(stepText(getInvegaInitiationGuidance(49).idealSteps)).toContain('2nd 156 mg');
        expect(stepText(getInvegaInitiationGuidance(50).idealSteps)).toContain('Restart initiation');
        expect(stepText(getInvegaInitiationGuidance(120).idealSteps)).toContain('Restart initiation');
        expect(stepText(getInvegaInitiationGuidance(121).idealSteps)).toContain('Consult provider');
    });

    it('121+ days includes pragmatic variation about 156 mg fallback only with provider guidance', () => {
        const r121 = getInvegaInitiationGuidance(121);
        expect(r121.pragmaticVariations).toBeDefined();
        expect(r121.pragmaticVariations!.some(s => s.includes('156 mg injection'))).toBe(true);
        expect(r121.pragmaticVariations!.some(s => s.includes('Consult provider'))).toBe(true);
    });

    it('has all required fields', () => {
        [0, 20, 35, 100, 121, 200].forEach(d => {
            const r = getInvegaInitiationGuidance(d);
            expect(r).toHaveProperty('idealSteps');
            expect(r).toHaveProperty('providerNotifications');
            // pragmaticVariations is optional — present only when non-empty
            if (r.pragmaticVariations !== undefined) {
                expect(Array.isArray(r.pragmaticVariations)).toBe(true);
                expect(r.pragmaticVariations.length).toBeGreaterThan(0);
            }
        });
    });
});
describe('getInvegaMaintenanceGuidance', () => {
    it('<28 days: not significantly overdue', () => {
        const r = getInvegaMaintenanceGuidance(10, '39-to-156');
        expect(r.idealSteps.some(s => s.includes('not significantly overdue'))).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('28–42 days: administer usual dose, resume 4-week cycle (both doses)', () => {
        (['39-to-156', '234'] as const).forEach(dose => {
            const r = getInvegaMaintenanceGuidance(35, dose);
            expect(r.idealSteps.some(s => s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'))).toBe(true);
            expect(r.providerNotifications).toBeUndefined();
        });
    });

    it('43–120 days, 39-to-156: 2nd usual dose 1 week later', () => {
        const r = getInvegaMaintenanceGuidance(90, '39-to-156');
        expect(r.idealSteps.some(s => s.includes('Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.'))).toBe(true);
        expect(hasNotif(r.providerNotifications, '2nd usual maintenance dose')).toBe(true);
    });

    it('43–120 days, 234 mg: step down to 156 mg x2 then resume 234 mg', () => {
        const r = getInvegaMaintenanceGuidance(90, '234');
        expect(r.idealSteps.some(s => s.includes('Administer 156 mg Invega Sustenna'))).toBe(true);
        expect(r.idealSteps.some(s => s.includes('Then resume usual monthly doses with 234 mg at 4 weeks after step 2.'))).toBe(true);
    });

    it('121+ days: consult provider — reinitiation needed', () => {
        const r = getInvegaMaintenanceGuidance(200, '39-to-156');
        expect(r.idealSteps.some(s => s.includes('reinitiation'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 27, 42, 120, Infinity)', () => {
        // day 27 → tier 1: not due
        expect(getInvegaMaintenanceGuidance(27, '39-to-156').idealSteps.some(s => s.includes('not significantly overdue'))).toBe(true);
        // day 28 → tier 2: on-time
        expect(getInvegaMaintenanceGuidance(28, '39-to-156').idealSteps.some(s => s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'))).toBe(true);
        // day 42 → tier 2: still on-time
        expect(getInvegaMaintenanceGuidance(42, '39-to-156').idealSteps.some(s => s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'))).toBe(true);
        // day 43 → tier 3: overdue (dose-variant)
        expect(getInvegaMaintenanceGuidance(43, '39-to-156').idealSteps.some(s => s.includes('Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.'))).toBe(true);
        // day 120 → tier 3: still overdue
        expect(getInvegaMaintenanceGuidance(120, '39-to-156').idealSteps.some(s => s.includes('Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.'))).toBe(true);
        // day 121 → tier 4: reinitiation
        expect(getInvegaMaintenanceGuidance(121, '39-to-156').idealSteps.some(s => s.includes('reinitiation'))).toBe(true);
    });

    it('exact tier boundaries for 234 mg path (42/43 and 120/121)', () => {
        // day 42 → tier 2: usual dose
        expect(getInvegaMaintenanceGuidance(42, '234').idealSteps.some(s => s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'))).toBe(true);
        // day 43 → tier 3: 156 mg reload strategy
        expect(getInvegaMaintenanceGuidance(43, '234').idealSteps.some(s => s.includes('Administer 156 mg Invega Sustenna'))).toBe(true);
        // day 120 → tier 3: still 156 mg reload strategy
        expect(getInvegaMaintenanceGuidance(120, '234').idealSteps.some(s => s.includes('Administer 156 mg Invega Sustenna'))).toBe(true);
        // day 121 → tier 4: reinitiation consult
        expect(getInvegaMaintenanceGuidance(121, '234').idealSteps.some(s => s.includes('reinitiation'))).toBe(true);
    });
});
describe('getInvegaTrinzaGuidance', () => {
    it('<90 days: refers to early dosing guidance', () => {
        const r = getInvegaTrinzaGuidance(60, '410');
        expect(r.idealSteps.some(s => s.includes('refer to the early dosing guidance'))).toBe(true);
    });

    it('90–120 days: administer usual Trinza dose', () => {
        const r = getInvegaTrinzaGuidance(100, '546');
        expect(r.idealSteps.some(s => s.includes('usual Invega Trinza dose'))).toBe(true);
    });

    it('121–270 days, 410 mg dose: bridge with Sustenna 117 mg x2', () => {
        const r = getInvegaTrinzaGuidance(150, '410');
        expect(r.idealSteps.some(s => s.includes('Consult provider first'))).toBe(true);
        expect(r.idealSteps.some(s => s.includes('Administer Invega **Sustenna** 117 mg'))).toBe(true);
        expect(r.idealSteps.some(s => s.includes('Arrange for a 410 mg Invega **Trinza** injection 4 weeks after step 3.'))).toBe(true);
    });

    it('121–270 days, 546/819 mg dose: bridge with Sustenna 156 mg x2', () => {
        (['546', '819'] as const).forEach(dose => {
            const r = getInvegaTrinzaGuidance(150, dose);
            expect(r.idealSteps.some(s => s.includes('Administer Invega **Sustenna** 156 mg'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider')).toBe(true);
        });
    });

    it('271+ days: reinitiation required', () => {
        const r = getInvegaTrinzaGuidance(300, '546');
        expect(r.idealSteps.some(s => s.includes('Reinitiation'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'Consult provider')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 89, 120, 270, Infinity)', () => {
        // day 89 → tier 1: refer to early guidance
        expect(getInvegaTrinzaGuidance(89, '546').idealSteps.some(s => s.includes('refer to the early dosing guidance'))).toBe(true);
        // day 90 → tier 2: on-time
        expect(getInvegaTrinzaGuidance(90, '546').idealSteps.some(s => s.includes('usual Invega Trinza dose'))).toBe(true);
        // day 120 → tier 2: still on-time
        expect(getInvegaTrinzaGuidance(120, '546').idealSteps.some(s => s.includes('usual Invega Trinza dose'))).toBe(true);
        // day 121 → tier 3: bridge with Sustenna (dose-variant)
        expect(getInvegaTrinzaGuidance(121, '546').idealSteps.some(s => s.includes('Administer Invega **Sustenna** 156 mg'))).toBe(true);
        // day 270 → tier 3: still bridge
        expect(getInvegaTrinzaGuidance(270, '546').idealSteps.some(s => s.includes('Administer Invega **Sustenna** 156 mg'))).toBe(true);
        // day 271 → tier 4: reinitiation
        expect(getInvegaTrinzaGuidance(271, '546').idealSteps.some(s => s.includes('Consult provider. Reinitiation is necessary'))).toBe(true);
    });
});
describe('getInvegaHafyeraGuidance', () => {
    it('≤180 days: refers to early dosing guidance', () => {
        expect(getInvegaHafyeraGuidance(0).idealSteps.some(s => s.includes('early dosing guidance'))).toBe(true);
        expect(getInvegaHafyeraGuidance(180).idealSteps.some(s => s.includes('early dosing guidance'))).toBe(true);
    });

    it('181–202 days: proceed with administering and plan next dose in 6 months', () => {
        const r181 = getInvegaHafyeraGuidance(181);
        const r202 = getInvegaHafyeraGuidance(202);
        expect(r181.idealSteps.some(s => s.includes('Proceed with administering the Hafyera injection'))).toBe(true);
        expect(r202.idealSteps.some(s => s.includes('Plan for the subsequent injection in 6 months'))).toBe(true);
    });

    it('203+ days: consult provider before any injection', () => {
        const r203 = getInvegaHafyeraGuidance(203);
        const r365 = getInvegaHafyeraGuidance(365);
        expect(r203.idealSteps.some(s => s.includes('more than 6 months and 3 weeks'))).toBe(true);
        expect(r203.idealSteps.some(s => s.includes('Consult provider prior to proceeding'))).toBe(true);
        expect(hasNotif(r203.providerNotifications, 'Before any injection')).toBe(true);
        expect(hasNotif(r365.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 180, 202, Infinity)', () => {
        expect(getInvegaHafyeraGuidance(180).idealSteps.some(s => s.includes('early dosing guidance'))).toBe(true);
        expect(getInvegaHafyeraGuidance(181).idealSteps.some(s => s.includes('Proceed with administering the Hafyera injection'))).toBe(true);
        expect(getInvegaHafyeraGuidance(202).idealSteps.some(s => s.includes('Plan for the subsequent injection in 6 months'))).toBe(true);
        expect(getInvegaHafyeraGuidance(203).idealSteps.some(s => s.includes('Consult provider prior to proceeding'))).toBe(true);
    });
});
describe('getAbilifyMaintenaGuidance', () => {
    it('<4 weeks: not yet due', () => {
        const r = getAbilifyMaintenaGuidance(3, '3+');
        expect(r.idealSteps.some(s => s.includes('not due'))).toBe(true);
    });

    it('1-2 doses, 4–5 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(5, '1-2');
        expect(r.idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('1-2 doses, 6+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(6, '1-2');
        expect(r.idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'notify provider')).toBe(true);
    });

    it('3+ doses, 4–6 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(6, '3+');
        expect(r.idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('3+ doses, 7+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(7, '3+');
        expect(r.idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'notify provider')).toBe(true);
    });

    it('exact tier boundaries for 1-2 doses (27/28, 35/36, 119/120 days)', () => {
        const g12 = (d: number) => MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: d, variant: '1-2' }) as GuidanceResult;
        expect(g12(27).idealSteps.some(s => s.includes('not due'))).toBe(true);
        expect(g12(28).idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(g12(35).idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(g12(36).idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(g12(119).idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(g12(120).idealSteps.some(s => s.includes('Consult provider first'))).toBe(true);
    });

    it('exact tier boundaries for 3+ doses (27/28, 42/43, 119/120 days)', () => {
        const g3p = (d: number) => MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: d, variant: '3+' }) as GuidanceResult;
        expect(g3p(27).idealSteps.some(s => s.includes('not due'))).toBe(true);
        expect(g3p(28).idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(g3p(42).idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
        expect(g3p(43).idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(g3p(119).idealSteps.some(s => s.includes('Re-initiate:'))).toBe(true);
        expect(g3p(120).idealSteps.some(s => s.includes('Consult provider first'))).toBe(true);
    });
});
describe('getAristadaGuidance', () => {
    it('≤42 days for 662: not yet due', () => {
        const r = getAristadaGuidance(10, '662');
        expect(r.idealSteps.some(s => s.includes('not yet due'))).toBe(true);
    });

    describe('441 mg dose', () => {
        it('1–42 days: no supplementation required (within window)', () => {
            const r = getAristadaGuidance(10, '441');
            expect(r.idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
        });

        it('43–49 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(45, '441');
            expect(r.idealSteps.some(s => s.includes('7 days'))).toBe(true);
        });

        it('50+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(60, '441');
            expect(r.idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (no notDue tier; maxDays: 42, 49, 120, \u221e)', () => {
            // day 27 \u2192 no supplementation (441 has no notDue tier; maxDays:42)
            expect(getAristadaGuidance(27, '441').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 42 \u2192 no supplementation (maxDays:42)
            expect(getAristadaGuidance(42, '441').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 43 \u2192 7-day supplementation (maxDays:49)
            expect(getAristadaGuidance(43, '441').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 49 \u2192 7-day supplementation (still maxDays:49)
            expect(getAristadaGuidance(49, '441').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 50 \u2192 21-day supplementation (maxDays:120)
            expect(getAristadaGuidance(50, '441').idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });
    });

    describe('662 mg dose', () => {
        it('29\u201356 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '662');
            expect(r.idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
        });

        it('57\u201384 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(70, '662');
            expect(r.idealSteps.some(s => s.includes('7 days'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '662');
            expect(r.idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (not-due: \u226442; maxDays: 56, 84, \u221e)', () => {
            // day 42 \u2192 not yet due (maxDays:42)
            expect(getAristadaGuidance(42, '662').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            // day 43 \u2192 no supplementation (maxDays:56)
            expect(getAristadaGuidance(43, '662').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 56 \u2192 no supplementation (maxDays:56)
            expect(getAristadaGuidance(56, '662').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 57 \u2192 7-day supplementation (maxDays:84)
            expect(getAristadaGuidance(57, '662').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(getAristadaGuidance(84, '662').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(getAristadaGuidance(85, '662').idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });
    });

    describe('882 mg dose (same thresholds as 662)', () => {
        it('29\u201356 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '882');
            expect(r.idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '882');
            expect(r.idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (identical to 662: maxDays 56, 84, \u221e)', () => {
            // day 56 \u2192 no supplementation (maxDays:56)
            expect(getAristadaGuidance(56, '882').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 57 \u2192 7-day supplementation (maxDays:84)
            expect(getAristadaGuidance(57, '882').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(getAristadaGuidance(84, '882').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(getAristadaGuidance(85, '882').idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });
    });

    describe('1064 mg dose', () => {
        it('29\u201370 days: no supplementation', () => {
            const r = getAristadaGuidance(60, '1064');
            expect(r.idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
        });

        it('71\u201384 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(78, '1064');
            expect(r.idealSteps.some(s => s.includes('7 days'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(100, '1064');
            expect(r.idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (not-due: \u226442; maxDays: 70, 84, \u221e)', () => {
            // day 42 \u2192 not yet due (maxDays:42)
            expect(getAristadaGuidance(42, '1064').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            // day 43 \u2192 no supplementation (maxDays:70)
            expect(getAristadaGuidance(43, '1064').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 70 \u2192 no supplementation (maxDays:70)
            expect(getAristadaGuidance(70, '1064').idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            // day 71 \u2192 7-day supplementation (maxDays:84)
            expect(getAristadaGuidance(71, '1064').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(getAristadaGuidance(84, '1064').idealSteps.some(s => s.includes('7 days'))).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(getAristadaGuidance(85, '1064').idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['aristada'];

        it('441 mg: day 42 \u2192 no supp, day 43 \u2192 7-day, day 50 \u2192 21-day', () => {
            const p42  = entry.buildLateParams({ 'last-aristada': localDaysAgo(42),  'aristada-dose': '441' });
            const p43  = entry.buildLateParams({ 'last-aristada': localDaysAgo(43),  'aristada-dose': '441' });
            const p50  = entry.buildLateParams({ 'last-aristada': localDaysAgo(50),  'aristada-dose': '441' });
            expect(p42.daysSince).toBe(42);
            expect(p43.daysSince).toBe(43);
            expect(p50.daysSince).toBe(50);
            expect((entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            expect((entry.getLateGuidance(p43) as GuidanceResult).idealSteps.some(s => s.includes('7 days'))).toBe(true);
            expect((entry.getLateGuidance(p50) as GuidanceResult).idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('662 mg: day 42 \u2192 not yet due, day 56 \u2192 no supp, day 57 \u2192 7-day, day 85 \u2192 21-day', () => {
            const p42 = entry.buildLateParams({ 'last-aristada': localDaysAgo(42), 'aristada-dose': '662' });
            const p56 = entry.buildLateParams({ 'last-aristada': localDaysAgo(56), 'aristada-dose': '662' });
            const p57 = entry.buildLateParams({ 'last-aristada': localDaysAgo(57), 'aristada-dose': '662' });
            const p85 = entry.buildLateParams({ 'last-aristada': localDaysAgo(85), 'aristada-dose': '662' });
            expect((entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p56) as GuidanceResult).idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            expect((entry.getLateGuidance(p57) as GuidanceResult).idealSteps.some(s => s.includes('7 days'))).toBe(true);
            expect((entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('882 mg behaves identically to 662 mg (sameAs)', () => {
            const p56 = entry.buildLateParams({ 'last-aristada': localDaysAgo(56), 'aristada-dose': '882' });
            const p57 = entry.buildLateParams({ 'last-aristada': localDaysAgo(57), 'aristada-dose': '882' });
            const p85 = entry.buildLateParams({ 'last-aristada': localDaysAgo(85), 'aristada-dose': '882' });
            expect((entry.getLateGuidance(p56) as GuidanceResult).idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            expect((entry.getLateGuidance(p57) as GuidanceResult).idealSteps.some(s => s.includes('7 days'))).toBe(true);
            expect((entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });

        it('1064 mg: day 70 \u2192 no supp, day 71 \u2192 7-day, day 85 \u2192 21-day', () => {
            const p70 = entry.buildLateParams({ 'last-aristada': localDaysAgo(70), 'aristada-dose': '1064' });
            const p71 = entry.buildLateParams({ 'last-aristada': localDaysAgo(71), 'aristada-dose': '1064' });
            const p85 = entry.buildLateParams({ 'last-aristada': localDaysAgo(85), 'aristada-dose': '1064' });
            expect((entry.getLateGuidance(p70) as GuidanceResult).idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
            expect((entry.getLateGuidance(p71) as GuidanceResult).idealSteps.some(s => s.includes('7 days'))).toBe(true);
            expect((entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some(s => s.includes('21 days'))).toBe(true);
        });
    });
})
describe('getUzedyGuidance', () => {
    it('≤27 days: not yet due', () => {
        const r = getUzedyGuidance(27, '150-or-less');
        expect(r.idealSteps.some(s => s.includes('not yet due'))).toBe(true);
    });

    it('28–119 days: administer usual dose', () => {
        const r = getUzedyGuidance(60, '150-or-less');
        expect(r.idealSteps.some(s => s.includes('Administer usual Uzedy maintenance dose'))).toBe(true);
        expect(r.idealSteps.some(s => s.includes('usual dosing interval'))).toBe(true);
    });

    it('120+ days: sedation guidance (static — same for all doses)', () => {
        const r150 = getUzedyGuidance(150, '150-or-less');
        const r200 = getUzedyGuidance(150, '200-or-more');
        expect(r150.idealSteps.some(s => s.includes('Administer usual Uzedy maintenance dose (150 mg or less)'))).toBe(true);
        expect(r150.idealSteps.some(s => s.includes('Arrange for care team to check in with patient within 1-2 days, to assess for sedation'))).toBe(true);
        expect(hasNotif(r150.providerNotifications, 'Consult provider prior to any injection')).toBe(true);
        // tier 3 is static — 200-or-more dose receives identical guidance
        expect(r200.idealSteps).toEqual(r150.idealSteps);
    });

    it('exact tier boundaries: day 27/28 and day 119/120', () => {
        // day 27 → tier 1: not yet due (maxDays: 27)
        expect(getUzedyGuidance(27, '150-or-less').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
        // day 28 → tier 2: administer usual dose (maxDays: 119)
        expect(getUzedyGuidance(28, '150-or-less').idealSteps.some(s => s.includes('Administer usual Uzedy maintenance dose'))).toBe(true);
        // day 119 → tier 2: still usual dose
        expect(getUzedyGuidance(119, '150-or-less').idealSteps.some(s => s.includes('usual dosing interval'))).toBe(true);
        // day 120 → tier 3: sedation check (maxDays: null/∞)
        expect(getUzedyGuidance(120, '150-or-less').idealSteps.some(s => s.includes('Arrange for care team to check in with patient within 1-2 days, to assess for sedation'))).toBe(true);
        expect(getUzedyGuidance(120, '200-or-more').idealSteps.some(s => s.includes('Arrange for care team to check in with patient within 1-2 days, to assess for sedation'))).toBe(true);
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['uzedy'];

        it('day 27 → not yet due; day 28 → usual dose; day 119 → usual dose; day 120 → sedation check', () => {
            const p27  = entry.buildLateParams({ 'last-uzedy': localDaysAgo(27),  'uzedy-dose': '150-or-less' });
            const p28  = entry.buildLateParams({ 'last-uzedy': localDaysAgo(28),  'uzedy-dose': '150-or-less' });
            const p119 = entry.buildLateParams({ 'last-uzedy': localDaysAgo(119), 'uzedy-dose': '150-or-less' });
            const p120 = entry.buildLateParams({ 'last-uzedy': localDaysAgo(120), 'uzedy-dose': '200-or-more' });
            expect(p27.daysSince).toBe(27);
            expect(p120.daysSince).toBe(120);
            expect((entry.getLateGuidance(p27)  as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p28)  as GuidanceResult).idealSteps.some(s => s.includes('Administer usual Uzedy maintenance dose'))).toBe(true);
            expect((entry.getLateGuidance(p119) as GuidanceResult).idealSteps.some(s => s.includes('usual dosing interval'))).toBe(true);
            expect((entry.getLateGuidance(p120) as GuidanceResult).idealSteps.some(s => s.includes('Arrange for care team to check in with patient within 1-2 days, to assess for sedation'))).toBe(true);
        });
    });
})
// ─── getFluphenazineDecanoateGuidance ───────────────────────────────────────
function getFluphenazineGuidance(days: number, variant: string): GuidanceResult {
    return MED_REGISTRY['fluphenazine_decanoate'].getLateGuidance({ daysSince: days, variant }) as GuidanceResult;
}

describe('getFluphenazineDecanoateGuidance', () => {
    describe('1-2 prior doses (2-tier: ≤27 not-due | ≪120 check-in | 121+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(getFluphenazineGuidance(20, '1-2').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
        });

        it('28–120 days: check-in guidance', () => {
            const r = getFluphenazineGuidance(60, '1-2');
            expect(r.idealSteps.some(s => s.includes('Administer usual fluphenazine decanoate injection'))).toBe(true);
            expect(r.idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('121+ days: reinitiation required', () => {
            const r = getFluphenazineGuidance(150, '1-2');
            expect(r.idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28 and day 120/121', () => {
            expect(getFluphenazineGuidance(27, '1-2').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect(getFluphenazineGuidance(28, '1-2').idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(getFluphenazineGuidance(120, '1-2').idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(getFluphenazineGuidance(121, '1-2').idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });

    describe('3+ prior doses (3-tier: ≤27 not-due | ≤42 routine | 43–120 check-in | 121+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(getFluphenazineGuidance(20, '3+').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
        });

        it('28–42 days: routine', () => {
            const r = getFluphenazineGuidance(35, '3+');
            expect(r.idealSteps.some(s => s.includes('Administer usual fluphenazine decanoate injection'))).toBe(true);
            expect(r.idealSteps.some(s => s.includes('previously planned dosing interval'))).toBe(true);
            expect(r.providerNotifications).toBeUndefined();
        });

        it('43–120 days: check-in guidance', () => {
            const r = getFluphenazineGuidance(80, '3+');
            expect(r.idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('121+ days: reinitiation required', () => {
            const r = getFluphenazineGuidance(150, '3+');
            expect(r.idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28, day 42/43, day 120/121', () => {
            expect(getFluphenazineGuidance(27, '3+').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect(getFluphenazineGuidance(28, '3+').idealSteps.some(s => s.includes('previously planned dosing interval'))).toBe(true);
            expect(getFluphenazineGuidance(42, '3+').idealSteps.some(s => s.includes('previously planned dosing interval'))).toBe(true);
            expect(getFluphenazineGuidance(43, '3+').idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(getFluphenazineGuidance(120, '3+').idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect(getFluphenazineGuidance(121, '3+').idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['fluphenazine_decanoate'];

        it('1-2 doses: day 27 → not due; day 28 → check-in; day 121 → reinitiation', () => {
            const p27  = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(27),  'fluphenazine-prior-doses': '1-2' });
            const p28  = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(28),  'fluphenazine-prior-doses': '1-2' });
            const p121 = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(121), 'fluphenazine-prior-doses': '1-2' });
            expect((entry.getLateGuidance(p27)  as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p28)  as GuidanceResult).idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect((entry.getLateGuidance(p121) as GuidanceResult).idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });

        it('3+ doses: day 27 → not due; day 42 → routine; day 43 → check-in; day 121 → reinitiation', () => {
            const p27  = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(27),  'fluphenazine-prior-doses': '3+' });
            const p42  = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(42),  'fluphenazine-prior-doses': '3+' });
            const p43  = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(43),  'fluphenazine-prior-doses': '3+' });
            const p121 = entry.buildLateParams({ 'last-fluphenazine': localDaysAgo(121), 'fluphenazine-prior-doses': '3+' });
            expect((entry.getLateGuidance(p27)  as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p42)  as GuidanceResult).idealSteps.some(s => s.includes('previously planned dosing interval'))).toBe(true);
            expect((entry.getLateGuidance(p43)  as GuidanceResult).idealSteps.some(s => s.includes('24 hours'))).toBe(true);
            expect((entry.getLateGuidance(p121) as GuidanceResult).idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });
});

// ─── getHaloperidolDecanoateGuidance ─────────────────────────────────────────
function getHaloperidolGuidance(days: number, variant: string): GuidanceResult {
    return MED_REGISTRY['haloperidol_decanoate'].getLateGuidance({ daysSince: days, variant }) as GuidanceResult;
}

describe('getHaloperidolDecanoateGuidance', () => {
    describe('1-3 prior doses (2-tier: ≤27 not-due | ≤84 check-in | 85+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(getHaloperidolGuidance(20, '1-3').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
        });

        it('28–84 days: check-in guidance', () => {
            const r = getHaloperidolGuidance(60, '1-3');
            expect(r.idealSteps.some(s => s.includes('Administer usual haloperidol decanoate injection'))).toBe(true);
            expect(r.idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('85+ days: reinitiation required', () => {
            const r = getHaloperidolGuidance(100, '1-3');
            expect(r.idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28 and day 84/85', () => {
            expect(getHaloperidolGuidance(27, '1-3').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect(getHaloperidolGuidance(28, '1-3').idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(getHaloperidolGuidance(84, '1-3').idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(getHaloperidolGuidance(85, '1-3').idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });

    describe('4+ prior doses (3-tier: ≤27 not-due | ≤41 routine | 42–84 check-in | 85+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(getHaloperidolGuidance(20, '4+').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
        });

        it('28–41 days: routine', () => {
            const r = getHaloperidolGuidance(35, '4+');
            expect(r.idealSteps.some(s => s.includes('Administer usual haloperidol decanoate injection'))).toBe(true);
            expect(r.idealSteps.some(s => s.includes('4 weeks'))).toBe(true);
            expect(r.providerNotifications).toBeUndefined();
        });

        it('42–84 days: check-in guidance', () => {
            const r = getHaloperidolGuidance(60, '4+');
            expect(r.idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('85+ days: reinitiation required', () => {
            const r = getHaloperidolGuidance(100, '4+');
            expect(r.idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28, day 41/42, day 84/85', () => {
            expect(getHaloperidolGuidance(27, '4+').idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect(getHaloperidolGuidance(28, '4+').idealSteps.some(s => s.includes('4 weeks'))).toBe(true);
            expect(getHaloperidolGuidance(41, '4+').idealSteps.some(s => s.includes('4 weeks'))).toBe(true);
            expect(getHaloperidolGuidance(42, '4+').idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(getHaloperidolGuidance(84, '4+').idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect(getHaloperidolGuidance(85, '4+').idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['haloperidol_decanoate'];

        it('1-3 doses: day 27 → not due; day 28 → check-in; day 85 → reinitiation', () => {
            const p27 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(27), 'haloperidol-prior-doses': '1-3' });
            const p28 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(28), 'haloperidol-prior-doses': '1-3' });
            const p85 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(85), 'haloperidol-prior-doses': '1-3' });
            expect((entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p28) as GuidanceResult).idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect((entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });

        it('4+ doses: day 27 → not due; day 41 → routine; day 42 → check-in; day 85 → reinitiation', () => {
            const p27 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(27), 'haloperidol-prior-doses': '4+' });
            const p41 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(41), 'haloperidol-prior-doses': '4+' });
            const p42 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(42), 'haloperidol-prior-doses': '4+' });
            const p85 = entry.buildLateParams({ 'last-haloperidol': localDaysAgo(85), 'haloperidol-prior-doses': '4+' });
            expect((entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some(s => s.includes('not yet due'))).toBe(true);
            expect((entry.getLateGuidance(p41) as GuidanceResult).idealSteps.some(s => s.includes('4 weeks'))).toBe(true);
            expect((entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some(s => s.includes('6–7 days'))).toBe(true);
            expect((entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some(s => s.includes('Reinitiation is required'))).toBe(true);
        });
    });
});

// ─── guidance.shared.providerNotifications — loader ──────────────────────────

describe('guidance.shared.providerNotifications — loader', () => {
    it('commonProviderNotifications is undefined for meds whose shared array is empty', () => {
        const medsWithNoShared = Object.entries(MED_REGISTRY)
            .filter(([, entry]) => !entry.commonProviderNotifications)
            .map(([key]) => key);
        // Meds with a non-empty shared array (e.g. Invega family) are excluded automatically
        expect(medsWithNoShared.length).toBeGreaterThan(0);
        for (const key of medsWithNoShared) {
            expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].commonProviderNotifications).toBeUndefined();
        }
    });

    it('all three Invega meds load the eGFR shared notification', () => {
        const invegaKeys = ['invega_sustenna', 'invega_trinza', 'invega_hafyera'] as const;
        for (const key of invegaKeys) {
            const notifs = MED_REGISTRY[key].commonProviderNotifications;
            expect(notifs, `${key}: expected commonProviderNotifications to be defined`).toBeDefined();
                expect(hasNotif(notifs, 'eGFR is < 80 mL/min')).toBe(true);
            expect(hasNotif(notifs, 'If eGFR')).toBe(false);
        }
    });

    it('haloperidol_decanoate loads the albumin/bilirubin shared notification', () => {
        const notifs = MED_REGISTRY['haloperidol_decanoate'].commonProviderNotifications;
        expect(notifs).toBeDefined();
        expect(hasNotif(notifs, 'Albumin is < 3.0')).toBe(true);
        expect(hasNotif(notifs, 'bilirubin')).toBe(true);
        expect(hasNotif(notifs, 'If albumin')).toBe(false);
    });

    it('all antipsychotics include the abnormal involuntary movements notification', () => {
        const antipsychotics = [
            'invega_sustenna', 'invega_trinza', 'invega_hafyera',
            'abilify_maintena', 'aristada', 'uzedy',
            'haloperidol_decanoate', 'fluphenazine_decanoate',
        ] as const;
        for (const key of antipsychotics) {
            const notifs = MED_REGISTRY[key].commonProviderNotifications;
            expect(notifs, `${key}: expected commonProviderNotifications to be defined`).toBeDefined();
            expect(hasNotif(notifs, 'New side effects from recent injection'), `${key}: missing side effects notification`).toBe(true);
            expect(hasNotif(notifs, 'abnormal involuntary movements'), `${key}: missing AIMS notification`).toBe(true);
            expect(hasNotif(notifs, 'excessive sedation, dizziness'), `${key}: missing sedation notification`).toBe(true);
            // "New side effects" must appear before "New abnormal involuntary movements"
            const sideIdx = notifs!.findIndex(s => s.includes('New side effects'));
            const aimsIdx = notifs!.findIndex(s => s.includes('abnormal involuntary'));
            expect(sideIdx, `${key}: "New side effects" should come before "New abnormal involuntary movements"`).toBeLessThan(aimsIdx);
        }
    });
});

// ─── renderInfoRow (exercised via buildLateInfoRows) ─────────────────────────

describe('renderInfoRow — all branches', () => {

    // ── static value row ──────────────────────────────────────────────────────
    describe('static value row', () => {
        it('returns the literal value regardless of ctx and daysSince', () => {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 14);
            const row = rows.find(([label]) => label === 'Injection Type:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('Missed/delayed 2nd initiation (156 mg) injection');
        });

        it('maintenance branch has its own static label', () => {
            const ctx = { 'invega-type': 'maintenance', 'last-maintenance': '', 'maintenance-dose': '234' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Injection Type:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('Missed/delayed monthly maintenance injection');
        });
    });

    // ── field row — date format ───────────────────────────────────────────────
    describe('field row — date format', () => {
        it('formats ISO date as localised long date string', () => {
            const ctx = { 'last-trinza': '2026-01-15', 'trinza-dose': '546' };
            const rows = MED_REGISTRY['invega_trinza'].buildLateInfoRows(ctx, 52);
            const row = rows.find(([label]) => label === 'Date of last Trinza injection:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('January 15, 2026');
        });

        it('another date field (sustenna initiation)', () => {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '2025-11-20' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 14);
            const row = rows.find(([label]) => label === 'Date of first (234 mg) injection:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('November 20, 2025');
        });
    });

    // ── field row — option-label format ──────────────────────────────────────
    describe('field row — option-label format', () => {
        it('returns the human-readable label for a known option value', () => {
            const ctx = { 'invega-type': 'maintenance', 'last-maintenance': '', 'maintenance-dose': '39-to-156' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('39 to 156 mg');
        });

        it('returns the other option label correctly', () => {
            const ctx = { 'invega-type': 'maintenance', 'last-maintenance': '', 'maintenance-dose': '234' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row![1]).toBe('234 mg');
        });

        it('falls back to the raw value when the option is not found', () => {
            const ctx = { 'invega-type': 'maintenance', 'last-maintenance': '', 'maintenance-dose': 'unknown-val' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row![1]).toBe('unknown-val');
        });
    });

    // ── computed time — days-months ───────────────────────────────────────────
    describe('computed time — days-months format (trinza)', () => {
        function timeRow(days: number) {
            const ctx = { 'last-trinza': '', 'trinza-dose': '546' };
            const rows = MED_REGISTRY['invega_trinza'].buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since last injection:')![1];
        }

        it('90 days → approximately 3 months (Math.round(90 / 30.44) = 3)', () => {
            expect(timeRow(90)).toBe('90 days (approximately 3 months)');
        });

        it('30 days → approximately 1 month', () => {
            expect(timeRow(30)).toBe('30 days (approximately 1 months)');
        });

        it('0 days → "0 days" with no parenthetical (today = injection day)', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('negative days are clamped to 0 (future date entered)', () => {
            expect(timeRow(-5)).toBe('0 days');
        });
    });

    // ── computed time — days-weeks-months ─────────────────────────────────────
    describe('computed time — days-weeks-months format (hafyera)', () => {
        function timeRow(days: number) {
            const ctx = { 'last-hafyera': '' };
            const rows = MED_REGISTRY['invega_hafyera'].buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since last injection:')![1];
        }

        it('33 days → "4 weeks and 5 days", no "approximately" and no "months"', () => {
            expect(timeRow(33)).toBe('33 days (4 weeks and 5 days)');
            expect(timeRow(33)).not.toContain('approximately');
            expect(timeRow(33)).not.toContain('months');
        });

        it('7 days → "1 week"', () => {
            expect(timeRow(7)).toBe('7 days (1 week)');
        });

        it('14 days → "2 weeks"', () => {
            expect(timeRow(14)).toBe('14 days (2 weeks)');
        });

        it('0 days → "0 days" with no parenthetical', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('negative days are clamped to 0 (future date entered)', () => {
            expect(timeRow(-10)).toBe('0 days');
        });
    });

    // ── computed time — days-weeks (default branch, same output as days-weeks-months) ──
    describe('computed time — days-weeks format (sustenna)', () => {
        function timeRow(days: number) {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since first (234 mg) injection:')![1];
        }

        it('21 days → "3 weeks"', () => {
            expect(timeRow(21)).toBe('21 days (3 weeks)');
        });

        it('10 days → "1 week and 3 days"', () => {
            expect(timeRow(10)).toBe('10 days (1 week and 3 days)');
        });

        it('0 days → "0 days" with no parenthetical', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('negative days are clamped to 0', () => {
            expect(timeRow(-3)).toBe('0 days');
        });
    });
});

// ─── buildCoreDef ─────────────────────────────────────────────────────────────

describe('buildCoreDef — base fields', () => {
    it('earlyDaysBeforeDue is set from early.daysBeforeDue', () => {
        expect(MED_REGISTRY['uzedy'].earlyDaysBeforeDue).toBe(2);
        expect(MED_REGISTRY['aristada'].earlyDaysBeforeDue).toBe(2);
        expect(MED_REGISTRY['invega_hafyera'].earlyDaysBeforeDue).toBe(14);
    });

    it('earlyDaysBeforeDue is absent when JSON has no early.daysBeforeDue', () => {
        expect(MED_REGISTRY['abilify_maintena'].earlyDaysBeforeDue).toBeUndefined();
    });

    it('earlyMinDays is set from early.minDays', () => {
        expect(MED_REGISTRY['abilify_maintena'].earlyMinDays).toBe(26);
        expect(MED_REGISTRY['uzedy'].earlyMinDays).toBe(21);
        expect(MED_REGISTRY['aristada'].earlyMinDays).toBe(21);
    });

    it('earlyMinDays is absent when JSON has no early.minDays', () => {
        expect(MED_REGISTRY['invega_hafyera'].earlyMinDays).toBeUndefined();
    });

    it('commonProviderNotifications is populated from guidance.shared.providerNotifications', () => {
        const notifs = MED_REGISTRY['abilify_maintena'].commonProviderNotifications;
        expect(notifs).toBeDefined();
        expect(notifs!.some(s => s.includes('New side effects'))).toBe(true);
    });

    it('commonProviderNotifications reflects the shared section for any med (invega_hafyera eGFR)', () => {
        const notifs = MED_REGISTRY['invega_hafyera'].commonProviderNotifications;
        expect(notifs).toBeDefined();
        expect(notifs!.some(s => s.includes('eGFR'))).toBe(true);
    });

    it('commonProviderNotifications is absent when guidance.shared.providerNotifications is empty', () => {
        // vivitrol has shared.providerNotifications: [] — zero length → field omitted
        expect(MED_REGISTRY['vivitrol'].commonProviderNotifications).toBeUndefined();
    });
});

describe('buildCoreDef — getLateGuidance variantKey dispatch', () => {
    // 1. explicit variant → used directly regardless of dose
    it('explicit variant used directly (Abilify "1-2" at 28 days → administer)', () => {
        const r = MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 28, variant: '1-2' });
        expect(r.idealSteps.some(s => s.includes('Administer usual Abilify Maintena monthly dose'))).toBe(true);
    });

    it('explicit variant used directly (Abilify "3+" at 50 days → reinitiation)', () => {
        const r = MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 50, variant: '3+' });
        expect(r.idealSteps.some(s => s.includes('Re-initiate'))).toBe(true);
    });

    it('variant takes priority over dose — valid variant + unknown dose does not throw', () => {
        // If dose were checked first, 'unknown-dose' would fall through to 'default' (nonexistent in Abilify) → throw.
        // variant being prioritised avoids this.
        expect(() =>
            MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 28, variant: '1-2', dose: 'unknown-dose' })
        ).not.toThrow();
        const r = MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 28, variant: '1-2', dose: 'unknown-dose' });
        expect(r.idealSteps.length).toBeGreaterThan(0);
    });

    // 2. dose IS a variant key → dose used as variantKey (Aristada)
    it('dose used as variantKey when it matches a variant key (Aristada 441, 7-day tier)', () => {
        const r = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 45, dose: '441' });
        expect(r.idealSteps.some(s => s.includes('7 days'))).toBe(true);
    });

    it('dose used as variantKey when it matches a variant key (Aristada 662, 7-day tier)', () => {
        const r = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 70, dose: '662' });
        expect(r.idealSteps.some(s => s.includes('7 days'))).toBe(true);
    });

    it('dose used as variantKey for Aristada 1064 (no-supp tier at 60 days)', () => {
        const r = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 60, dose: '1064' });
        expect(r.idealSteps.some(s => s.includes('No supplementation required'))).toBe(true);
    });

    // 3. dose does NOT match a variant key → falls back to 'default' (Uzedy)
    it('falls back to "default" when dose does not match any variant key (Uzedy "150-or-less")', () => {
        // Uzedy only has a "default" variant; "150-or-less" is a guidanceByDoseRules value, not a variant key
        const r = MED_REGISTRY['uzedy'].getLateGuidance({ daysSince: 200, dose: '150-or-less' });
        expect(r.idealSteps.some(s => s.includes('150 mg or less'))).toBe(true);
    });

    it('falls back to "default" for Uzedy "200-or-more" (not a variant key)', () => {
        const r = MED_REGISTRY['uzedy'].getLateGuidance({ daysSince: 200, dose: '200-or-more' });
        // tier 3 is static — 200-or-more falls back to "default" and gets the same content as 150-or-less
        expect(r.idealSteps.some(s => s.includes('150 mg or less'))).toBe(true);
    });

    // 4. neither variant nor dose → 'default' used (single-variant med)
    it('uses "default" variant when neither variant nor dose is provided (Invega Hafyera)', () => {
        const r = MED_REGISTRY['invega_hafyera'].getLateGuidance({ daysSince: 220 });
        expect(r.idealSteps.length).toBeGreaterThan(0);
    });

    // 5. unknown variant key → throws with descriptive message
    it('throws a descriptive error for an unknown explicit variant', () => {
        expect(() =>
            MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 30, variant: 'bad-group' })
        ).toThrow(/Unknown variant key.*bad-group/);
    });

    it('throws when unrecognised dose falls back to "default" but no "default" key exists (Aristada)', () => {
        // Aristada has no "default" variant (only "441", "662", "882", "1064")
        // Unrecognised dose → variantKey resolves to "default" → not found → throws
        expect(() =>
            MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 30, dose: 'bad-dose' })
        ).toThrow(/Unknown variant key.*default/);
    });

    it('throw message lists all available variant keys', () => {
        try {
            MED_REGISTRY['abilify_maintena'].getLateGuidance({ daysSince: 30, variant: 'bad-group' });
            expect.fail('should have thrown');
        } catch (e: unknown) {
            const msg = (e as Error).message;
            expect(msg).toContain('1-2');
            expect(msg).toContain('3+');
        }
    });
});

describe('buildCoreDef — sameAs variant deduplication', () => {
    // Aristada 882 is declared as sameAs: "662" — shares the same LateTier[] reference
    it('882 and 662 produce identical idealSteps (sameAs deduplication)', () => {
        const r662 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 70, dose: '662' });
        const r882 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 70, dose: '882' });
        expect(r882.idealSteps).toEqual(r662.idealSteps);
    });

    it('882 and 662 share tier boundaries at 56 days (no-supp window tier)', () => {
        const r662 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 56, dose: '662' });
        const r882 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 56, dose: '882' });
        expect(r882.idealSteps).toEqual(r662.idealSteps);
    });

    it('882 and 662 share tier boundaries at 57 days (7-day supp tier)', () => {
        const r662 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 57, dose: '662' });
        const r882 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 57, dose: '882' });
        expect(r882.idealSteps).toEqual(r662.idealSteps);
    });

    it('882 and 662 share tier boundaries at 90 days (21-day supp tier)', () => {
        const r662 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 90, dose: '662' });
        const r882 = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 90, dose: '882' });
        expect(r882.idealSteps).toEqual(r662.idealSteps);
    });

    it('sameAs resolved regardless of JSON order — 882 correctly aliases 662 tiers', () => {
        // buildVariantMap processes own-tiers first, then sameAs, so 662 always exists when 882 aliases it
        const r = MED_REGISTRY['aristada'].getLateGuidance({ daysSince: 90, dose: '882' });
        expect(r.idealSteps.length).toBeGreaterThan(0);
    });
});
