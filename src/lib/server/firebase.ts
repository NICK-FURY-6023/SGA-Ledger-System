import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let db: Firestore | null = null;
let firebaseAvailable: boolean | null = null;

export function isFirebaseConfigured(): boolean {
  if (firebaseAvailable === false) return false;
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function markFirebaseUnavailable() {
  firebaseAvailable = false;
  console.warn('[SGALA] Firestore unavailable — falling back to in-memory store');
}

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;

  if (!app && getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  } else if (!app) {
    app = getApps()[0];
  }

  if (!db) {
    db = getFirestore(app!);
  }

  return db;
}
