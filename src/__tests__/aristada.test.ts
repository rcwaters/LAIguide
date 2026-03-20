import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { localDaysAgo } from './helpers';

function getAristadaGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['aristada'].getLateGuidance({ daysSince: days, dose }) as GuidanceResult;
}

describe('getAristadaGuidance', () => {
    it('≤42 days for 662: not yet due', () => {
        const r = getAristadaGuidance(10, '662');
        expect(r.idealSteps.some((s) => s.includes('not yet due'))).toBe(true);
    });

    describe('441 mg dose', () => {
        it('1–42 days: no supplementation required (within window)', () => {
            const r = getAristadaGuidance(10, '441');
            expect(r.idealSteps.some((s) => s.includes('No supplementation required'))).toBe(true);
        });

        it('43–49 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(45, '441');
            expect(r.idealSteps.some((s) => s.includes('7 days'))).toBe(true);
        });

        it('50+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(60, '441');
            expect(r.idealSteps.some((s) => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (no notDue tier; maxDays: 42, 49, 120, \u221e)', () => {
            // day 27 \u2192 no supplementation (441 has no notDue tier; maxDays:42)
            expect(
                getAristadaGuidance(27, '441').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 42 \u2192 no supplementation (maxDays:42)
            expect(
                getAristadaGuidance(42, '441').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 43 \u2192 7-day supplementation (maxDays:49)
            expect(
                getAristadaGuidance(43, '441').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 49 \u2192 7-day supplementation (still maxDays:49)
            expect(
                getAristadaGuidance(49, '441').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 50 \u2192 21-day supplementation (maxDays:120)
            expect(
                getAristadaGuidance(50, '441').idealSteps.some((s) => s.includes('21 days')),
            ).toBe(true);
        });
    });

    describe('662 mg dose', () => {
        it('29\u201356 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '662');
            expect(r.idealSteps.some((s) => s.includes('No supplementation required'))).toBe(true);
        });

        it('57\u201384 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(70, '662');
            expect(r.idealSteps.some((s) => s.includes('7 days'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '662');
            expect(r.idealSteps.some((s) => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (not-due: \u226442; maxDays: 56, 84, \u221e)', () => {
            // day 42 \u2192 not yet due (maxDays:42)
            expect(
                getAristadaGuidance(42, '662').idealSteps.some((s) => s.includes('not yet due')),
            ).toBe(true);
            // day 43 \u2192 no supplementation (maxDays:56)
            expect(
                getAristadaGuidance(43, '662').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 56 \u2192 no supplementation (maxDays:56)
            expect(
                getAristadaGuidance(56, '662').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 57 \u2192 7-day supplementation (maxDays:84)
            expect(
                getAristadaGuidance(57, '662').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(
                getAristadaGuidance(84, '662').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(
                getAristadaGuidance(85, '662').idealSteps.some((s) => s.includes('21 days')),
            ).toBe(true);
        });
    });

    describe('882 mg dose (same thresholds as 662)', () => {
        it('29\u201356 days: no supplementation', () => {
            const r = getAristadaGuidance(50, '882');
            expect(r.idealSteps.some((s) => s.includes('No supplementation required'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(90, '882');
            expect(r.idealSteps.some((s) => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (identical to 662: maxDays 56, 84, \u221e)', () => {
            // day 56 \u2192 no supplementation (maxDays:56)
            expect(
                getAristadaGuidance(56, '882').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 57 \u2192 7-day supplementation (maxDays:84)
            expect(
                getAristadaGuidance(57, '882').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(
                getAristadaGuidance(84, '882').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(
                getAristadaGuidance(85, '882').idealSteps.some((s) => s.includes('21 days')),
            ).toBe(true);
        });
    });

    describe('1064 mg dose', () => {
        it('29\u201370 days: no supplementation', () => {
            const r = getAristadaGuidance(60, '1064');
            expect(r.idealSteps.some((s) => s.includes('No supplementation required'))).toBe(true);
        });

        it('71\u201384 days: 7-day oral or Initio', () => {
            const r = getAristadaGuidance(78, '1064');
            expect(r.idealSteps.some((s) => s.includes('7 days'))).toBe(true);
        });

        it('85+ days: 21-day oral or Initio', () => {
            const r = getAristadaGuidance(100, '1064');
            expect(r.idealSteps.some((s) => s.includes('21 days'))).toBe(true);
        });

        it('exact tier boundaries (not-due: \u226442; maxDays: 70, 84, \u221e)', () => {
            // day 42 \u2192 not yet due (maxDays:42)
            expect(
                getAristadaGuidance(42, '1064').idealSteps.some((s) => s.includes('not yet due')),
            ).toBe(true);
            // day 43 \u2192 no supplementation (maxDays:70)
            expect(
                getAristadaGuidance(43, '1064').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 70 \u2192 no supplementation (maxDays:70)
            expect(
                getAristadaGuidance(70, '1064').idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            // day 71 \u2192 7-day supplementation (maxDays:84)
            expect(
                getAristadaGuidance(71, '1064').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 84 \u2192 7-day supplementation (still maxDays:84)
            expect(
                getAristadaGuidance(84, '1064').idealSteps.some((s) => s.includes('7 days')),
            ).toBe(true);
            // day 85 \u2192 21-day supplementation (maxDays:\u221e)
            expect(
                getAristadaGuidance(85, '1064').idealSteps.some((s) => s.includes('21 days')),
            ).toBe(true);
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['aristada'];

        it('441 mg: day 42 \u2192 no supp, day 43 \u2192 7-day, day 50 \u2192 21-day', () => {
            const p42 = entry.buildLateParams({
                'last-aristada': localDaysAgo(42),
                'aristada-dose': '441',
            });
            const p43 = entry.buildLateParams({
                'last-aristada': localDaysAgo(43),
                'aristada-dose': '441',
            });
            const p50 = entry.buildLateParams({
                'last-aristada': localDaysAgo(50),
                'aristada-dose': '441',
            });
            expect(p42.daysSince).toBe(42);
            expect(p43.daysSince).toBe(43);
            expect(p50.daysSince).toBe(50);
            expect(
                (entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p43) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('7 days'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p50) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('21 days'),
                ),
            ).toBe(true);
        });

        it('662 mg: day 42 \u2192 not yet due, day 56 \u2192 no supp, day 57 \u2192 7-day, day 85 \u2192 21-day', () => {
            const p42 = entry.buildLateParams({
                'last-aristada': localDaysAgo(42),
                'aristada-dose': '662',
            });
            const p56 = entry.buildLateParams({
                'last-aristada': localDaysAgo(56),
                'aristada-dose': '662',
            });
            const p57 = entry.buildLateParams({
                'last-aristada': localDaysAgo(57),
                'aristada-dose': '662',
            });
            const p85 = entry.buildLateParams({
                'last-aristada': localDaysAgo(85),
                'aristada-dose': '662',
            });
            expect(
                (entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('not yet due'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p56) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p57) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('7 days'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('21 days'),
                ),
            ).toBe(true);
        });

        it('882 mg behaves identically to 662 mg (sameAs)', () => {
            const p56 = entry.buildLateParams({
                'last-aristada': localDaysAgo(56),
                'aristada-dose': '882',
            });
            const p57 = entry.buildLateParams({
                'last-aristada': localDaysAgo(57),
                'aristada-dose': '882',
            });
            const p85 = entry.buildLateParams({
                'last-aristada': localDaysAgo(85),
                'aristada-dose': '882',
            });
            expect(
                (entry.getLateGuidance(p56) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p57) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('7 days'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('21 days'),
                ),
            ).toBe(true);
        });

        it('1064 mg: day 70 \u2192 no supp, day 71 \u2192 7-day, day 85 \u2192 21-day', () => {
            const p70 = entry.buildLateParams({
                'last-aristada': localDaysAgo(70),
                'aristada-dose': '1064',
            });
            const p71 = entry.buildLateParams({
                'last-aristada': localDaysAgo(71),
                'aristada-dose': '1064',
            });
            const p85 = entry.buildLateParams({
                'last-aristada': localDaysAgo(85),
                'aristada-dose': '1064',
            });
            expect(
                (entry.getLateGuidance(p70) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('No supplementation required'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p71) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('7 days'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p85) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('21 days'),
                ),
            ).toBe(true);
        });
    });
});
