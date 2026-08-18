"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics, isFirebaseConfigured } from "@/lib/firebase";

/** Initializes Firebase Analytics once on the client. */
export default function FirebaseAnalytics() {
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    getFirebaseAnalytics();
  }, []);

  return null;
}
