import { describe, it, expect } from 'vitest';
import { diffMed } from '../diffMed';

describe('diffMed', () => {
    it('returns empty array when both objects are identical', () => {
        const obj = { displayName: 'Abilify', optgroupLabel: 'Antipsychotics' };
        expect(diffMed(obj, obj)).toEqual([]);
    });

    it('detects a changed top-level field', () => {
        const result = diffMed({ displayName: 'Old Name' }, { displayName: 'New Name' });
        expect(result.map((c) => c.path)).toContain('displayName');
    });

    it('short strings are shown in full', () => {
        const result = diffMed({ displayName: 'Old Name' }, { displayName: 'New Name' });
        const change = result.find((c) => c.path === 'displayName')!;
        expect(change.from).toBe('Old Name');
        expect(change.to).toBe('New Name');
    });

    it('long strings show a contextual snippet centered on the diff', () => {
        const base = 'The patient should return to the clinic within X days for follow-up care';
        const from = base.replace('X', '7');
        const to = base.replace('X', '14');
        const result = diffMed({ note: from }, { note: to });
        const change = result.find((c) => c.path === 'note')!;
        // Both snippets should contain the changed word
        expect(change.from).toContain('7');
        expect(change.to).toContain('14');
        // Neither should be the full string (they are longer than MAX_INLINE=60)
        expect(change.from.length).toBeLessThan(from.length);
        expect(change.to.length).toBeLessThan(to.length);
        // Both should use ellipsis to indicate truncation
        expect(change.from).toMatch(/…/);
        expect(change.to).toMatch(/…/);
    });

    it('snippet context starts from the same position in both from and to', () => {
        const prefix = 'Go to the cherry store and buy some ';
        const from = prefix + 'apples for the family gathering tonight';
        const to = prefix + 'oranges for the family gathering tonight';
        const result = diffMed({ step: from }, { step: to });
        const change = result.find((c) => c.path === 'step')!;
        // Both should show the shared prefix context
        expect(change.from).toContain('cherry store');
        expect(change.to).toContain('cherry store');
        expect(change.from).toContain('apples');
        expect(change.to).toContain('oranges');
    });

    it('detects a newly added field with from=(none)', () => {
        const result = diffMed({}, { displayName: 'New' });
        const change = result.find((c) => c.path === 'displayName')!;
        expect(change.from).toBe('(none)');
        expect(change.to).toBe('New');
    });

    it('detects a removed field with to=(none)', () => {
        const result = diffMed({ displayName: 'Old' }, {});
        const change = result.find((c) => c.path === 'displayName')!;
        expect(change.from).toBe('Old');
        expect(change.to).toBe('(none)');
    });

    it('returns empty when nested objects are identical', () => {
        const obj = { guidance: { note: 'same' } };
        expect(diffMed(obj as Record<string, unknown>, obj as Record<string, unknown>)).toEqual([]);
    });

    it('detects a changed nested field via dot-path', () => {
        const result = diffMed(
            { guidance: { note: 'old value' } } as Record<string, unknown>,
            { guidance: { note: 'new value' } } as Record<string, unknown>,
        );
        const change = result.find((c) => c.path === 'guidance.note')!;
        expect(change).toBeDefined();
        expect(change.from).toBe('old value');
        expect(change.to).toBe('new value');
    });

    it('detects a changed array field (treated as leaf)', () => {
        const result = diffMed(
            { steps: ['a', 'b'] } as Record<string, unknown>,
            { steps: ['a', 'c'] } as Record<string, unknown>,
        );
        expect(result.map((c) => c.path)).toContain('steps');
    });

    it('unchanged array fields are not included', () => {
        const obj = { steps: ['a', 'b'] } as Record<string, unknown>;
        expect(diffMed(obj, obj)).toEqual([]);
    });

    it('returns only changed keys, not unchanged ones', () => {
        const result = diffMed({ a: '1', b: '2' }, { a: '1', b: '3' });
        expect(result.map((c) => c.path)).toContain('b');
        expect(result.map((c) => c.path)).not.toContain('a');
    });

    it('numeric values are shown without quotes', () => {
        const result = diffMed({ maxDays: 28 }, { maxDays: 35 });
        const change = result.find((c) => c.path === 'maxDays')!;
        expect(change.from).toBe('28');
        expect(change.to).toBe('35');
    });

    it('handles deeply nested changes', () => {
        const result = diffMed(
            { guidance: { late: { variants: [{ key: 'initiation' }] } } } as Record<
                string,
                unknown
            >,
            { guidance: { late: { variants: [{ key: 'maintenance' }] } } } as Record<
                string,
                unknown
            >,
        );
        expect(result.map((c) => c.path)).toContain('guidance.late.variants');
    });
});
