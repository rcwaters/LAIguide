import { describe, it, expect } from 'vitest';
import { MED_REGISTRY, pluralDays, composeEarlyGuidance } from '../medLoader';
import type { GuidanceResult, SupplementalGuidanceResult, CategoricalGuidanceResult } from '../interfaces/guidance';

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
function getInvegaHafyeraGuidanceCategory(days: number): CategoricalGuidanceResult {
    return MED_REGISTRY['invega_hafyera'].getLateGuidance({ daysSince: days }) as CategoricalGuidanceResult;
}
function getAbilifyMaintenaGuidance(weeks: number, doses: string): GuidanceResult {
    return MED_REGISTRY['abilify_maintena'].getLateGuidance({ weeksSince: weeks, variant: doses }) as GuidanceResult;
}
function getAristadaGuidance(days: number, dose: string): SupplementalGuidanceResult {
    return MED_REGISTRY['aristada'].getLateGuidance({ daysSince: days, dose }) as SupplementalGuidanceResult;
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
        it('before-next, no note',   () => expect(composeEarlyGuidance('before-next', 7,  undefined, undefined)).toBe('1 week before due date'));
        it('before-next, with note', () => expect(composeEarlyGuidance('before-next', 3,  undefined, 'DESC created guidance')).toBe('3 days before due date  \n*(DESC created guidance)*'));
        it('since-last, no note',    () => expect(composeEarlyGuidance('since-last',  undefined, 21, undefined)).toBe('No sooner than 3 weeks after last injection'));
        it('since-last, with note',  () => expect(composeEarlyGuidance('since-last',  undefined, 21, 'This may be given earlier with provider approval')).toBe('No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'));
        it('since-last, non-week days', () => expect(composeEarlyGuidance('since-last', undefined, 26, undefined)).toBe('No sooner than 26 days after last injection'));
    });

    // ── Registry: earlyGuidance string ─────────────────────────────────────
    describe('registry earlyGuidance string', () => {
        it('returns early guidance content for known medications', () => {
            expect(MED_REGISTRY['invega_trinza'].earlyGuidance).toBe('2 weeks before due date');
            expect(MED_REGISTRY['abilify_maintena'].earlyGuidance).toBe('No sooner than 26 days after last injection');
        });
        const cases: [string, string][] = [
            ['aristada',             '1 week before due date'],
            ['invega_sustenna',      '1 week before due date  \n*(Note: after completing full initiation process)*'],
            ['invega_hafyera',       '2 weeks before due date'],
            ['fluphenazine_decanoate','3 days before due date  \n*(DESC created guidance)*'],
            ['haloperidol_decanoate','3 days before due date  \n*(DESC created guidance)*'],
            ['uzedy',               '3 days before due date  \n*(DESC created guidance)*'],
            ['brixadi',             'No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'],
            ['sublocade',           'No sooner than 3 weeks after last injection  \n*(This may be given earlier with provider approval)*'],
            ['vivitrol',            'No sooner than 3 weeks after last injection'],
        ];
        for (const [key, expected] of cases) {
            it(`${key} earlyGuidance`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyGuidance).toBe(expected));
        }
    });

    // ── Registry: earlyWindowType ───────────────────────────────────────────
    describe('registry earlyWindowType', () => {
        const beforeNext = ['aristada', 'invega_sustenna', 'invega_trinza', 'invega_hafyera',
                            'fluphenazine_decanoate', 'haloperidol_decanoate', 'uzedy'];
        const sinceLast  = ['abilify_maintena', 'brixadi', 'sublocade', 'vivitrol'];
        for (const key of beforeNext) {
            it(`${key} → before-next`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyWindowType).toBe('before-next'));
        }
        for (const key of sinceLast) {
            it(`${key} → since-last`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyWindowType).toBe('since-last'));
        }
    });

    // ── Registry: earlyWindowDays / earlyMinDays ────────────────────────────
    describe('registry earlyWindowDays and earlyMinDays', () => {
        const windowDayCases: [string, number][] = [
            ['aristada',              7],
            ['invega_sustenna',       7],
            ['invega_trinza',        14],
            ['invega_hafyera',       14],
            ['fluphenazine_decanoate', 3],
            ['haloperidol_decanoate',  3],
            ['uzedy',                  3],
        ];
        for (const [key, days] of windowDayCases) {
            it(`${key} earlyWindowDays = ${days}`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyWindowDays).toBe(days));
        }
        const minDayCases: [string, number][] = [
            ['abilify_maintena', 26],
            ['brixadi',          21],
            ['sublocade',        21],
            ['vivitrol',         21],
        ];
        for (const [key, days] of minDayCases) {
            it(`${key} earlyMinDays = ${days}`, () =>
                expect(MED_REGISTRY[key as keyof typeof MED_REGISTRY].earlyMinDays).toBe(days));
        }
        it('before-next meds have no earlyMinDays', () => {
            expect(MED_REGISTRY['uzedy'].earlyMinDays).toBeUndefined();
        });
        it('since-last meds have no earlyWindowDays', () => {
            expect(MED_REGISTRY['abilify_maintena'].earlyWindowDays).toBeUndefined();
        });
    });
});
describe('getInvegaInitiationGuidance', () => {
    it('≤12 days: not due / proceed with original plans', () => {
        const r0  = getInvegaInitiationGuidance(0);
        const r12 = getInvegaInitiationGuidance(12);
        expect(r0.idealSteps).toContain('not due or not significantly overdue');
        expect(r12.idealSteps).toContain('not due or not significantly overdue');
    });

    it('13–28 days: administer 156 mg, then 117 mg at week 5', () => {
        const r13 = getInvegaInitiationGuidance(13);
        const r28 = getInvegaInitiationGuidance(28);
        expect(r13.idealSteps).toContain('156 mg');
        expect(r13.idealSteps).toContain('117 mg');
        expect(r28.idealSteps).toContain('117 mg');
        expect(r13.providerNotification).toContain('117 mg');
    });

    it('29–49 days: 156 mg then 2nd 156 mg 1 week later', () => {
        const r29 = getInvegaInitiationGuidance(29);
        const r49 = getInvegaInitiationGuidance(49);
        expect(r29.idealSteps).toContain('2nd 156 mg');
        expect(r49.idealSteps).toContain('2nd 156 mg');
    });

    it('50–180 days: restart with 234 mg', () => {
        const r50  = getInvegaInitiationGuidance(50);
        const r180 = getInvegaInitiationGuidance(180);
        expect(r50.idealSteps).toContain('234 mg');
        expect(r180.idealSteps).toContain('234 mg');
    });

    it('181+ days: consult provider before any injection', () => {
        const r181 = getInvegaInitiationGuidance(181);
        const r365 = getInvegaInitiationGuidance(365);
        expect(r181.idealSteps).toContain('Consult provider');
        expect(r181.providerNotification).toContain('Before any injection');
        expect(r365.providerNotification).toContain('Before any injection');
    });

    it('has all required fields', () => {
        [0, 20, 35, 100, 200].forEach(d => {
            const r = getInvegaInitiationGuidance(d);
            expect(r).toHaveProperty('idealSteps');
            expect(r).toHaveProperty('providerNotification');
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
        const r = getInvegaMaintenanceGuidance(10, '156-or-less');
        expect(r.idealSteps).toContain('not significantly overdue');
        expect(r.providerNotification).toContain('No provider notification');
    });

    it('28–42 days: administer usual dose, resume 4-week cycle (both doses)', () => {
        (['156-or-less', '234'] as const).forEach(dose => {
            const r = getInvegaMaintenanceGuidance(35, dose);
            expect(r.idealSteps).toContain('4 weeks later');
            expect(r.providerNotification).toBeUndefined();
        });
    });

    it('43–180 days, 156-or-less: 2nd usual dose 1 week later', () => {
        const r = getInvegaMaintenanceGuidance(90, '156-or-less');
        expect(r.idealSteps).toContain('2nd usual maintenance dose');
        expect(r.providerNotification).toContain('2nd usual maintenance dose');
    });

    it('43–180 days, 234 mg: step down to 156 mg x2 then resume 234 mg', () => {
        const r = getInvegaMaintenanceGuidance(90, '234');
        expect(r.idealSteps).toContain('156 mg Invega Sustenna');
        expect(r.idealSteps).toContain('234 mg');
    });

    it('181+ days: consult provider — reinitiation needed', () => {
        const r = getInvegaMaintenanceGuidance(200, '156-or-less');
        expect(r.idealSteps).toContain('reinitiation');
        expect(r.providerNotification).toContain('Before any injection');
    });

    it('exact tier boundaries (maxDays: 27, 42, 180, Infinity)', () => {
        // day 27 → tier 1: not due
        expect(getInvegaMaintenanceGuidance(27, '156-or-less').idealSteps).toContain('not significantly overdue');
        // day 28 → tier 2: on-time
        expect(getInvegaMaintenanceGuidance(28, '156-or-less').idealSteps).toContain('4 weeks later');
        // day 42 → tier 2: still on-time
        expect(getInvegaMaintenanceGuidance(42, '156-or-less').idealSteps).toContain('4 weeks later');
        // day 43 → tier 3: overdue (dose-variant)
        expect(getInvegaMaintenanceGuidance(43, '156-or-less').idealSteps).toContain('2nd usual maintenance dose');
        // day 180 → tier 3: still overdue
        expect(getInvegaMaintenanceGuidance(180, '156-or-less').idealSteps).toContain('2nd usual maintenance dose');
        // day 181 → tier 4: reinitiation
        expect(getInvegaMaintenanceGuidance(181, '156-or-less').idealSteps).toContain('reinitiation');
    });
});
describe('getInvegaTrinzaGuidance', () => {
    it('<90 days: not yet due — refer to early guidance', () => {
        const r = getInvegaTrinzaGuidance(60, '410');
        expect(r.idealSteps).toContain('not yet due');
    });

    it('90–120 days: administer usual Trinza dose', () => {
        const r = getInvegaTrinzaGuidance(100, '546');
        expect(r.idealSteps).toContain('usual Invega Trinza dose');
    });

    it('121–270 days, 410 mg dose: bridge with Sustenna 117 mg x2', () => {
        const r = getInvegaTrinzaGuidance(150, '410');
        expect(r.idealSteps).toContain('117 mg');
        expect(r.idealSteps).toContain('410 mg');
    });

    it('121–270 days, 546/819 mg dose: bridge with Sustenna 156 mg x2', () => {
        (['546', '819'] as const).forEach(dose => {
            const r = getInvegaTrinzaGuidance(150, dose);
            expect(r.idealSteps).toContain('156 mg');
            expect(r.providerNotification).toContain('Consult provider');
        });
    });

    it('271+ days: reinitiation required', () => {
        const r = getInvegaTrinzaGuidance(300, '546');
        expect(r.idealSteps).toContain('Reinitiation');
        expect(r.providerNotification).toContain('Consult provider');
    });

    it('exact tier boundaries (maxDays: 89, 120, 270, Infinity)', () => {
        // day 89 → tier 1: not yet due
        expect(getInvegaTrinzaGuidance(89, '546').idealSteps).toContain('not yet due');
        // day 90 → tier 2: on-time
        expect(getInvegaTrinzaGuidance(90, '546').idealSteps).toContain('usual Invega Trinza dose');
        // day 120 → tier 2: still on-time
        expect(getInvegaTrinzaGuidance(120, '546').idealSteps).toContain('usual Invega Trinza dose');
        // day 121 → tier 3: bridge with Sustenna (dose-variant)
        expect(getInvegaTrinzaGuidance(121, '546').idealSteps).toContain('156 mg');
        // day 270 → tier 3: still bridge
        expect(getInvegaTrinzaGuidance(270, '546').idealSteps).toContain('156 mg');
        // day 271 → tier 4: reinitiation
        expect(getInvegaTrinzaGuidance(271, '546').idealSteps).toContain('Reinitiation');
    });
});
describe('getInvegaHafyeraGuidanceCategory', () => {
    it('returns "early" for <181 days', () => {
        expect(getInvegaHafyeraGuidanceCategory(0)).toBe('early');
        expect(getInvegaHafyeraGuidanceCategory(180)).toBe('early');
    });

    it('returns "on-time" for 181–202 days', () => {
        expect(getInvegaHafyeraGuidanceCategory(181)).toBe('on-time');
        expect(getInvegaHafyeraGuidanceCategory(202)).toBe('on-time');
    });

    it('returns "consult" for 203+ days', () => {
        expect(getInvegaHafyeraGuidanceCategory(203)).toBe('consult');
        expect(getInvegaHafyeraGuidanceCategory(365)).toBe('consult');
    });
});
describe('getAbilifyMaintenaGuidance', () => {
    it('<4 weeks: not yet due', () => {
        const r = getAbilifyMaintenaGuidance(3, '3+');
        expect(r.idealSteps).toContain('not due');
    });

    it('1-2 doses, 4–5 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(5, '1-2');
        expect(r.idealSteps).toContain('usual Abilify Maintena monthly dose');
        expect(r.providerNotification).toBeUndefined();
    });

    it('1-2 doses, 6+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(6, '1-2');
        expect(r.idealSteps).toContain('Re-initiate');
        expect(r.providerNotification).toContain('notify provider');
    });

    it('3+ doses, 4–6 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(6, '3+');
        expect(r.idealSteps).toContain('usual Abilify Maintena monthly dose');
        expect(r.providerNotification).toBeUndefined();
    });

    it('3+ doses, 7+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(7, '3+');
        expect(r.idealSteps).toContain('Re-initiate');
        expect(r.providerNotification).toContain('notify provider');
    });
});
describe('getAristadaGuidance', () => {
    it('<28 days: not yet due', () => {
        const r = getAristadaGuidance(10, '441');
        expect(r.notDue).toBe(true);
        if (r.notDue) expect(r.message).toContain('not yet due');
    });

    describe('441 mg dose', () => {
        it('29–42 days: no supplementation', () => {
            const r = getAristadaGuidance(35, '441');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toBeUndefined();
        });

        it('43–49 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(45, '441');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('7 days');
        });

        it('50+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(60, '441');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('21 days');
        });

        it('exact tier boundaries (not-due: <28; maxDays: 42, 49, Infinity)', () => {
            // day 27 → not due (<28)
            expect(getAristadaGuidance(27, '441').notDue).toBe(true);
            // day 28 → no supplementation (maxDays:42)
            const r28 = getAristadaGuidance(28, '441'); expect(r28.notDue).toBe(false);
            if (!r28.notDue) expect(r28.supplementation).toBeUndefined();
            // day 42 → no supplementation (still maxDays:42)
            const r42 = getAristadaGuidance(42, '441'); expect(r42.notDue).toBe(false);
            if (!r42.notDue) expect(r42.supplementation).toBeUndefined();
            // day 43 → 7-day supplementation (maxDays:49)
            const r43 = getAristadaGuidance(43, '441'); expect(r43.notDue).toBe(false);
            if (!r43.notDue) expect(r43.supplementation).toContain('7 days');
            // day 49 → 7-day supplementation (still maxDays:49)
            const r49 = getAristadaGuidance(49, '441'); expect(r49.notDue).toBe(false);
            if (!r49.notDue) expect(r49.supplementation).toContain('7 days');
            // day 50 → 21-day supplementation (maxDays:Infinity)
            const r50 = getAristadaGuidance(50, '441'); expect(r50.notDue).toBe(false);
            if (!r50.notDue) expect(r50.supplementation).toContain('21 days');
        });
    });

    describe('662 mg dose', () => {
        it('29–56 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '662');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toBeUndefined();
        });

        it('57–84 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(70, '662');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('7 days');
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '662');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('21 days');
        });

        it('exact tier boundaries (not-due: <28; maxDays: 56, 84, Infinity)', () => {
            // day 56 → no supplementation (maxDays:56)
            const r56 = getAristadaGuidance(56, '662'); expect(r56.notDue).toBe(false);
            if (!r56.notDue) expect(r56.supplementation).toBeUndefined();
            // day 57 → 7-day supplementation (maxDays:84)
            const r57 = getAristadaGuidance(57, '662'); expect(r57.notDue).toBe(false);
            if (!r57.notDue) expect(r57.supplementation).toContain('7 days');
            // day 84 → 7-day supplementation (still maxDays:84)
            const r84 = getAristadaGuidance(84, '662'); expect(r84.notDue).toBe(false);
            if (!r84.notDue) expect(r84.supplementation).toContain('7 days');
            // day 85 → 21-day supplementation (maxDays:Infinity)
            const r85 = getAristadaGuidance(85, '662'); expect(r85.notDue).toBe(false);
            if (!r85.notDue) expect(r85.supplementation).toContain('21 days');
        });
    });

    describe('882 mg dose (same thresholds as 662)', () => {
        it('29–56 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '882');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toBeUndefined();
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '882');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('21 days');
        });

        it('exact tier boundaries (identical to 662: maxDays 56, 84, Infinity)', () => {
            // day 56 → no supplementation (maxDays:56)
            const r56 = getAristadaGuidance(56, '882'); expect(r56.notDue).toBe(false);
            if (!r56.notDue) expect(r56.supplementation).toBeUndefined();
            // day 57 → 7-day supplementation (maxDays:84)
            const r57 = getAristadaGuidance(57, '882'); expect(r57.notDue).toBe(false);
            if (!r57.notDue) expect(r57.supplementation).toContain('7 days');
            // day 84 → 7-day supplementation (still maxDays:84)
            const r84 = getAristadaGuidance(84, '882'); expect(r84.notDue).toBe(false);
            if (!r84.notDue) expect(r84.supplementation).toContain('7 days');
            // day 85 → 21-day supplementation (maxDays:Infinity)
            const r85 = getAristadaGuidance(85, '882'); expect(r85.notDue).toBe(false);
            if (!r85.notDue) expect(r85.supplementation).toContain('21 days');
        });
    });

    describe('1064 mg dose', () => {
        it('29–70 days: no supplementation', () => {
            const r = getAristadaGuidance(60, '1064');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toBeUndefined();
        });

        it('71–84 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(78, '1064');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('7 days');
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(100, '1064');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('21 days');
        });

        it('exact tier boundaries (not-due: <28; maxDays: 70, 84, Infinity)', () => {
            // day 70 → no supplementation (maxDays:70)
            const r70 = getAristadaGuidance(70, '1064'); expect(r70.notDue).toBe(false);
            if (!r70.notDue) expect(r70.supplementation).toBeUndefined();
            // day 71 → 7-day supplementation (maxDays:84)
            const r71 = getAristadaGuidance(71, '1064'); expect(r71.notDue).toBe(false);
            if (!r71.notDue) expect(r71.supplementation).toContain('7 days');
            // day 84 → 7-day supplementation (still maxDays:84)
            const r84 = getAristadaGuidance(84, '1064'); expect(r84.notDue).toBe(false);
            if (!r84.notDue) expect(r84.supplementation).toContain('7 days');
            // day 85 → 21-day supplementation (maxDays:Infinity)
            const r85 = getAristadaGuidance(85, '1064'); expect(r85.notDue).toBe(false);
            if (!r85.notDue) expect(r85.supplementation).toContain('21 days');
        });
    });
});
describe('getUzedyGuidance', () => {
    it('<28 days: not yet due', () => {
        const r = getUzedyGuidance(10, '150-or-less');
        expect(r.idealSteps).toContain('not yet due');
    });

    it('28–119 days: administer usual dose', () => {
        const r = getUzedyGuidance(60, '150-or-less');
        expect(r.idealSteps).toContain('usual Uzedy maintenance dose');
        expect(r.providerNotification).toContain('FYI');
    });

    it('120–180 days: administer usual dose + sedation check', () => {
        const r = getUzedyGuidance(150, '200-or-more');
        expect(r.idealSteps).toContain('sedation');
        expect(r.providerNotification).toContain('FYI');
    });

    it('181+ days, 150-or-less: usual dose + sedation check', () => {
        const r = getUzedyGuidance(200, '150-or-less');
        expect(r.idealSteps).toContain('150 mg or less');
        expect(r.idealSteps).toContain('sedation');
    });

    it('181+ days, 200-or-more: try to contact prescriber first', () => {
        const r = getUzedyGuidance(200, '200-or-more');
        expect(r.idealSteps).toContain('contact prescriber');
        expect(r.idealSteps).toContain('150 mg');
        expect(r.providerNotification).toContain('notify the provider');
    });

    it('exact tier boundaries (maxDays: 27, 119, 180, Infinity)', () => {
        // day 27 → tier 1: not yet due
        expect(getUzedyGuidance(27, '150-or-less').idealSteps).toContain('not yet due');
        // day 28 → tier 2: administer usual dose (maxDays:119)
        expect(getUzedyGuidance(28, '150-or-less').idealSteps).toContain('usual Uzedy maintenance dose');
        // day 119 → tier 2: still administer usual dose
        expect(getUzedyGuidance(119, '150-or-less').idealSteps).toContain('usual Uzedy maintenance dose');
        // day 120 → tier 3: administer + sedation check (maxDays:180)
        expect(getUzedyGuidance(120, '150-or-less').idealSteps).toContain('sedation');
        // day 180 → tier 3: still sedation check
        expect(getUzedyGuidance(180, '150-or-less').idealSteps).toContain('sedation');
        // day 181 → tier 4: dose-variant (maxDays:Infinity)
        expect(getUzedyGuidance(181, '150-or-less').idealSteps).toContain('150 mg or less');
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
            const ctx = { 'invega-type': 'maintenance', 'last-maintenance': '', 'maintenance-dose': '156-or-less' };
            const rows = MED_REGISTRY['invega_sustenna'].buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('156 mg or less');
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
