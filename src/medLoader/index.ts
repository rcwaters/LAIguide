import type { MedicationKey, MedDefinition } from '../interfaces/med';
import { buildCoreDef, buildStandardDef } from './defBuilder';

export { pluralDays, composeEarlyGuidance } from './earlyBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MED_JSONS: [string, any][] = Object.entries(
    import.meta.glob('../meds/*.json', { eager: true, import: 'default' }),
);

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> = Object.fromEntries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ALL_MED_JSONS.flatMap(([path, json]: [string, any]) => {
        const key = path.replace(/^.*\/(.+)\.json$/, '$1');
        if (!json?.guidance) return [];
        try {
            return [[key, { ...buildCoreDef(json), ...buildStandardDef(json) } as MedDefinition]];
        } catch (err) {
            console.error('[MED_REGISTRY] Failed to build definition for med:', key, err);
            return [];
        }
    }),
);
