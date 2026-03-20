import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getInvegaHafyeraGuidance(days: number): GuidanceResult {
    return MED_REGISTRY['invega_hafyera'].getLateGuidance({ daysSince: days }) as GuidanceResult;
}

describe('getInvegaHafyeraGuidance', () => {
    it('≤180 days: refers to early dosing guidance', () => {
        expect(
            getInvegaHafyeraGuidance(0).idealSteps.some((s) => s.includes('early dosing guidance')),
        ).toBe(true);
        expect(
            getInvegaHafyeraGuidance(180).idealSteps.some((s) =>
                s.includes('early dosing guidance'),
            ),
        ).toBe(true);
    });

    it('181–202 days: proceed with administering and plan next dose in 6 months', () => {
        const r181 = getInvegaHafyeraGuidance(181);
        const r202 = getInvegaHafyeraGuidance(202);
        expect(
            r181.idealSteps.some((s) =>
                s.includes('Proceed with administering the Hafyera injection'),
            ),
        ).toBe(true);
        expect(
            r202.idealSteps.some((s) =>
                s.includes('Plan for the subsequent injection in 6 months'),
            ),
        ).toBe(true);
    });

    it('203+ days: consult provider before any injection', () => {
        const r203 = getInvegaHafyeraGuidance(203);
        const r365 = getInvegaHafyeraGuidance(365);
        expect(r203.idealSteps.some((s) => s.includes('more than 6 months and 3 weeks'))).toBe(
            true,
        );
        expect(
            r203.idealSteps.some((s) => s.includes('Consult provider prior to proceeding')),
        ).toBe(true);
        expect(hasNotif(r203.providerNotifications, 'Before any injection')).toBe(true);
        expect(hasNotif(r365.providerNotifications, 'Before any injection')).toBe(true);
    });

    it('exact tier boundaries (maxDays: 180, 202, Infinity)', () => {
        expect(
            getInvegaHafyeraGuidance(180).idealSteps.some((s) =>
                s.includes('early dosing guidance'),
            ),
        ).toBe(true);
        expect(
            getInvegaHafyeraGuidance(181).idealSteps.some((s) =>
                s.includes('Proceed with administering the Hafyera injection'),
            ),
        ).toBe(true);
        expect(
            getInvegaHafyeraGuidance(202).idealSteps.some((s) =>
                s.includes('Plan for the subsequent injection in 6 months'),
            ),
        ).toBe(true);
        expect(
            getInvegaHafyeraGuidance(203).idealSteps.some((s) =>
                s.includes('Consult provider prior to proceeding'),
            ),
        ).toBe(true);
    });
});

// ─── buildLateInfoRows (Invega Hafyera) ─────────────────────────────────────

describe('invega-hafyera — buildLateInfoRows', () => {
    const entry = MED_REGISTRY['invega_hafyera'];

    describe('time-since row (days-weeks-months format)', () => {
        function timeRow(days: number): string {
            const ctx = { 'last-hafyera': '' };
            const rows = entry.buildLateInfoRows(ctx, days);
            return rows.find(([label]) => label === 'Time since last injection:')![1];
        }

        it('0 days → "0 days" (no parenthetical)', () => {
            expect(timeRow(0)).toBe('0 days');
        });

        it('7 days → "7 days (1 week)"', () => {
            expect(timeRow(7)).toBe('7 days (1 week)');
        });

        it('14 days → "14 days (2 weeks)"', () => {
            expect(timeRow(14)).toBe('14 days (2 weeks)');
        });

        it('33 days → "33 days (4 weeks and 5 days)", no "approximately" and no "months"', () => {
            expect(timeRow(33)).toBe('33 days (4 weeks and 5 days)');
            expect(timeRow(33)).not.toContain('approximately');
            expect(timeRow(33)).not.toContain('months');
        });

        it('negative days are clamped to 0', () => {
            expect(timeRow(-10)).toBe('0 days');
        });
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        it('day 180 → early guidance; day 181 → administer; day 203 → consult', () => {
            const g = (d: number) =>
                entry.getLateGuidance(
                    entry.buildLateParams({ 'last-hafyera': localDaysAgo(d) }),
                ) as GuidanceResult;
            expect(g(180).idealSteps.some((s) => s.includes('early dosing guidance'))).toBe(true);
            expect(
                g(181).idealSteps.some((s) =>
                    s.includes('Proceed with administering the Hafyera injection'),
                ),
            ).toBe(true);
            expect(
                g(203).idealSteps.some((s) => s.includes('Consult provider prior to proceeding')),
            ).toBe(true);
        });
    });
});
