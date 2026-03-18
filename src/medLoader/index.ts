import type { MedicationKey, MedDefinition } from '../interfaces/med';
import { buildCoreDef, buildStandardDef } from './defBuilder';

export { pluralDays, composeEarlyGuidance } from './earlyBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_MED_JSONS: any[] = Object.values(import.meta.glob('../meds/*.json', { eager: true, import: 'default' }));

export const MED_REGISTRY: Record<MedicationKey, MedDefinition> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.fromEntries(ALL_MED_JSONS.flatMap((json: any) => {
        try {
            return [[json.key, { ...buildCoreDef(json), ...buildStandardDef(json) } as MedDefinition]];
        } catch (err) {
            console.error('[MED_REGISTRY] Failed to build definition for med:', json?.key ?? '(unknown)', err);
            return [];
        }
    })) as Record<MedicationKey, MedDefinition>;
