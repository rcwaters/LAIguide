import { SESSION_KEY, SESSION_TTL_HOURS } from './config';

export interface AdminSession {
    email: string;
    loginAt: number;
}

export function getSession(): AdminSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        const s: AdminSession = JSON.parse(raw);
        if (Date.now() - s.loginAt > SESSION_TTL_HOURS * 3_600_000) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return s;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export function setSession(email: string): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, loginAt: Date.now() }));
}

export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
}

export async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
