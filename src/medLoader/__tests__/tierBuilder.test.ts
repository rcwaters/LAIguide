import { describe, it, expect, vi } from 'vitest';
import { buildTier, buildTiers, buildVariantMap, resolveLateTier } from '../tierBuilder';

describe('buildTier', () => {
    it('returns a static tier with correct maxDays and guidance', () => {
        const raw = { maxDays: 30, guidance: { idealSteps: ['Step A'] } };
        const tier = buildTier(raw);
        expect(tier.type).toBe('static');
        expect(tier.maxDays).toBe(30);
        if (tier.type === 'static') expect(tier.guidance.idealSteps).toEqual(['Step A']);
    });

    it('null maxDays becomes Infinity', () => {
        const raw = { maxDays: null, guidance: { idealSteps: ['Last step'] } };
        const tier = buildTier(raw);
        expect(tier.maxDays).toBe(Infinity);
    });

    it('guidanceByDose → dose-variant type with guidanceByDose map', () => {
        const raw = {
            maxDays: 60,
            guidanceByDose: {
                low: { idealSteps: ['low guidance'] },
                high: { idealSteps: ['high guidance'] },
            },
        };
        const tier = buildTier(raw);
        expect(tier.type).toBe('dose-variant');
        expect(tier.maxDays).toBe(60);
        if (tier.type === 'dose-variant' && tier.guidanceByDose) {
            expect(tier.guidanceByDose['low'].idealSteps).toEqual(['low guidance']);
            expect(tier.guidanceByDose['high'].idealSteps).toEqual(['high guidance']);
        }
    });

    it('guidanceByDoseRules → dose-variant type with rules array', () => {
        const raw = {
            maxDays: 60,
            guidanceByDoseRules: [{ doses: ['50'], guidance: { idealSteps: ['50mg step'] } }],
        };
        const tier = buildTier(raw);
        expect(tier.type).toBe('dose-variant');
        if (tier.type === 'dose-variant' && tier.guidanceByDoseRules) {
            expect(tier.guidanceByDoseRules[0].doses).toEqual(['50']);
            expect(tier.guidanceByDoseRules[0].guidance.idealSteps).toEqual(['50mg step']);
        }
    });

    it('guidanceByDoseRules + defaultGuidance includes defaultGuidance', () => {
        const raw = {
            maxDays: 60,
            guidanceByDoseRules: [{ doses: ['50'], guidance: { idealSteps: ['50mg'] } }],
            defaultGuidance: { idealSteps: ['default'] },
        };
        const tier = buildTier(raw);
        expect(tier.type).toBe('dose-variant');
        if (tier.type === 'dose-variant') {
            expect(tier.defaultGuidance?.idealSteps).toEqual(['default']);
        }
    });

    it('when both guidanceByDose and guidanceByDoseRules are present, type is dose-variant and both fields are kept', () => {
        const raw = {
            maxDays: 60,
            guidanceByDose: { a: { idealSteps: ['dose-map'] } },
            guidanceByDoseRules: [{ doses: ['a'], guidance: { idealSteps: ['rules'] } }],
        };
        const tier = buildTier(raw);
        expect(tier.type).toBe('dose-variant');
        if (tier.type === 'dose-variant') {
            // buildTier stores both; resolveLateTier's if-else applies the priority at runtime
            expect(tier.guidanceByDose).toBeDefined();
            expect(tier.guidanceByDoseRules).toBeDefined();
        }
    });
});

describe('buildTiers', () => {
    it('maps array of raws to LateTiers preserving order', () => {
        const raws = [
            { maxDays: 10, guidance: { idealSteps: ['A'] } },
            { maxDays: 30, guidance: { idealSteps: ['B'] } },
            { maxDays: null, guidance: { idealSteps: ['C'] } },
        ];
        const tiers = buildTiers(raws);
        expect(tiers).toHaveLength(3);
        expect(tiers[0].maxDays).toBe(10);
        expect(tiers[1].maxDays).toBe(30);
        expect(tiers[2].maxDays).toBe(Infinity);
    });

    it('empty array produces empty result', () => {
        expect(buildTiers([])).toEqual([]);
    });
});

describe('buildVariantMap', () => {
    it('populates own-tier variants by key', () => {
        const variants = [
            { key: 'a', tiers: [{ maxDays: 30, guidance: { idealSteps: ['A'] } }] },
            { key: 'b', tiers: [{ maxDays: 60, guidance: { idealSteps: ['B'] } }] },
        ];
        const map = buildVariantMap(variants, buildTiers);
        expect(Object.keys(map)).toEqual(expect.arrayContaining(['a', 'b']));
        expect(map['a'][0].maxDays).toBe(30);
        expect(map['b'][0].maxDays).toBe(60);
    });

    it('sameAs entry shares the exact same array reference as its target', () => {
        const variants = [
            { key: 'x', tiers: [{ maxDays: 30, guidance: { idealSteps: ['X'] } }] },
            { key: 'y', sameAs: 'x' },
        ];
        const map = buildVariantMap(variants, buildTiers);
        expect(map['y']).toBe(map['x']);
    });

    it('sameAs resolves correctly even when the alias appears before its target', () => {
        const variants = [
            { key: 'z', sameAs: 'w' },
            { key: 'w', tiers: [{ maxDays: 90, guidance: { idealSteps: ['W'] } }] },
        ];
        const map = buildVariantMap(variants, buildTiers);
        expect(map['z']).toBe(map['w']);
        expect(map['z'][0].maxDays).toBe(90);
    });

    it('multiple sameAs keys all resolve to the same reference', () => {
        const variants = [
            { key: 'base', tiers: [{ maxDays: 50, guidance: { idealSteps: ['base'] } }] },
            { key: 'alias1', sameAs: 'base' },
            { key: 'alias2', sameAs: 'base' },
        ];
        const map = buildVariantMap(variants, buildTiers);
        expect(map['alias1']).toBe(map['base']);
        expect(map['alias2']).toBe(map['base']);
    });
});

describe('resolveLateTier — static tiers', () => {
    const tiers = buildTiers([
        { maxDays: 30, guidance: { idealSteps: ['within 30'] } },
        { maxDays: 60, guidance: { idealSteps: ['31 to 60'] } },
        { maxDays: null, guidance: { idealSteps: ['beyond 60'] } },
    ]);

    it('returns first tier when daysSince is within its maxDays', () => {
        expect(resolveLateTier(tiers, 20).idealSteps).toEqual(['within 30']);
    });

    it('returns first tier at exact boundary (daysSince = maxDays)', () => {
        expect(resolveLateTier(tiers, 30).idealSteps).toEqual(['within 30']);
    });

    it('returns middle tier just past first boundary', () => {
        expect(resolveLateTier(tiers, 31).idealSteps).toEqual(['31 to 60']);
    });

    it('returns last tier when daysSince exceeds all finite maxDays', () => {
        expect(resolveLateTier(tiers, 200).idealSteps).toEqual(['beyond 60']);
    });

    it('Infinity tier acts as catch-all for any large value', () => {
        expect(resolveLateTier(tiers, 99999).idealSteps).toEqual(['beyond 60']);
    });
});

describe('resolveLateTier — dose-variant via guidanceByDose', () => {
    const tiers = buildTiers([
        {
            maxDays: null,
            guidanceByDose: {
                low: { idealSteps: ['low guidance'] },
                high: { idealSteps: ['high guidance'] },
            },
        },
    ]);

    it('returns guidance matching the provided dose key', () => {
        expect(resolveLateTier(tiers, 50, 'low').idealSteps).toEqual(['low guidance']);
        expect(resolveLateTier(tiers, 50, 'high').idealSteps).toEqual(['high guidance']);
    });

    it('returns error fallback and logs error for unknown dose', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(resolveLateTier(tiers, 50, 'unknown').idealSteps).toEqual([
            'Guidance unavailable: dose not recognised. Please contact the prescriber.',
        ]);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('returns error fallback and logs error when no dose provided', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(resolveLateTier(tiers, 50).idealSteps).toEqual([
            'Guidance unavailable: dose not recognised. Please contact the prescriber.',
        ]);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe('resolveLateTier — dose-variant via guidanceByDoseRules', () => {
    const tiersWithDefault = buildTiers([
        {
            maxDays: null,
            guidanceByDoseRules: [
                { doses: ['100', '150'], guidance: { idealSteps: ['small dose'] } },
                { doses: ['200'], guidance: { idealSteps: ['large dose'] } },
            ],
            defaultGuidance: { idealSteps: ['default guidance'] },
        },
    ]);

    it('returns guidance for a dose in the first rule', () => {
        expect(resolveLateTier(tiersWithDefault, 50, '100').idealSteps).toEqual(['small dose']);
        expect(resolveLateTier(tiersWithDefault, 50, '150').idealSteps).toEqual(['small dose']);
    });

    it('returns guidance for a dose in the second rule', () => {
        expect(resolveLateTier(tiersWithDefault, 50, '200').idealSteps).toEqual(['large dose']);
    });

    it('returns defaultGuidance when dose matches no rule', () => {
        expect(resolveLateTier(tiersWithDefault, 50, 'unknown').idealSteps).toEqual([
            'default guidance',
        ]);
    });

    it('returns defaultGuidance when no dose is provided', () => {
        expect(resolveLateTier(tiersWithDefault, 50).idealSteps).toEqual(['default guidance']);
    });

    it('returns error fallback and logs error when no match and no defaultGuidance', () => {
        const noDefaultTiers = buildTiers([
            {
                maxDays: null,
                guidanceByDoseRules: [{ doses: ['300'], guidance: { idealSteps: ['300mg'] } }],
            },
        ]);
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(resolveLateTier(noDefaultTiers, 50, 'unknown').idealSteps).toEqual([
            'Guidance unavailable: dose not recognised. Please contact the prescriber.',
        ]);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
