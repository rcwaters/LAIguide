import { describe, it, expect, vi } from 'vitest';
import { MED_REGISTRY } from '../index';
import { buildCoreDef } from '../defBuilder';

describe('handleSubGroupChange — invega_sustenna (branched spec)', () => {
    const entry = MED_REGISTRY['invega_sustenna'];

    it('handleSubGroupChange is defined (branched spec)', () => {
        expect(entry.handleSubGroupChange).toBeDefined();
    });

    it('shows the initiation sub-group when branch is "initiation"', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        expect(show).toHaveBeenCalledWith('first-injection-date');
    });

    it('hides the maintenance sub-group when branch is "initiation"', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        expect(hide).toHaveBeenCalledWith('maintenance-fields');
    });

    it('clears maintenance fields when branch is "initiation"', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        // clear must have been called at least once for the hidden group's fields
        expect(clear).toHaveBeenCalled();
    });

    it('shows the maintenance sub-group when branch is "maintenance"', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('maintenance', show, hide, clear);
        expect(show).toHaveBeenCalledWith('maintenance-fields');
    });

    it('hides and clears the initiation sub-group when branch is "maintenance"', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('maintenance', show, hide, clear);
        expect(hide).toHaveBeenCalledWith('first-injection-date');
        expect(clear).toHaveBeenCalled();
    });

    it('show and hide are called exactly once each (two sub-groups total)', () => {
        const show = vi.fn();
        const hide = vi.fn();
        const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        expect(show).toHaveBeenCalledTimes(1);
        expect(hide).toHaveBeenCalledTimes(1);
    });
});

describe('handleSubGroupChange absent on standard (non-branched) meds', () => {
    it('abilify_maintena has no handleSubGroupChange', () => {
        expect(MED_REGISTRY['abilify_maintena'].handleSubGroupChange).toBeUndefined();
    });

    it('aristada has no handleSubGroupChange', () => {
        expect(MED_REGISTRY['aristada'].handleSubGroupChange).toBeUndefined();
    });

    it('invega_trinza has no handleSubGroupChange', () => {
        expect(MED_REGISTRY['invega_trinza'].handleSubGroupChange).toBeUndefined();
    });
});

describe('buildCoreDef — success path', () => {
    const minJson = {
        displayName: 'Test Med',
        guidance: {
            late: {
                variants: [
                    {
                        key: 'default',
                        tiers: [{ maxDays: 30, guidance: { idealSteps: ['Administer.'] } }],
                    },
                ],
            },
        },
    };

    it('returns a displayName field', () => {
        const def = buildCoreDef(minJson);
        expect(def.displayName).toBe('Test Med');
    });

    it('returns a getLateGuidance function', () => {
        const def = buildCoreDef(minJson);
        expect(typeof def.getLateGuidance).toBe('function');
    });

    it('getLateGuidance resolves the correct tier for daysSince within maxDays', () => {
        const def = buildCoreDef(minJson);
        const result = def.getLateGuidance({ daysSince: 20 });
        expect(result.idealSteps).toContain('Administer.');
    });

    it('returns earlyGuidance when early block is present', () => {
        const json = { ...minJson, guidance: { ...minJson.guidance, early: { minDays: 21 } } };
        const def = buildCoreDef(json);
        expect(def.earlyGuidance).toBeDefined();
    });

    it('includes commonProviderNotifications when shared block has them', () => {
        const json = {
            ...minJson,
            guidance: {
                ...minJson.guidance,
                shared: { providerNotifications: ['Notify on side effects'] },
            },
        };
        const def = buildCoreDef(json);
        expect(def.commonProviderNotifications).toEqual(['Notify on side effects']);
    });

    it('omits commonProviderNotifications when shared block is absent', () => {
        const def = buildCoreDef(minJson);
        expect(def.commonProviderNotifications).toBeUndefined();
    });
});

describe('buildCoreDef — error paths', () => {
    it('throws with a descriptive message when guidance.late has no variants', () => {
        const badJson = {
            displayName: 'Test Med',
            guidance: { late: {} },
        };
        expect(() => buildCoreDef(badJson)).toThrow(/No variants in late guidance for Test Med/);
    });

    it('error message includes the displayName', () => {
        try {
            buildCoreDef({ displayName: 'My Med', guidance: { late: {} } });
            expect.fail('should have thrown');
        } catch (e: unknown) {
            expect((e as Error).message).toContain('My Med');
        }
    });
});

describe('buildStandardDef — subGroupSelectorId', () => {
    it('invega_sustenna has a subGroupSelectorId (first field has onchange)', () => {
        expect(MED_REGISTRY['invega_sustenna'].subGroupSelectorId).toBeDefined();
    });

    it('abilify_maintena has no subGroupSelectorId (single group, no onchange)', () => {
        expect(MED_REGISTRY['abilify_maintena'].subGroupSelectorId).toBeUndefined();
    });
});

describe('buildStandardDef — formFieldIds', () => {
    it('invega_sustenna formFieldIds includes all three groups fields', () => {
        const ids = MED_REGISTRY['invega_sustenna'].formFieldIds;
        // selector field
        expect(ids).toContain('invega-type');
        // initiation branch field
        expect(ids).toContain('first-injection');
        // maintenance branch fields
        expect(ids).toContain('last-maintenance');
        expect(ids).toContain('maintenance-dose');
    });

    it('aristada formFieldIds includes both its fields', () => {
        const ids = MED_REGISTRY['aristada'].formFieldIds;
        expect(ids).toContain('last-aristada');
        expect(ids).toContain('aristada-dose');
    });
});
