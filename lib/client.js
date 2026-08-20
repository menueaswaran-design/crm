"use client";

/**
 * Client-side fetch wrapper that attaches the auth token and
 * normalizes the standard API response shape.
 */
export async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body !== "string" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, { ...options, headers });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response (e.g. download).
  }

  if (!res.ok) {
    const message = json?.message || "Request failed. Please try again.";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return json;
}

export function getToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("crm_token="));
  return match ? match.split("=")[1] : null;
}

export async function getData(url) {
  const json = await apiFetch(url);
  return json.data;
}

export async function getList(url) {
  const json = await apiFetch(url);
  return { data: json.data, pagination: json.pagination };
}

export async function postData(url, body) {
  const json = await apiFetch(url, { method: "POST", body });
  return json.data;
}

export async function patchData(url, body) {
  const json = await apiFetch(url, { method: "PATCH", body });
  return json.data;
}

export async function deleteData(url) {
  const json = await apiFetch(url, { method: "DELETE" });
  return json.data;
}

export function buildQuery(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, value);
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}
