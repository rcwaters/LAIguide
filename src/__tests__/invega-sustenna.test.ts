import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getInvegaInitiationGuidance(days: number): GuidanceResult {
    return MED_REGISTRY['invega_sustenna'].getLateGuidance({
        daysSince: days,
        variant: 'initiation',
    }) as GuidanceResult;
}
function getInvegaMaintenanceGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['invega_sustenna'].getLateGuidance({
        daysSince: days,
        variant: 'maintenance',
        dose,
    }) as GuidanceResult;
}

describe('getInvegaInitiationGuidance', () => {
    const stepText = (idealSteps: string[]) => idealSteps.join('\n\n');

    it('≤12 days: not significantly overdue', () => {
        const r0 = getInvegaInitiationGuidance(0);
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
        const r50 = getInvegaInitiationGuidance(50);
        const r120 = getInvegaInitiationGuidance(120);
        expect(stepText(r50.idealSteps)).toContain('234 mg');
        expect(stepText(r120.idealSteps)).toContain('234 mg');
    });

    it('121+ days (>4 months): consult provider before any injection', () => {
        const r121 = getInvegaInitiationGuidance(121);
        const r365 = getInvegaInitiationGuidance(365);
        expect(r121.idealSteps.some((s) => s.includes('Consult provider'))).toBe(true);
        expect(hasNotif(r121.providerNotifications, 'Before any injection')).toBe(true);
        expect(hasNotif(r365.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 12, 28, 49, 120, Infinity)', () => {
        expect(stepText(getInvegaInitiationGuidance(12).idealSteps)).toContain(
            'not significantly overdue',
        );
        expect(stepText(getInvegaInitiationGuidance(13).idealSteps)).toContain('117 mg');
        expect(stepText(getInvegaInitiationGuidance(28).idealSteps)).toContain('117 mg');
        expect(stepText(getInvegaInitiationGuidance(29).idealSteps)).toContain('2nd 156 mg');
        expect(stepText(getInvegaInitiationGuidance(49).idealSteps)).toContain('2nd 156 mg');
        expect(stepText(getInvegaInitiationGuidance(50).idealSteps)).toContain(
            'Restart initiation',
        );
        expect(stepText(getInvegaInitiationGuidance(120).idealSteps)).toContain(
            'Restart initiation',
        );
        expect(stepText(getInvegaInitiationGuidance(121).idealSteps)).toContain('Consult provider');
    });

    it('121+ days includes pragmatic variation about 156 mg fallback only with provider guidance', () => {
        const r121 = getInvegaInitiationGuidance(121);
        expect(r121.pragmaticVariations).toBeDefined();
        expect(r121.pragmaticVariations!.some((s) => s.includes('156 mg injection'))).toBe(true);
        expect(r121.pragmaticVariations!.some((s) => s.includes('Consult provider'))).toBe(true);
    });

    it('has all required fields', () => {
        [0, 20, 35, 100, 121, 200].forEach((d) => {
            const r = getInvegaInitiationGuidance(d);
            expect(r).toHaveProperty('idealSteps');
            expect(r).toHaveProperty('providerNotifications');
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
        expect(r.idealSteps.some((s) => s.includes('not significantly overdue'))).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('28–42 days: administer usual dose, resume 4-week cycle (both doses)', () => {
        (['39-to-156', '234'] as const).forEach((dose) => {
            const r = getInvegaMaintenanceGuidance(35, dose);
            expect(
                r.idealSteps.some((s) =>
                    s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'),
                ),
            ).toBe(true);
            expect(r.providerNotifications).toBeUndefined();
        });
    });

    it('43–120 days, 39-to-156: 2nd usual dose 1 week later', () => {
        const r = getInvegaMaintenanceGuidance(90, '39-to-156');
        expect(
            r.idealSteps.some((s) =>
                s.includes(
                    'Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.',
                ),
            ),
        ).toBe(true);
        expect(hasNotif(r.providerNotifications, '2nd usual maintenance dose')).toBe(true);
    });

    it('43–120 days, 234 mg: step down to 156 mg x2 then resume 234 mg', () => {
        const r = getInvegaMaintenanceGuidance(90, '234');
        expect(r.idealSteps.some((s) => s.includes('Administer 156 mg Invega Sustenna'))).toBe(
            true,
        );
        expect(
            r.idealSteps.some((s) =>
                s.includes('Then resume usual monthly doses with 234 mg at 4 weeks after step 2.'),
            ),
        ).toBe(true);
    });

    it('121+ days: consult provider — reinitiation needed', () => {
        const r = getInvegaMaintenanceGuidance(200, '39-to-156');
        expect(r.idealSteps.some((s) => s.includes('reinitiation'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 27, 42, 120, Infinity)', () => {
        expect(
            getInvegaMaintenanceGuidance(27, '39-to-156').idealSteps.some((s) =>
                s.includes('not significantly overdue'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(28, '39-to-156').idealSteps.some((s) =>
                s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(42, '39-to-156').idealSteps.some((s) =>
                s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(43, '39-to-156').idealSteps.some((s) =>
                s.includes(
                    'Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.',
                ),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(120, '39-to-156').idealSteps.some((s) =>
                s.includes(
                    'Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.',
                ),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(121, '39-to-156').idealSteps.some((s) =>
                s.includes('reinitiation'),
            ),
        ).toBe(true);
    });

    it('exact tier boundaries for 234 mg path (42/43 and 120/121)', () => {
        expect(
            getInvegaMaintenanceGuidance(42, '234').idealSteps.some((s) =>
                s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(43, '234').idealSteps.some((s) =>
                s.includes('Administer 156 mg Invega Sustenna'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(120, '234').idealSteps.some((s) =>
                s.includes('Administer 156 mg Invega Sustenna'),
            ),
        ).toBe(true);
        expect(
            getInvegaMaintenanceGuidance(121, '234').idealSteps.some((s) =>
                s.includes('reinitiation'),
            ),
        ).toBe(true);
    });
});

// ─── buildLateInfoRows (Invega Sustenna) ────────────────────────────────────

describe('invega-sustenna — buildLateInfoRows', () => {
    const entry = MED_REGISTRY['invega_sustenna'];

    describe('static value row', () => {
        it('initiation branch: returns initiation label', () => {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '' };
            const rows = entry.buildLateInfoRows(ctx, 14);
            const row = rows.find(([label]) => label === 'Injection Type:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('Missed/delayed 2nd initiation (156 mg) injection');
        });

        it('maintenance branch: returns maintenance label', () => {
            const ctx = {
                'invega-type': 'maintenance',
                'last-maintenance': '',
                'maintenance-dose': '234',
            };
            const rows = entry.buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Injection Type:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('Missed/delayed monthly maintenance injection');
        });
    });

    describe('date field formatting', () => {
        it('formats first-injection ISO date as localised long date string', () => {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '2025-11-20' };
            const rows = entry.buildLateInfoRows(ctx, 14);
            const row = rows.find(([label]) => label === 'Date of first (234 mg) injection:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('November 20, 2025');
        });
    });

    describe('option-label field formatting', () => {
        it('returns human-readable label for "39-to-156"', () => {
            const ctx = {
                'invega-type': 'maintenance',
                'last-maintenance': '',
                'maintenance-dose': '39-to-156',
            };
            const rows = entry.buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('39 to 156 mg');
        });

        it('returns human-readable label for "234"', () => {
            const ctx = {
                'invega-type': 'maintenance',
                'last-maintenance': '',
                'maintenance-dose': '234',
            };
            const rows = entry.buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row![1]).toBe('234 mg');
        });

        it('falls back to raw value when option is not found', () => {
            const ctx = {
                'invega-type': 'maintenance',
                'last-maintenance': '',
                'maintenance-dose': 'unknown-val',
            };
            const rows = entry.buildLateInfoRows(ctx, 50);
            const row = rows.find(([label]) => label === 'Monthly maintenance dose:');
            expect(row![1]).toBe('unknown-val');
        });
    });

    describe('time-since row (days-weeks format, initiation path)', () => {
        function timeRow(days: number): string {
            const ctx = { 'invega-type': 'initiation', 'first-injection': '' };
            const rows = entry.buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since first (234 mg) injection:')![1];
        }

        it('0 days → "0 days" (no parenthetical)', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('21 days → "21 days (3 weeks)"', () => {
            expect(timeRow(21)).toBe('21 days (3 weeks)');
        });

        it('10 days → "10 days (1 week and 3 days)"', () => {
            expect(timeRow(10)).toBe('10 days (1 week and 3 days)');
        });

        it('negative days are clamped to 0', () => {
            expect(timeRow(-3)).toBe('0 days');
        });
    });

    describe('date-derived boundaries for initiation (via buildLateParams)', () => {
        it('day 12 → not significantly overdue; day 13 → 117 mg; day 29 → 2nd 156 mg; day 50 → restart; day 121 → consult', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({
                        'invega-type': 'initiation',
                        'first-injection': localDaysAgo(d),
                    }),
                ) as GuidanceResult;
            expect(g(12).idealSteps.join('\n').includes('not significantly overdue')).toBe(true);
            expect(g(13).idealSteps.join('\n').includes('117 mg')).toBe(true);
            expect(g(29).idealSteps.join('\n').includes('2nd 156 mg')).toBe(true);
            expect(g(50).idealSteps.join('\n').includes('Restart initiation')).toBe(true);
            expect(g(121).idealSteps.join('\n').includes('Consult provider')).toBe(true);
        });
    });

    describe('date-derived boundaries for maintenance (via buildLateParams)', () => {
        it('39-to-156: day 27 → not due; day 28 → usual; day 43 → 2nd dose; day 121 → reinitiation', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({
                        'invega-type': 'maintenance',
                        'last-maintenance': localDaysAgo(d),
                        'maintenance-dose': '39-to-156',
                    }),
                ) as GuidanceResult;
            expect(g(27).idealSteps.some((s) => s.includes('not significantly overdue'))).toBe(
                true,
            );
            expect(
                g(28).idealSteps.some((s) =>
                    s.includes('Arrange for next usual monthly maintenance dose = 4 weeks later.'),
                ),
            ).toBe(true);
            expect(
                g(43).idealSteps.some((s) =>
                    s.includes(
                        'Arrange for a 2nd usual maintenance dose (same dose) to be administered 1 week later.',
                    ),
                ),
            ).toBe(true);
            expect(g(121).idealSteps.some((s) => s.includes('reinitiation'))).toBe(true);
        });

        it('234 mg: day 43 → step-down 156 mg; day 121 → reinitiation', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({
                        'invega-type': 'maintenance',
                        'last-maintenance': localDaysAgo(d),
                        'maintenance-dose': '234',
                    }),
                ) as GuidanceResult;
            expect(
                g(43).idealSteps.some((s) => s.includes('Administer 156 mg Invega Sustenna')),
            ).toBe(true);
            expect(g(121).idealSteps.some((s) => s.includes('reinitiation'))).toBe(true);
        });
    });
});
