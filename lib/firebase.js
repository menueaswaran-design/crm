"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAFkcU0EMY9a2WVFPEqGPPAlkgq1YOB5F4",
  authDomain: "crm-ca-db172.firebaseapp.com",
  projectId: "crm-ca-db172",
  storageBucket: "crm-ca-db172.firebasestorage.app",
  messagingSenderId: "735079159014",
  appId: "1:735079159014:web:91accbf2c16457b1bed727",
  measurementId: "G-5T7M0B289T",
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
