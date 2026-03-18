import { describe, it, expect } from 'vitest';
import { MED_REGISTRY } from '../index';

const EXPECTED_KEYS = [
    'abilify_maintena',
    'aristada',
    'brixadi',
    'fluphenazine_decanoate',
    'haloperidol_decanoate',
    'invega_hafyera',
    'invega_sustenna',
    'invega_trinza',
    'sublocade',
    'uzedy',
    'vivitrol',
] as const;

describe('MED_REGISTRY — index', () => {
    it('contains exactly the expected medication keys', () => {
        expect(Object.keys(MED_REGISTRY).sort()).toEqual([...EXPECTED_KEYS].sort());
    });

    it('skip guard: definitions.json (no key/guidance) is not included', () => {
        expect('definitions' in MED_REGISTRY).toBe(false);
    });

    it('every entry has a displayName string', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].displayName).toBe('string');
            expect(MED_REGISTRY[key].displayName.length).toBeGreaterThan(0);
        }
    });

    it('every entry has a getLateGuidance function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].getLateGuidance).toBe('function');
        }
    });

    it('every entry has a validateLate function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].validateLate).toBe('function');
        }
    });

    it('every entry has a buildLateParams function', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].buildLateParams).toBe('function');
        }
    });

    it('every entry has a non-empty earlyGuidance string', () => {
        for (const key of EXPECTED_KEYS) {
            expect(typeof MED_REGISTRY[key].earlyGuidance).toBe('string');
            expect(MED_REGISTRY[key].earlyGuidance.length).toBeGreaterThan(0);
        }
    });
});
