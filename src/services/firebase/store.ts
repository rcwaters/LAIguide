import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
} from 'firebase/firestore';
import type { MedDataStore } from '../interfaces';
import { getApp } from './app';

const COLLECTION = 'meds';

export function createFirestoreStore(): MedDataStore {
    const db = getFirestore(getApp());
    const col = collection(db, COLLECTION);

    return {
        async listMedKeys() {
            const snap = await getDocs(col);
            return snap.docs.map(d => d.id);
        },
        async getMed(key) {
            const snap = await getDoc(doc(db, COLLECTION, key));
            return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        },
        async getAllMeds() {
            const snap = await getDocs(col);
            return snap.docs.map(d => d.data() as Record<string, unknown>);
        },
        async saveMed(key, data) {
            await setDoc(doc(db, COLLECTION, key), data);
        },
        async deleteMed(key) {
            await deleteDoc(doc(db, COLLECTION, key));
        },
    };
}
