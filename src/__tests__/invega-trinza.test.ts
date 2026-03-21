import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getInvegaTrinzaGuidance(days: number, dose: string): GuidanceResult {
    return MED_REGISTRY['invega_trinza'].getLateGuidance({
        daysSince: days,
        dose,
    }) as GuidanceResult;
}

describe('getInvegaTrinzaGuidance', () => {
    it('<90 days: refers to early dosing guidance', () => {
        const r = getInvegaTrinzaGuidance(60, '410');
        expect(r.idealSteps.some((s) => s.includes('refer to the early dosing guidance'))).toBe(
            true,
        );
    });

    it('90–120 days: administer usual Trinza dose', () => {
        const r = getInvegaTrinzaGuidance(100, '546');
        expect(r.idealSteps.some((s) => s.includes('usual Invega Trinza dose'))).toBe(true);
    });

    it('121–270 days, 410 mg dose: bridge with Sustenna 117 mg x2', () => {
        const r = getInvegaTrinzaGuidance(150, '410');
        expect(r.idealSteps.some((s) => s.includes('Consult provider first'))).toBe(true);
        expect(r.idealSteps.some((s) => s.includes('Administer Invega **Sustenna** 117 mg'))).toBe(
            true,
        );
        expect(
            r.idealSteps.some((s) =>
                s.includes(
                    'Arrange for a 410 mg Invega **Trinza** injection 4 weeks after step 3.',
                ),
            ),
        ).toBe(true);
    });

    it('121–270 days, 546/819 mg dose: bridge with Sustenna 156 mg x2', () => {
        (['546', '819'] as const).forEach((dose) => {
            const r = getInvegaTrinzaGuidance(150, dose);
            expect(
                r.idealSteps.some((s) => s.includes('Administer Invega **Sustenna** 156 mg')),
            ).toBe(true);
            expect(hasNotif(r.providerNotifications, 'Consult provider')).toBe(true);
        });
    });

    it('271+ days: reinitiation required', () => {
        const r = getInvegaTrinzaGuidance(300, '546');
        expect(r.idealSteps.some((s) => s.includes('Reinitiation'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'Consult provider')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 89, 120, 270, Infinity)', () => {
        expect(
            getInvegaTrinzaGuidance(89, '546').idealSteps.some((s) =>
                s.includes('refer to the early dosing guidance'),
            ),
        ).toBe(true);
        expect(
            getInvegaTrinzaGuidance(90, '546').idealSteps.some((s) =>
                s.includes('usual Invega Trinza dose'),
            ),
        ).toBe(true);
        expect(
            getInvegaTrinzaGuidance(120, '546').idealSteps.some((s) =>
                s.includes('usual Invega Trinza dose'),
            ),
        ).toBe(true);
        expect(
            getInvegaTrinzaGuidance(121, '546').idealSteps.some((s) =>
                s.includes('Administer Invega **Sustenna** 156 mg'),
            ),
        ).toBe(true);
        expect(
            getInvegaTrinzaGuidance(270, '546').idealSteps.some((s) =>
                s.includes('Administer Invega **Sustenna** 156 mg'),
            ),
        ).toBe(true);
        expect(
            getInvegaTrinzaGuidance(271, '546').idealSteps.some((s) =>
                s.includes('Consult provider. Reinitiation is necessary'),
            ),
        ).toBe(true);
    });
});

// ─── buildLateInfoRows (Invega Trinza) ──────────────────────────────────────

describe('invega-trinza — buildLateInfoRows', () => {
    const entry = MED_REGISTRY['invega_trinza'];

    describe('date field formatting', () => {
        it('formats ISO date as localised long date string', () => {
            const ctx = { 'last-trinza': '2026-01-15', 'trinza-dose': '546' };
            const rows = entry.buildLateInfoRows(ctx, 52);
            const row = rows.find(([label]) => label === 'Date of last Trinza injection:');
            expect(row).toBeDefined();
            expect(row![1]).toBe('January 15, 2026');
        });
    });

    describe('time-since row (days-months format)', () => {
        function timeRow(days: number): string {
            const ctx = { 'last-trinza': '', 'trinza-dose': '546' };
            const rows = entry.buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since last injection:')![1];
        }

        it('0 days → "0 days" (no parenthetical)', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('90 days → "90 days (approximately 3 months)"', () => {
            expect(timeRow(90)).toBe('90 days (approximately 3 months)');
        });

        it('30 days → "30 days (approximately 1 month)"', () => {
            expect(timeRow(30)).toBe('30 days (approximately 1 month)');
        });

        it('negative days are clamped to 0', () => {
            expect(timeRow(-5)).toBe('0 days');
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        it('day 89 → early guidance; day 90 → usual dose; day 121 → bridge; day 271 → reinitiation', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({ 'last-trinza': localDaysAgo(d), 'trinza-dose': '546' }),
                ) as GuidanceResult;
            expect(
                g(89).idealSteps.some((s) => s.includes('refer to the early dosing guidance')),
            ).toBe(true);
            expect(g(90).idealSteps.some((s) => s.includes('usual Invega Trinza dose'))).toBe(true);
            expect(
                g(121).idealSteps.some((s) => s.includes('Administer Invega **Sustenna** 156 mg')),
            ).toBe(true);
            expect(g(271).idealSteps.some((s) => s.includes('Reinitiation'))).toBe(true);
        });

        it('410 mg: day 121 → bridge with 117 mg Sustenna', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({ 'last-trinza': localDaysAgo(d), 'trinza-dose': '410' }),
                ) as GuidanceResult;
            expect(
                g(121).idealSteps.some((s) => s.includes('Administer Invega **Sustenna** 117 mg')),
            ).toBe(true);
        });
    });
});
