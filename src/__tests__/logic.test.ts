import { describe, it, expect } from 'vitest';
import {
    getMedicationDisplayName,
    getEarlyGuidanceContent,
    formatWeeksAndDays,
    getInvegaInitiationGuidance,
    getInvegaMaintenanceGuidance,
    getInvegaTrinzaGuidance,
    getInvegaHafyeraGuidanceCategory,
    getAbilifyMaintenaGuidance,
    getAristadaGuidance,
    getUzedyGuidance,
} from '../logic';

// ─── getMedicationDisplayName ─────────────────────────────────────────────────

describe('getMedicationDisplayName', () => {
    it('returns full name for known medication key', () => {
        expect(getMedicationDisplayName('invega_sustenna')).toBe('Invega Sustenna (paliperidone palmitate)');
        expect(getMedicationDisplayName('vivitrol')).toBe('Vivitrol (naltrexone)');
        expect(getMedicationDisplayName('uzedy')).toBe('Uzedy (risperidone subcutaneous)');
    });

    it('returns the raw key when medication is unknown', () => {
        expect(getMedicationDisplayName('unknown_med')).toBe('unknown_med');
    });
});

// ─── getEarlyGuidanceContent ──────────────────────────────────────────────────

describe('getEarlyGuidanceContent', () => {
    it('returns early guidance for known medications', () => {
        expect(getEarlyGuidanceContent('invega_trinza')).toBe('2 weeks before due date');
        expect(getEarlyGuidanceContent('abilify_maintena')).toBe('No sooner than 26 days after last injection');
    });

    it('returns fallback text for unknown medication', () => {
        expect(getEarlyGuidanceContent('unknown')).toContain('DESC LAI standing order document');
    });
});

// ─── formatWeeksAndDays ───────────────────────────────────────────────────────

describe('formatWeeksAndDays', () => {
    it('returns days only when less than 1 week', () => {
        expect(formatWeeksAndDays(0)).toBe('0 days');
        expect(formatWeeksAndDays(1)).toBe('1 day');
        expect(formatWeeksAndDays(6)).toBe('6 days');
    });

    it('returns weeks only when evenly divisible', () => {
        expect(formatWeeksAndDays(7)).toBe('1 week');
        expect(formatWeeksAndDays(14)).toBe('2 weeks');
        expect(formatWeeksAndDays(28)).toBe('4 weeks');
    });

    it('returns weeks and days for mixed values', () => {
        expect(formatWeeksAndDays(8)).toBe('1 week, 1 day');
        expect(formatWeeksAndDays(10)).toBe('1 week, 3 days');
        expect(formatWeeksAndDays(45)).toBe('6 weeks, 3 days');
    });
});

// ─── getInvegaInitiationGuidance ──────────────────────────────────────────────

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

// ─── getInvegaMaintenanceGuidance ─────────────────────────────────────────────

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
});

// ─── getInvegaTrinzaGuidance ──────────────────────────────────────────────────

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
});

// ─── getInvegaHafyeraGuidanceCategory ────────────────────────────────────────

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

// ─── getAbilifyMaintenaGuidance ───────────────────────────────────────────────

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

// ─── getAristadaGuidance ──────────────────────────────────────────────────────

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
    });
});

// ─── getUzedyGuidance ─────────────────────────────────────────────────────────

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
});
