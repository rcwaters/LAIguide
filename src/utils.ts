import { marked } from 'marked';

// ─── Date / Time Utilities ────────────────────────────────────────────────────

export function daysSinceDate(dateString: string): number {
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        const past = new Date(year, month - 1, day); // local midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0); // local midnight
        return Math.round((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
    } catch (err) {
        console.error('[daysSinceDate] Failed to parse date string:', dateString, err);
        return 0;
    }
}

export function pluralize(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function formatWeeksAndDays(totalDays: number): string {
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    if (weeks === 0) return pluralize(remainingDays, 'day');
    if (remainingDays === 0) return pluralize(weeks, 'week');
    return `${pluralize(weeks, 'week')} and ${pluralize(remainingDays, 'day')}`;
}

export function formatDate(dateString: string): string {
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // local midnight
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (err) {
        console.error('[formatDate] Failed to format date string:', dateString, err);
        return dateString;
    }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

/** Parse a Markdown string into an HTML string for safe innerHTML insertion. */
export function md(text: string | string[]): string {
    let input: string;
    if (typeof text === 'string') {
        input = text;
    } else if (text.length === 1) {
        input = text[0];
    } else {
        input = text.map((step, index) => `${index + 1}. ${step}`).join('\n\n');
    }
    try {
        return marked.parse(input, { async: false });
    } catch (err) {
        console.error('[md] Failed to parse markdown:', err);
        return input;
    }
}
