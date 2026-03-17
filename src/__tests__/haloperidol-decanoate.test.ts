import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getHaloperidolGuidance(days: number, variant: string): GuidanceResult {
    return MED_REGISTRY['haloperidol_decanoate'].getLateGuidance({ daysSince: days, variant }) as GuidanceResult;
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
        const row = rows.find(([label]) => label === 'Time since last injection:');
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
