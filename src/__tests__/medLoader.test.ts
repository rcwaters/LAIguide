import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
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
describe('displayName', () => {
    it('returns full name for known medication keys', () => {
        expect(MED_REGISTRY['invega_sustenna'].displayName).toBe('Invega Sustenna (paliperidone palmitate)');
        expect(MED_REGISTRY['vivitrol'].displayName).toBe('Vivitrol (naltrexone)');
        expect(MED_REGISTRY['uzedy'].displayName).toBe('Uzedy (risperidone subcutaneous)');
    });
});
describe('earlyGuidance', () => {
    it('returns early guidance content for known medications', () => {
        expect(MED_REGISTRY['invega_trinza'].earlyGuidance).toBe('2 weeks before due date');
        expect(MED_REGISTRY['abilify_maintena'].earlyGuidance).toBe('No sooner than 26 days after last injection');
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

    it('has all three required fields', () => {
        [0, 20, 35, 100, 200].forEach(d => {
            const r = getInvegaInitiationGuidance(d);
            expect(r).toHaveProperty('idealSteps');
            expect(r).toHaveProperty('pragmaticVariations');
            expect(r).toHaveProperty('providerNotification');
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
            expect(r.providerNotification).toContain('No need');
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
        expect(r.providerNotification).toContain('No need');
    });

    it('1-2 doses, 6+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(6, '1-2');
        expect(r.idealSteps).toContain('Re-initiate');
        expect(r.providerNotification).toContain('notify provider');
    });

    it('3+ doses, 4–6 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(6, '3+');
        expect(r.idealSteps).toContain('usual Abilify Maintena monthly dose');
        expect(r.providerNotification).toContain('No need');
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
            if (!r.notDue) expect(r.supplementation).toContain('No supplementation');
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
            if (!r28.notDue) expect(r28.supplementation).toContain('No supplementation');
            // day 42 → no supplementation (still maxDays:42)
            const r42 = getAristadaGuidance(42, '441'); expect(r42.notDue).toBe(false);
            if (!r42.notDue) expect(r42.supplementation).toContain('No supplementation');
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
            if (!r.notDue) expect(r.supplementation).toContain('No supplementation');
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
            if (!r56.notDue) expect(r56.supplementation).toContain('No supplementation');
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
            if (!r.notDue) expect(r.supplementation).toContain('No supplementation');
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '882');
            expect(r.notDue).toBe(false);
            if (!r.notDue) expect(r.supplementation).toContain('21 days');
        });

        it('exact tier boundaries (identical to 662: maxDays 56, 84, Infinity)', () => {
            // day 56 → no supplementation (maxDays:56)
            const r56 = getAristadaGuidance(56, '882'); expect(r56.notDue).toBe(false);
            if (!r56.notDue) expect(r56.supplementation).toContain('No supplementation');
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
            if (!r.notDue) expect(r.supplementation).toContain('No supplementation');
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
            if (!r70.notDue) expect(r70.supplementation).toContain('No supplementation');
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
