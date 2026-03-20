import { describe, it, expect } from 'vitest';
import { validateMedJson } from '../validate';
import type { RawMedJson } from '../types';

// ── Fixture helpers ──────────────────────────────────────────────────────────

function validMed(overrides: Partial<RawMedJson> = {}): RawMedJson {
    return {
        key: 'test_med',
        displayName: 'Test Med',
        optgroupLabel: 'Antipsychotics',
        guidance: {
            late: {
                variants: [{
                    key: 'maintenance',
                    tiers: [{
                        maxDays: 30,
                        guidance: { idealSteps: ['Administer dose.'] },
                    }],
                }],
            },
        },
        ...overrides,
    };
}

// ── Top-level required fields ────────────────────────────────────────────────

describe('validateMedJson — required top-level fields', () => {
    it('returns ok for a minimal valid med', () => {
        const result = validateMedJson(validMed());
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.key).toBe('test_med');
    });

    it('rejects null', () => {
        const result = validateMedJson(null);
        expect(result.ok).toBe(false);
    });

    it('rejects a plain array', () => {
        const result = validateMedJson([]);
        expect(result.ok).toBe(false);
    });

    it('rejects missing key', () => {
        const med = validMed();
        delete (med as Record<string, unknown>).key;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Key') });
    });

    it('rejects empty string key', () => {
        expect(validateMedJson(validMed({ key: '   ' }))).toMatchObject({ ok: false, error: expect.stringContaining('Key') });
    });

    it('rejects missing displayName', () => {
        const med = validMed();
        delete (med as Record<string, unknown>).displayName;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Display Name') });
    });

    it('rejects blank displayName', () => {
        expect(validateMedJson(validMed({ displayName: '' }))).toMatchObject({ ok: false, error: expect.stringContaining('Display Name') });
    });

    it('rejects missing optgroupLabel', () => {
        const med = validMed();
        delete (med as Record<string, unknown>).optgroupLabel;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Category') });
    });

    it('rejects missing guidance object', () => {
        const med = validMed();
        delete (med as Record<string, unknown>).guidance;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Guidance data') });
    });

    it('rejects guidance as an array', () => {
        expect(validateMedJson({ ...validMed(), guidance: [] as unknown as RawMedJson['guidance'] }))
            .toMatchObject({ ok: false, error: expect.stringContaining('Guidance data') });
    });
});

// ── Early guidance numeric fields ────────────────────────────────────────────

describe('validateMedJson — early guidance numeric fields', () => {
    function withEarly(fields: Record<string, unknown>): RawMedJson {
        return { ...validMed(), guidance: { ...validMed().guidance, early: fields } };
    }

    it('accepts a valid minDays', () => {
        expect(validateMedJson(withEarly({ minDays: 21 }))).toMatchObject({ ok: true });
    });

    it('accepts minDays of 0', () => {
        expect(validateMedJson(withEarly({ minDays: 0 }))).toMatchObject({ ok: true });
    });

    it('rejects negative minDays', () => {
        expect(validateMedJson(withEarly({ minDays: -1 }))).toMatchObject({ ok: false, error: expect.stringContaining('Min Days') });
    });

    it('rejects NaN minDays', () => {
        expect(validateMedJson(withEarly({ minDays: NaN }))).toMatchObject({ ok: false, error: expect.stringContaining('Min Days') });
    });

    it('accepts a valid daysBeforeDue', () => {
        expect(validateMedJson(withEarly({ daysBeforeDue: 2 }))).toMatchObject({ ok: true });
    });

    it('rejects negative daysBeforeDue', () => {
        expect(validateMedJson(withEarly({ daysBeforeDue: -5 }))).toMatchObject({ ok: false, error: expect.stringContaining('Days Before Due') });
    });

    it('ignores early block when absent', () => {
        const med = { ...validMed() };
        delete med.guidance.early;
        expect(validateMedJson(med)).toMatchObject({ ok: true });
    });
});

// ── Late guidance variants ───────────────────────────────────────────────────

describe('validateMedJson — late guidance variants', () => {
    it('rejects missing late block', () => {
        const med = { ...validMed(), guidance: { ...validMed().guidance } };
        delete (med.guidance as Record<string, unknown>).late;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Late Guidance') });
    });

    it('rejects empty variants array', () => {
        expect(validateMedJson({ ...validMed(), guidance: { late: { variants: [] } } }))
            .toMatchObject({ ok: false, error: expect.stringContaining('Late Guidance') });
    });

    it('rejects a variant missing a key', () => {
        const med = validMed();
        (med.guidance.late.variants[0] as unknown as Record<string, unknown>).key = '';
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('missing a key') });
    });

    it('rejects a non-inherited variant with no tiers', () => {
        const med = validMed();
        med.guidance.late.variants[0].tiers = [];
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('at least one tier') });
    });

    it('accepts an inherited variant (sameAs) without tiers', () => {
        const med = validMed();
        med.guidance.late.variants.push({ key: 'initiation', sameAs: 'maintenance' });
        expect(validateMedJson(med)).toMatchObject({ ok: true });
    });

    it('includes the variant key in the error message', () => {
        const med = validMed();
        med.guidance.late.variants[0].tiers = [];
        const result = validateMedJson(med);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('maintenance');
    });
});

// ── Tier validation ──────────────────────────────────────────────────────────

describe('validateMedJson — tiers', () => {
    function medWithTier(fields: Record<string, unknown>): RawMedJson {
        const med = validMed();
        Object.assign(med.guidance.late.variants[0].tiers![0], fields);
        return med;
    }

    it('accepts maxDays of null (open-ended tier)', () => {
        expect(validateMedJson(medWithTier({ maxDays: null }))).toMatchObject({ ok: true });
    });

    it('accepts maxDays of 0', () => {
        expect(validateMedJson(medWithTier({ maxDays: 0 }))).toMatchObject({ ok: true });
    });

    it('rejects negative maxDays', () => {
        expect(validateMedJson(medWithTier({ maxDays: -1 }))).toMatchObject({ ok: false, error: expect.stringContaining('Max Days') });
    });

    it('rejects NaN maxDays', () => {
        expect(validateMedJson(medWithTier({ maxDays: NaN }))).toMatchObject({ ok: false, error: expect.stringContaining('Max Days') });
    });

    it('rejects a tier with no idealSteps', () => {
        expect(validateMedJson(medWithTier({ guidance: { idealSteps: [] } })))
            .toMatchObject({ ok: false, error: expect.stringContaining('Ideal Step') });
    });

    it('rejects a tier with missing guidance block', () => {
        const med = validMed();
        delete (med.guidance.late.variants[0].tiers![0] as unknown as Record<string, unknown>).guidance;
        expect(validateMedJson(med)).toMatchObject({ ok: false, error: expect.stringContaining('Ideal Step') });
    });

    it('includes the tier number in the error message', () => {
        const med = validMed();
        med.guidance.late.variants[0].tiers!.push({ maxDays: null, guidance: { idealSteps: [] } });
        const result = validateMedJson(med);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('Tier 2');
    });
});

// ── Extra fields & return shape ──────────────────────────────────────────────

describe('validateMedJson — extra fields and return type', () => {
    it('preserves extra top-level fields in the returned data', () => {
        const med = { ...validMed(), formGroupsSpec: [{ groupId: 'g1', fields: [] }] };
        const result = validateMedJson(med);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.formGroupsSpec).toBeDefined();
    });

    it('returns the full typed data object on success', () => {
        const result = validateMedJson(validMed());
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.key).toBe('test_med');
            expect(result.data.displayName).toBe('Test Med');
            expect(result.data.optgroupLabel).toBe('Antipsychotics');
        }
    });

    it('stops at the first error encountered', () => {
        // Both key and displayName missing — should report the first check (key)
        const med = { optgroupLabel: 'X', guidance: validMed().guidance } as unknown;
        const result = validateMedJson(med);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('Key');
    });
});
