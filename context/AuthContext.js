"use client";

import { isFirebaseConfigured, getFirebaseApp } from "@/lib/firebase";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

const TOKEN_COOKIE = "crm_token";
const USER_KEY = "crm_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const setToken = useCallback((token) => {
    if (typeof document === "undefined") return;
    document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  }, []);

  const clearToken = useCallback(() => {
    if (typeof document === "undefined") return;
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  }, []);

  const persistUser = useCallback((nextUser, token) => {
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    if (token) setToken(token);
  }, [setToken]);

  const login = useCallback(
    async ({ email, password, role }) => {
      const app = getFirebaseApp();
      if (app && isFirebaseConfigured()) {
        try {
          const auth = getAuth(app);
          const credential = await signInWithEmailAndPassword(auth, email, password);
          const token = await credential.user.getIdToken();

          // Link Firebase account → CRM user (creates admin if ADMIN_EMAIL matches)
          let res = await fetch("/api/auth/sync", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          let json = await res.json();

          if (!json.data) {
            res = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            json = await res.json();
          }

          if (!json.data) {
            throw new Error(
              json.message || "Account not found in CRM. Ask an admin to add your account."
            );
          }

          persistUser(json.data, token);
          return json.data;
        } catch (firebaseErr) {
          const code = firebaseErr?.code || "";
          const recoverable =
            code.includes("configuration-not-found") ||
            code.includes("invalid-api-key") ||
            code.includes("network-request-failed") ||
            code.includes("user-not-found") ||
            code.includes("wrong-password") ||
            code.includes("invalid-credential");
          if (!recoverable) throw firebaseErr;
        }
      }

      // Bootstrap admin from ADMIN_EMAIL / ADMIN_PASSWORD.
      const adminRes = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const adminJson = await adminRes.json();
      if (adminJson.success && adminJson.data) {
        persistUser(adminJson.data.user, adminJson.data.token);
        return adminJson.data.user;
      }

      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(adminJson.message || json.message || "Login failed.");
      }
      persistUser(json.data.user, json.data.token);
      return json.data.user;
    },
    [persistUser]
  );

  const logout = useCallback(() => {
    const app = getFirebaseApp();
    if (app && isFirebaseConfigured()) {
      try {
        getAuth(app).signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(USER_KEY);
    clearToken();
    setUser(null);
    router.push("/login");
  }, [clearToken, router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.data) {
        setUser(json.data);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data));
        return json.data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
