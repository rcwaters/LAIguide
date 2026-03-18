/** Provider-agnostic interface for med-data persistence.
 *  Swap the concrete implementation (GitHub, local files, etc.)
 *  without touching any consumer code. */

export interface MedDataStore {
    /** List all med JSON keys stored remotely. */
    listMedKeys(): Promise<string[]>;
    /** Fetch a single med JSON by key. Returns null if not found. */
    getMed(key: string): Promise<Record<string, unknown> | null>;
    /** Fetch every med JSON. */
    getAllMeds(): Promise<Record<string, unknown>[]>;
    /** Create or overwrite a med JSON by key. */
    saveMed(key: string, data: Record<string, unknown>): Promise<void>;
    /** Delete a med JSON by key. */
    deleteMed(key: string): Promise<void>;
}
