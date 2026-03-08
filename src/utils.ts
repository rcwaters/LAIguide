import { marked } from 'marked';

// ─── Date / Time Utilities ────────────────────────────────────────────────────

export function daysSinceDate(dateString: string): number {
    const [year, month, day] = dateString.split('-').map(Number);
    const past  = new Date(year, month - 1, day); // local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);                    // local midnight
    return Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatWeeksAndDays(totalDays: number): string {
    const weeks         = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    if (weeks === 0) {
        return `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    } else if (remainingDays === 0) {
        return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
        return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    }
}

export function formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // local midnight
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

/** Parse a Markdown string into an HTML string for safe innerHTML insertion. */
export function md(text: string): string {
    return marked.parse(text) as string;
}
