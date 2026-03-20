import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getFluphenazineGuidance(days: number, variant: string): GuidanceResult {
    return MED_REGISTRY['fluphenazine_decanoate'].getLateGuidance({
        daysSince: days,
        variant,
    }) as GuidanceResult;
}

describe('getFluphenazineDecanoateGuidance', () => {
    describe('1-2 prior doses (2-tier: ≤27 not-due | ≪120 check-in | 121+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(
                getFluphenazineGuidance(20, '1-2').idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
        });

        it('28–120 days: check-in guidance', () => {
            const r = getFluphenazineGuidance(60, '1-2');
            expect(
                r.idealSteps.some((s) =>
                    s.includes('Administer usual fluphenazine decanoate injection'),
                ),
            ).toBe(true);
            expect(r.idealSteps.some((s) => s.includes('24 hours'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('121+ days: reinitiation required', () => {
            const r = getFluphenazineGuidance(150, '1-2');
            expect(r.idealSteps.some((s) => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28 and day 120/121', () => {
            expect(
                getFluphenazineGuidance(27, '1-2').idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(28, '1-2').idealSteps.some((s) => s.includes('24 hours')),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(120, '1-2').idealSteps.some((s) => s.includes('24 hours')),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(121, '1-2').idealSteps.some((s) =>
                    s.includes('Reinitiation is required'),
                ),
            ).toBe(true);
        });
    });

    describe('3+ prior doses (3-tier: ≤27 not-due | ≤42 routine | 43–120 check-in | 121+ reinitiate)', () => {
        it('≤27 days: not yet due', () => {
            expect(
                getFluphenazineGuidance(20, '3+').idealSteps.some((s) => s.includes('not yet due')),
            ).toBe(true);
        });

        it('28–42 days: routine', () => {
            const r = getFluphenazineGuidance(35, '3+');
            expect(
                r.idealSteps.some((s) =>
                    s.includes('Administer usual fluphenazine decanoate injection'),
                ),
            ).toBe(true);
            expect(r.idealSteps.some((s) => s.includes('previously planned dosing interval'))).toBe(
                true,
            );
            expect(r.providerNotifications).toBeUndefined();
        });

        it('43–120 days: check-in guidance', () => {
            const r = getFluphenazineGuidance(80, '3+');
            expect(r.idealSteps.some((s) => s.includes('24 hours'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Pre-injection')).toBe(true);
        });

        it('121+ days: reinitiation required', () => {
            const r = getFluphenazineGuidance(150, '3+');
            expect(r.idealSteps.some((s) => s.includes('Reinitiation is required'))).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider in all cases')).toBe(true);
        });

        it('exact boundaries: day 27/28, day 42/43, day 120/121', () => {
            expect(
                getFluphenazineGuidance(27, '3+').idealSteps.some((s) => s.includes('not yet due')),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(28, '3+').idealSteps.some((s) =>
                    s.includes('previously planned dosing interval'),
                ),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(42, '3+').idealSteps.some((s) =>
                    s.includes('previously planned dosing interval'),
                ),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(43, '3+').idealSteps.some((s) => s.includes('24 hours')),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(120, '3+').idealSteps.some((s) => s.includes('24 hours')),
            ).toBe(true);
            expect(
                getFluphenazineGuidance(121, '3+').idealSteps.some((s) =>
                    s.includes('Reinitiation is required'),
                ),
            ).toBe(true);
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['fluphenazine_decanoate'];

        it('1-2 doses: day 27 → not due; day 28 → check-in; day 121 → reinitiation', () => {
            const p27 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(27),
                'fluphenazine-prior-doses': '1-2',
            });
            const p28 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(28),
                'fluphenazine-prior-doses': '1-2',
            });
            const p121 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(121),
                'fluphenazine-prior-doses': '1-2',
            });
            expect(
                (entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p28) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('24 hours'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p121) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Reinitiation is required'),
                ),
            ).toBe(true);
        });

        it('3+ doses: day 27 → not due; day 42 → routine; day 43 → check-in; day 121 → reinitiation', () => {
            const p27 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(27),
                'fluphenazine-prior-doses': '3+',
            });
            const p42 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(42),
                'fluphenazine-prior-doses': '3+',
            });
            const p43 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(43),
                'fluphenazine-prior-doses': '3+',
            });
            const p121 = entry.buildLateParams({
                'last-fluphenazine': localDaysAgo(121),
                'fluphenazine-prior-doses': '3+',
            });
            expect(
                (entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('previously planned dosing interval'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p43) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('24 hours'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p121) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Reinitiation is required'),
                ),
            ).toBe(true);
        });
    });
});
