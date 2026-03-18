/** Provider-agnostic interfaces for auth and med-data persistence.
 *  Swap the concrete implementation (Firebase, Supabase, etc.)
 *  without touching any consumer code. */

export interface AuthUser {
    uid: string;
    email: string;
}

export interface AuthService {
    /** Sign in with email + password. Resolves with the user on success. */
    signIn(email: string, password: string): Promise<AuthUser>;
    /** Sign out the current user. */
    signOut(): Promise<void>;
    /** Subscribe to auth-state changes. Returns an unsubscribe function. */
    onAuthStateChanged(cb: (user: AuthUser | null) => void): () => void;
}

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
