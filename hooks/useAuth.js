"use client";

import { useAuth } from "@/context/AuthContext";

export function useAuthClient() {
  return useAuth();
}
