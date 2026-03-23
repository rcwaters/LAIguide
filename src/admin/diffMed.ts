import type { ChangelogChange } from './types';

function flattenObj(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            Object.assign(result, flattenObj(val as Record<string, unknown>, path));
        } else {
            result[path] = JSON.stringify(val);
        }
    }
    return result;
}

const CTX = 30;
const MAX_INLINE = 60;

function truncate(s: string, max = MAX_INLINE): string {
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

/**
 * For two strings that differ, returns snippets centered on the first differing
 * character so both show the same surrounding context.
 * e.g. "...cherry store..." / "...cherrys store..."
 */
function stringSnippets(a: string, b: string): { from: string; to: string } {
    if (a.length <= MAX_INLINE && b.length <= MAX_INLINE) return { from: a, to: b };

    // Find first differing character
    let diffAt = 0;
    while (diffAt < a.length && diffAt < b.length && a[diffAt] === b[diffAt]) diffAt++;

    const snippetStart = Math.max(0, diffAt - CTX);
    const prefix = snippetStart > 0 ? '…' : '';

    const fromEnd = Math.min(a.length, diffAt + CTX);
    const toEnd = Math.min(b.length, diffAt + CTX);

    return {
        from: prefix + a.slice(snippetStart, fromEnd) + (fromEnd < a.length ? '…' : ''),
        to: prefix + b.slice(snippetStart, toEnd) + (toEnd < b.length ? '…' : ''),
    };
}

function formatPair(fromRaw: string, toRaw: string): { from: string; to: string } {
    let fromParsed: unknown;
    let toParsed: unknown;
    try {
        fromParsed = JSON.parse(fromRaw);
        toParsed = JSON.parse(toRaw);
    } catch {
        return { from: truncate(fromRaw), to: truncate(toRaw) };
    }

    // Null / missing
    const fmt = (v: unknown, raw: string) =>
        v === null ? '(none)' : typeof v === 'string' ? v : truncate(raw);

    if (typeof fromParsed === 'string' && typeof toParsed === 'string') {
        return stringSnippets(fromParsed, toParsed);
    }

    return {
        from: fmt(fromParsed, fromRaw),
        to: fmt(toParsed, toRaw),
    };
}

/** Returns a list of changed fields with contextual old and new value snippets. */
export function diffMed(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
): ChangelogChange[] {
    const oldFlat = flattenObj(oldData);
    const newFlat = flattenObj(newData);
    const changes: ChangelogChange[] = [];
    const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
    for (const key of allKeys) {
        const fromRaw = oldFlat[key] ?? 'null';
        const toRaw = newFlat[key] ?? 'null';
        if (fromRaw !== toRaw) {
            const { from, to } = formatPair(fromRaw, toRaw);
            changes.push({ path: key, from, to });
        }
    }
    return changes;
}
