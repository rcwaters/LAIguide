import type { MedDataStore } from '../services/interfaces';
import type { ChangelogEntry } from './types';

// Path is relative to this file's location (src/admin/ → src/meds/)
const localJsonModules = import.meta.glob<Record<string, unknown>>('../meds/*.json', {
    eager: true,
    import: 'default',
});

const LOCAL_CHANGELOG_KEY = 'lai_local_changelog';
const LOCAL_MEDS_KEY = 'lai_local_meds';

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

function readMedsFromStorage(): Record<string, Record<string, unknown>> {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_MEDS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function writeMedsToStorage(meds: Record<string, Record<string, unknown>>): void {
    localStorage.setItem(LOCAL_MEDS_KEY, JSON.stringify(meds));
}

/** Local store used when no GitHub token is configured. All changes persisted to localStorage. */
export function createLocalStore(): MedDataStore {
    // Start from bundled JSON files, then overlay any locally saved edits.
    const meds: Record<string, Record<string, unknown>> = {};
    for (const [path, data] of Object.entries(localJsonModules)) {
        const key = path
            .split('/')
            .pop()!
            .replace(/\.json$/, '');
        meds[key] = data;
    }
    const saved = readMedsFromStorage();
    for (const [key, data] of Object.entries(saved)) {
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
            const stored = readMedsFromStorage();
            stored[key] = data;
            writeMedsToStorage(stored);
        },
        async deleteMed(key) {
            if (!(key in meds)) throw new Error(`"${key}" not found.`);
            delete meds[key];
            const stored = readMedsFromStorage();
            delete stored[key];
            writeMedsToStorage(stored);
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
