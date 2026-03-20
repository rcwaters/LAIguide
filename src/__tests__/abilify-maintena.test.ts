import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../medLoader';
import type { GuidanceResult } from '../interfaces/guidance';
import { hasNotif, localDaysAgo } from './helpers';

function getAbilifyMaintenaGuidance(weeks: number, doses: string): GuidanceResult {
    return MED_REGISTRY['abilify_maintena'].getLateGuidance({
        daysSince: weeks * 7,
        variant: doses,
    }) as GuidanceResult;
}

describe('getAbilifyMaintenaGuidance', () => {
    it('<4 weeks: not yet due', () => {
        const r = getAbilifyMaintenaGuidance(3, '3+');
        expect(r.idealSteps.some((s) => s.includes('not due'))).toBe(true);
    });

    it('1-2 doses, 4–5 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(5, '1-2');
        expect(
            r.idealSteps.some((s) => s.includes('Administer usual Abilify Maintena monthly dose')),
        ).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('1-2 doses, 6+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(6, '1-2');
        expect(r.idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'notify provider')).toBe(true);
    });

    it('3+ doses, 4–6 weeks: routine administration', () => {
        const r = getAbilifyMaintenaGuidance(6, '3+');
        expect(
            r.idealSteps.some((s) => s.includes('Administer usual Abilify Maintena monthly dose')),
        ).toBe(true);
        expect(r.providerNotifications).toBeUndefined();
    });

    it('3+ doses, 7+ weeks: reinitiation required', () => {
        const r = getAbilifyMaintenaGuidance(7, '3+');
        expect(r.idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(hasNotif(r.providerNotifications, 'notify provider')).toBe(true);
    });

    it('exact tier boundaries for 1-2 doses (27/28, 35/36, 119/120 days)', () => {
        const g12 = (d: number) =>
            MED_REGISTRY['abilify_maintena'].getLateGuidance({
                daysSince: d,
                variant: '1-2',
            }) as GuidanceResult;
        expect(g12(27).idealSteps.some((s) => s.includes('not due'))).toBe(true);
        expect(
            g12(28).idealSteps.some((s) =>
                s.includes('Administer usual Abilify Maintena monthly dose'),
            ),
        ).toBe(true);
        expect(
            g12(35).idealSteps.some((s) =>
                s.includes('Administer usual Abilify Maintena monthly dose'),
            ),
        ).toBe(true);
        expect(g12(36).idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(g12(119).idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(g12(120).idealSteps.some((s) => s.includes('Consult provider first'))).toBe(true);
    });

    it('exact tier boundaries for 3+ doses (27/28, 42/43, 119/120 days)', () => {
        const g3p = (d: number) =>
            MED_REGISTRY['abilify_maintena'].getLateGuidance({
                daysSince: d,
                variant: '3+',
            }) as GuidanceResult;
        expect(g3p(27).idealSteps.some((s) => s.includes('not due'))).toBe(true);
        expect(
            g3p(28).idealSteps.some((s) =>
                s.includes('Administer usual Abilify Maintena monthly dose'),
            ),
        ).toBe(true);
        expect(
            g3p(42).idealSteps.some((s) =>
                s.includes('Administer usual Abilify Maintena monthly dose'),
            ),
        ).toBe(true);
        expect(g3p(43).idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(g3p(119).idealSteps.some((s) => s.includes('Re-initiate:'))).toBe(true);
        expect(g3p(120).idealSteps.some((s) => s.includes('Consult provider first'))).toBe(true);
    });

    describe('date-derived boundaries (via buildLateParams)', () => {
        const entry = MED_REGISTRY['abilify_maintena'];

        it('1-2 doses: day 27 → not due; day 28 → routine; day 36 → reinitiation; day 120 → consult', () => {
            const p27 = entry.buildLateParams({
                'last-abilify': localDaysAgo(27),
                'abilify-prior-dose-group': '1-2',
            });
            const p28 = entry.buildLateParams({
                'last-abilify': localDaysAgo(28),
                'abilify-prior-dose-group': '1-2',
            });
            const p36 = entry.buildLateParams({
                'last-abilify': localDaysAgo(36),
                'abilify-prior-dose-group': '1-2',
            });
            const p120 = entry.buildLateParams({
                'last-abilify': localDaysAgo(120),
                'abilify-prior-dose-group': '1-2',
            });
            expect(
                (entry.getLateGuidance(p27) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('not due'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p28) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Administer usual Abilify Maintena monthly dose'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p36) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Re-initiate:'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p120) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Consult provider first'),
                ),
            ).toBe(true);
        });

        it('3+ doses: day 42 → routine; day 43 → reinitiation; day 120 → consult', () => {
            const p42 = entry.buildLateParams({
                'last-abilify': localDaysAgo(42),
                'abilify-prior-dose-group': '3+',
            });
            const p43 = entry.buildLateParams({
                'last-abilify': localDaysAgo(43),
                'abilify-prior-dose-group': '3+',
            });
            const p120 = entry.buildLateParams({
                'last-abilify': localDaysAgo(120),
                'abilify-prior-dose-group': '3+',
            });
            expect(
                (entry.getLateGuidance(p42) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Administer usual Abilify Maintena monthly dose'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p43) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Re-initiate:'),
                ),
            ).toBe(true);
            expect(
                (entry.getLateGuidance(p120) as GuidanceResult).idealSteps.some((s) =>
                    s.includes('Consult provider first'),
                ),
            ).toBe(true);
        });
    });
});
