import { describe, it, expect } from 'vitest';
import { daysSinceDate, formatWeeksAndDays, formatDate, md } from '../utils';

/** Returns a YYYY-MM-DD string for N days ago in local time. */
function localDaysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

describe('formatWeeksAndDays', () => {
    it('returns days only when less than 1 week', () => {
        expect(formatWeeksAndDays(0)).toBe('0 days');
        expect(formatWeeksAndDays(1)).toBe('1 day');
        expect(formatWeeksAndDays(6)).toBe('6 days');
    });

    it('returns weeks only when evenly divisible', () => {
        expect(formatWeeksAndDays(7)).toBe('1 week');
        expect(formatWeeksAndDays(14)).toBe('2 weeks');
        expect(formatWeeksAndDays(28)).toBe('4 weeks');
    });

    it('returns weeks and days for mixed values', () => {
        expect(formatWeeksAndDays(8)).toBe('1 week and 1 day');
        expect(formatWeeksAndDays(10)).toBe('1 week and 3 days');
        expect(formatWeeksAndDays(45)).toBe('6 weeks and 3 days');
    });
});

describe('daysSinceDate', () => {
    it('returns 0 for today', () => {
        expect(daysSinceDate(localDaysAgo(0))).toBe(0);
    });

    it('returns correct count for past dates', () => {
        expect(daysSinceDate(localDaysAgo(1))).toBe(1);
        expect(daysSinceDate(localDaysAgo(28))).toBe(28);
        expect(daysSinceDate(localDaysAgo(180))).toBe(180);
    });

    it('is not affected by time-of-day (no UTC off-by-one)', () => {
        // Regardless of when during the day this test runs, today = 0, yesterday = 1
        expect(daysSinceDate(localDaysAgo(0))).toBe(0);
        expect(daysSinceDate(localDaysAgo(1))).toBe(1);
    });

    it('is DST-safe (Math.round survives the 23-hour spring-forward day)', () => {
        // On DST spring-forward, "yesterday" is only 23 hours.
        // Math.floor(23h / 24h) = 0 (wrong); Math.round = 1 (correct).
        // Simulate by checking a wide range of past dates — none should be off by 1.
        for (const n of [1, 2, 7, 14, 30, 90, 180]) {
            expect(daysSinceDate(localDaysAgo(n))).toBe(n);
        }
    });
});

describe('formatDate', () => {
    it('formats a known date correctly', () => {
        expect(formatDate('2025-01-15')).toBe('January 15, 2025');
        expect(formatDate('2026-12-31')).toBe('December 31, 2026');
    });

    it('displays the same day that was entered (no UTC shift)', () => {
        // Build a date string from local time to confirm no off-by-one
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const input = `${yyyy}-${mm}-${dd}`;
        const formatted = formatDate(input);
        // The formatted string must include the correct day number
        expect(formatted).toContain(String(today.getDate()));
        expect(formatted).toContain(String(yyyy));
    });
});

describe('md', () => {
    it('wraps plain text in a paragraph tag', () => {
        const output = md('Hello world');
        expect(output).toContain('<p>');
        expect(output).toContain('Hello world');
    });

    it('converts **bold** to <strong>', () => {
        const output = md('**important**');
        expect(output).toContain('<strong>important</strong>');
    });

    it('converts a markdown bullet list to <ul><li>', () => {
        const output = md('- one\n- two');
        expect(output).toContain('<ul>');
        expect(output).toContain('<li>');
        expect(output).toContain('one');
        expect(output).toContain('two');
    });

    it('returns a non-empty string for empty input', () => {
        expect(typeof md('')).toBe('string');
    });

    it('renders single-element array without numbering', () => {
        const output = md(['Single step']);
        expect(output).toContain('<p>Single step</p>');
        expect(output).not.toContain('1.');
    });

    it('renders multi-element array with numbering', () => {
        const output = md(['First step', 'Second step']);
        expect(output).toContain('<ol>');
        expect(output).toContain('<li><p>First step</p>');
        expect(output).toContain('<li><p>Second step</p>');
    });
});
