import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getUzedyGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['uzedy'].getLateGuidance({ daysSince: days, dose }) as GuidanceResult;
}

describe('getUzedyGuidance', () => {
    it('≤27 days: not yet due', () => {
        const r = getUzedyGuidance(27, '150-or-less');
        expect(r.idealSteps.some((s) => s.includes('not yet due'))).toBe(true);
    });

    it('28–119 days: administer usual dose', () => {
        const r = getUzedyGuidance(60, '150-or-less');
        expect(
            r.idealSteps.some((s) => s.includes('Administer usual Uzedy maintenance dose')),
        ).toBe(true);
        expect(r.idealSteps.some((s) => s.includes('usual dosing interval'))).toBe(true);
    });

    it('120+ days: sedation guidance (static — same for all doses)', () => {
        const r150 = getUzedyGuidance(150, '150-or-less');
        const r200 = getUzedyGuidance(150, '200-or-more');
        expect(
            r150.idealSteps.some((s) =>
                s.includes('Administer usual Uzedy maintenance dose (150 mg or less)'),
            ),
        ).toBe(true);
        expect(
            r150.idealSteps.some((s) =>
                s.includes(
                    'Arrange for care team to check in with patient within 1-2 days, to assess for sedation',
                ),
            ),
        ).toBe(true);
        expect(
            hasNotif(r150.providerNotifications, 'Consult provider prior to any injection'),
        ).toBe(true);
        // tier 3 is static — 200-or-more dose receives identical guidance
        expect(r200.idealSteps).toEqual(r150.idealSteps);
    });

    it('exact tier boundaries: day 27/28 and day 119/120', () => {
        // day 27 → tier 1: not yet due (maxDays: 27)
        expect(
            getUzedyGuidance(27, '150-or-less').idealSteps.some((s) => s.includes('not yet due')),
        ).toBe(true);
        // day 28 → tier 2: administer usual dose (maxDays: 119)
        expect(
            getUzedyGuidance(28, '150-or-less').idealSteps.some((s) =>
                s.includes('Administer usual Uzedy maintenance dose'),
            ),
        ).toBe(true);
        // day 119 → tier 2: still usual dose
        expect(
            getUzedyGuidance(119, '150-or-less').idealSteps.some((s) =>
                s.includes('usual dosing interval'),
            ),
        ).toBe(true);
        // day 120 → tier 3: sedation check (maxDays: null/∞)
        expect(
            getUzedyGuidance(120, '150-or-less').idealSteps.some((s) =>
                s.includes(
                    'Arrange for care team to check in with patient within 1-2 days, to assess for sedation',
                ),
            ),
        ).toBe(true);
        expect(
            getUzedyGuidance(120, '200-or-more').idealSteps.some((s) =>
                s.includes(
                    'Arrange for care team to check in with patient within 1-2 days, to assess for sedation',
                ),
            ),
        ).toBe(true);
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['uzedy'];

        it('day 27 → not yet due; day 28 → usual dose; day 119 → usual dose; day 120 → sedation check', () => {
            const p27 = entry.buildLateParams({
                'last-uzedy': localDaysAgo(27),
                'uzedy-dose': '150-or-less',
            });
            const p28 = entry.buildLateParams({
                'last-uzedy': localDaysAgo(28),
                'uzedy-dose': '150-or-less',
            });
            const p119 = entry.buildLateParams({
                'last-uzedy': localDaysAgo(119),
                'uzedy-dose': '150-or-less',
            });
            const p120 = entry.buildLateParams({
                'last-uzedy': localDaysAgo(120),
                'uzedy-dose': '200-or-more',
            });
            expect(p27.daysSince).toBe(27);
            expect(p120.daysSince).toBe(120);
            expect(
                (entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p28) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Administer usual Uzedy maintenance dose'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p119) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('usual dosing interval'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p120) as GuidanceResult).idealSteps.some((s) =>
                    s.includes(
                        'Arrange for care team to check in with patient within 1-2 days, to assess for sedation',
                    ),
                ),
            ).toBe(true);
        });
    });
});
