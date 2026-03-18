import { describe, it, expect, vi } from 'vitest';
import { MED_REGISTRY } from '../index';
import { buildCoreDef } from '../defBuilder';

describe('handleSubGroupChange — invega_sustenna (branched spec)', () => {
    const entry = MED_REGISTRY['invega_sustenna'];

    it('handleSubGroupChange is defined (branched spec)', () => {
        expect(entry.handleSubGroupChange).toBeDefined();
    });

    it('shows the initiation sub-group when branch is "initiation"', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        expect(show).toHaveBeenCalledWith('first-injection-date');
    });

    it('hides the maintenance sub-group when branch is "initiation"', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        expect(hide).toHaveBeenCalledWith('maintenance-fields');
    });

    it('clears maintenance fields when branch is "initiation"', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
        entry.handleSubGroupChange!('initiation', show, hide, clear);
        // clear must have been called at least once for the hidden group's fields
        expect(clear).toHaveBeenCalled();
    });

    it('shows the maintenance sub-group when branch is "maintenance"', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
        entry.handleSubGroupChange!('maintenance', show, hide, clear);
        expect(show).toHaveBeenCalledWith('maintenance-fields');
    });

    it('hides and clears the initiation sub-group when branch is "maintenance"', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
        entry.handleSubGroupChange!('maintenance', show, hide, clear);
        expect(hide).toHaveBeenCalledWith('first-injection-date');
        expect(clear).toHaveBeenCalled();
    });

    it('show and hide are called exactly once each (two sub-groups total)', () => {
        const show = vi.fn(); const hide = vi.fn(); const clear = vi.fn();
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

describe('buildCoreDef — error paths', () => {
    it('throws with a descriptive message when guidance.late has no variants', () => {
        const badJson = {
            key: 'test-med',
            displayName: 'Test Med',
            guidance: { late: {} },
        };
        expect(() => buildCoreDef(badJson)).toThrow(/No variants in late guidance for test-med/);
    });

    it('error message includes the med key', () => {
        try {
            buildCoreDef({ key: 'my-med', displayName: 'My Med', guidance: { late: {} } });
            expect.fail('should have thrown');
        } catch (e: unknown) {
            expect((e as Error).message).toContain('my-med');
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
