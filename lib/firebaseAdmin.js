import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const privateKey = process.env.FIREBASE_PRIVATE_KEY;

export const isFirebaseAdminConfigured = () =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      privateKey
  );

function normalizePrivateKey(key) {
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) return null;
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(privateKey),
    }),
  });
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}
