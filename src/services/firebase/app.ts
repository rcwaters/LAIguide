import { initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let app: FirebaseApp | null = null;

export function getApp(): FirebaseApp {
    if (!app) app = initializeApp(firebaseConfig);
    return app;
}
