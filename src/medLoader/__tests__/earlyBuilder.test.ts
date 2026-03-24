import { describe, it, expect } from 'vitest';
import { buildEarlyFields } from '../earlyBuilder';

describe('buildEarlyFields', () => {
    it('returns empty object when both arguments are undefined', () => {
        expect(buildEarlyFields(undefined, undefined)).toEqual({});
    });

    it('returns empty object for empty early object with no earlySpec', () => {
        expect(buildEarlyFields({}, undefined)).toEqual({});
    });

    it('sets earlyDaysBeforeDue from early.daysBeforeDue', () => {
        expect(buildEarlyFields({ daysBeforeDue: 5 }, undefined).earlyDaysBeforeDue).toBe(5);
    });

    it('omits earlyDaysBeforeDue when absent', () => {
        expect(buildEarlyFields({}, undefined).earlyDaysBeforeDue).toBeUndefined();
    });

    it('sets earlyMinDays from early.minDays', () => {
        expect(buildEarlyFields({ minDays: 21 }, undefined).earlyMinDays).toBe(21);
    });

    it('omits earlyMinDays when absent', () => {
        expect(buildEarlyFields({}, undefined).earlyMinDays).toBeUndefined();
    });

    it('sets earlyProviderNotification for a non-empty array', () => {
        const result = buildEarlyFields(
            { providerNotifications: ['Alert A', 'Alert B'] },
            undefined,
        );
        expect(result.earlyProviderNotification).toEqual(['Alert A', 'Alert B']);
    });

    it('omits earlyProviderNotification when array is empty', () => {
        expect(
            buildEarlyFields({ providerNotifications: [] }, undefined).earlyProviderNotification,
        ).toBeUndefined();
    });

    it('omits earlyProviderNotification when key is absent', () => {
        expect(buildEarlyFields({}, undefined).earlyProviderNotification).toBeUndefined();
    });

    it('sets earlyParamField and earlyDateField when earlySpec provides them', () => {
        const result = buildEarlyFields(
            {},
            { paramField: 'brixadi-type', dateField: 'last-brixadi' },
        );
        expect(result.earlyParamField).toBe('brixadi-type');
        expect(result.earlyDateField).toBe('last-brixadi');
    });

    it('omits earlyParamField when earlySpec has no paramField', () => {
        expect(buildEarlyFields({}, {}).earlyParamField).toBeUndefined();
    });

    it('omits earlyParamField when earlySpec is undefined', () => {
        expect(buildEarlyFields({}, undefined).earlyParamField).toBeUndefined();
    });

    it('omits earlyVariantMap when no variants are present', () => {
        expect(buildEarlyFields({}, undefined).earlyVariantMap).toBeUndefined();
    });

    it('builds earlyVariantMap entries with minDays', () => {
        const early = { variants: [{ key: 'monthly-64', minDays: 21 }] };
        const vm = buildEarlyFields(early, {
            paramField: 'brixadi-type',
            dateField: 'last-brixadi',
        }).earlyVariantMap!;
        expect(vm).toBeDefined();
        expect(vm['monthly-64'].minDays).toBe(21);
    });

    it('builds earlyVariantMap entry with no minDays', () => {
        const early = {
            variants: [{ key: 'weekly' }],
        };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['weekly'].minDays).toBeUndefined();
    });

    it('sameAs variant shares the same object reference as its target', () => {
        const early = {
            variants: [
                { key: 'monthly-64', minDays: 21 },
                { key: 'monthly-96', sameAs: 'monthly-64' },
                { key: 'monthly-128', sameAs: 'monthly-64' },
            ],
        };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['monthly-96']).toBe(vm['monthly-64']);
        expect(vm['monthly-128']).toBe(vm['monthly-64']);
    });

    it('sameAs variant resolves even when it appears before the target', () => {
        const early = {
            variants: [
                { key: 'alias', sameAs: 'original' },
                { key: 'original', minDays: 14 },
            ],
        };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['alias']).toBe(vm['original']);
        expect(vm['alias'].minDays).toBe(14);
    });

    it('sets all fields when all are present', () => {
        const early = {
            daysBeforeDue: 2,
            minDays: 14,
            providerNotifications: ['Notify provider'],
            variants: [{ key: 'a', minDays: 10 }],
        };
        const result = buildEarlyFields(early, {
            paramField: 'type-field',
            dateField: 'last-date',
        });
        expect(result.earlyDaysBeforeDue).toBe(2);
        expect(result.earlyMinDays).toBe(14);
        expect(result.earlyProviderNotification).toEqual(['Notify provider']);
        expect(result.earlyVariantMap!['a'].minDays).toBe(10);
        expect(result.earlyParamField).toBe('type-field');
        expect(result.earlyDateField).toBe('last-date');
    });

    // ── variant guidanceNote ──────────────────────────────────────────────────

    it('stores guidanceNote on a variant map entry', () => {
        const early = {
            variants: [{ key: 'weekly', guidanceNote: ['No weekly early dosing at this time.'] }],
        };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['weekly'].guidanceNote).toEqual(['No weekly early dosing at this time.']);
    });

    it('omits guidanceNote from variant map entry when absent', () => {
        const early = { variants: [{ key: 'monthly', minDays: 21 }] };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['monthly'].guidanceNote).toBeUndefined();
    });

    it('omits guidanceNote from variant map entry when empty array', () => {
        const early = { variants: [{ key: 'monthly', guidanceNote: [] }] };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['monthly'].guidanceNote).toBeUndefined();
    });

    it('sameAs variant shares guidanceNote from its target', () => {
        const early = {
            variants: [
                { key: 'monthly-64', minDays: 21, guidanceNote: ['Provider approval required.'] },
                { key: 'monthly-96', sameAs: 'monthly-64' },
            ],
        };
        const vm = buildEarlyFields(early, {
            paramField: 'type',
            dateField: 'last',
        }).earlyVariantMap!;
        expect(vm['monthly-96'].guidanceNote).toEqual(['Provider approval required.']);
    });

    // ── earlySharedNotes ──────────────────────────────────────────────────────

    it('sets earlySharedNotes from early.guidanceNote', () => {
        const early = { guidanceNote: ['Note A', 'Note B'] };
        expect(buildEarlyFields(early, undefined).earlySharedNotes).toEqual(['Note A', 'Note B']);
    });

    it('omits earlySharedNotes when guidanceNote is absent', () => {
        expect(buildEarlyFields({}, undefined).earlySharedNotes).toBeUndefined();
    });

    it('omits earlySharedNotes when guidanceNote is an empty array', () => {
        expect(buildEarlyFields({ guidanceNote: [] }, undefined).earlySharedNotes).toBeUndefined();
    });
});
