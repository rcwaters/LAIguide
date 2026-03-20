// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getSession, setSession, clearSession, sha256 } from '../session';
import { SESSION_KEY, SESSION_TTL_HOURS } from '../config';

beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ── sha256 ───────────────────────────────────────────────────────────────────

describe('sha256', () => {
    it('produces the correct hex digest for a known input', async () => {
        // sha256('1234') — same hash stored in config.ts for the default access code
        const hash = await sha256('1234');
        expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
    });

    it('returns a 64-character hex string', async () => {
        const hash = await sha256('hello');
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different hashes for different inputs', async () => {
        const a = await sha256('abc');
        const b = await sha256('xyz');
        expect(a).not.toBe(b);
    });

    it('is consistent — same input always yields same hash', async () => {
        const first = await sha256('consistent');
        const second = await sha256('consistent');
        expect(first).toBe(second);
    });
});

// ── setSession / getSession ──────────────────────────────────────────────────

describe('setSession / getSession', () => {
    it('returns null when nothing is stored', () => {
        expect(getSession()).toBeNull();
    });

    it('stores and retrieves the session email', () => {
        setSession('user@desc.org');
        const session = getSession();
        expect(session).not.toBeNull();
        expect(session?.email).toBe('user@desc.org');
    });

    it('stores the current timestamp', () => {
        const before = Date.now();
        setSession('user@desc.org');
        const after = Date.now();
        const session = getSession();
        expect(session?.loginAt).toBeGreaterThanOrEqual(before);
        expect(session?.loginAt).toBeLessThanOrEqual(after);
    });

    it('writes to localStorage under the correct key', () => {
        setSession('user@desc.org');
        expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    });
});

// ── Session expiry ───────────────────────────────────────────────────────────

describe('getSession — expiry', () => {
    it('returns the session when it is within the TTL', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
        setSession('user@desc.org');

        // Advance time by one hour less than the TTL
        vi.advanceTimersByTime((SESSION_TTL_HOURS - 1) * 3_600_000);
        expect(getSession()).not.toBeNull();
    });

    it('returns null and removes the item when the session has expired', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
        setSession('user@desc.org');

        // Advance past the TTL
        vi.advanceTimersByTime((SESSION_TTL_HOURS + 1) * 3_600_000);
        expect(getSession()).toBeNull();
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });
});

// ── clearSession ─────────────────────────────────────────────────────────────

describe('clearSession', () => {
    it('removes a stored session', () => {
        setSession('user@desc.org');
        clearSession();
        expect(getSession()).toBeNull();
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('does nothing when no session exists', () => {
        expect(() => clearSession()).not.toThrow();
    });
});

// ── Corrupt storage ──────────────────────────────────────────────────────────

describe('getSession — corrupt storage', () => {
    it('returns null and cleans up when localStorage contains invalid JSON', () => {
        localStorage.setItem(SESSION_KEY, '{ not valid json }}}');
        expect(getSession()).toBeNull();
        expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });
});
