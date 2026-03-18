import {
    getAuth,
    signInWithEmailAndPassword,
    signOut as fbSignOut,
    onAuthStateChanged as fbOnAuthStateChanged,
} from 'firebase/auth';
import type { AuthService, AuthUser } from '../interfaces';
import { getApp } from './app';

function mapUser(u: { uid: string; email: string | null }): AuthUser {
    return { uid: u.uid, email: u.email ?? '' };
}

export function createFirebaseAuth(): AuthService {
    const auth = getAuth(getApp());

    return {
        async signIn(email, password) {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            return mapUser(cred.user);
        },
        async signOut() {
            await fbSignOut(auth);
        },
        onAuthStateChanged(cb) {
            return fbOnAuthStateChanged(auth, (u) => cb(u ? mapUser(u) : null));
        },
    };
}
