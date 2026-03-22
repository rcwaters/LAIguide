import type { MedDataStore } from '../services/interfaces';
import type { ChangelogEntry } from './types';

// Path is relative to this file's location (src/admin/ → src/meds/)
const localJsonModules = import.meta.glob<Record<string, unknown>>('../meds/*.json', {
    eager: true,
    import: 'default',
});

const LOCAL_CHANGELOG_KEY = 'lai_local_changelog';

function readChangelogFromStorage(): ChangelogEntry[] {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_CHANGELOG_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function writeChangelogToStorage(entries: ChangelogEntry[]): void {
    localStorage.setItem(LOCAL_CHANGELOG_KEY, JSON.stringify(entries));
}

/** In-memory store used when no GitHub token is configured. Changelog persisted to localStorage. */
export function createLocalStore(): MedDataStore {
    const meds: Record<string, Record<string, unknown>> = {};
    for (const [path, data] of Object.entries(localJsonModules)) {
        const key = path
            .split('/')
            .pop()!
            .replace(/\.json$/, '');
        meds[key] = data;
    }
    return {
        async listMedKeys() {
            return Object.keys(meds);
        },
        async getMed(key) {
            return meds[key] ?? null;
        },
        async getAllMeds() {
            return Object.values(meds);
        },
        async saveMed(key, data) {
            meds[key] = data;
        },
        async deleteMed(key) {
            if (!(key in meds)) throw new Error(`"${key}" not found.`);
            delete meds[key];
        },
        async getChangelog() {
            return readChangelogFromStorage();
        },
        async appendChangelog(entry) {
            const entries = readChangelogFromStorage();
            entries.unshift(entry);
            writeChangelogToStorage(entries);
        },
    };
}
