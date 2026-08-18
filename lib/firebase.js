"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = () => Boolean(firebaseConfig.apiKey);

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

let analyticsPromise = null;

/** Browser-only Analytics init (safe to call multiple times). */
export function getFirebaseAnalytics() {
  if (typeof window === "undefined" || !firebaseConfig.measurementId) return null;
  const app = getFirebaseApp();
  if (!app) return null;

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}
