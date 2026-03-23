import type { MedicationKey, MedDefinition } from '../interfaces/med';
import { buildCoreDef, buildStandardDef } from './defBuilder';

export { pluralDays, composeEarlyGuidance } from './earlyBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MED_JSONS: [string, any][] = Object.entries(
    import.meta.glob('../meds/*.json', { eager: true, import: 'default' }),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryBuild(key: string, json: any): MedDefinition | null {
    if (!json?.guidance) return null;
    try {
        return { ...buildCoreDef(json), ...buildStandardDef(json) } as MedDefinition;
    } catch (err) {
        console.error('[MED_REGISTRY] Failed to build definition for med:', key, err);
        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function localStorageOverrides(): Record<string, any> {
    if (typeof localStorage === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem('lai_local_meds') ?? '{}');
    } catch {
        return {};
    }
}

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registry: Record<string, any> = Object.fromEntries(
        ALL_MED_JSONS.flatMap(([path, json]) => {
            const key = path.replace(/^.*\/(.+)\.json$/, '$1');
            const def = tryBuild(key, json);
            return def ? [[key, def]] : [];
        }),
    );
    // Overlay any locally saved edits (local dev only — no GitHub token).
    for (const [key, json] of Object.entries(localStorageOverrides())) {
        const def = tryBuild(key, json);
        if (def) registry[key] = def;
    }
    return registry;
})();
