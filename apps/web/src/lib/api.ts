"use client";

import { env } from "@/lib/env";
import { getToken, removeToken } from "@/lib/token";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { message: string; status: number } };

/**
 * Main API fetch function for all backend API calls
 * 
 * @param path - API endpoint path (with or without /api prefix)
 * @param init - Fetch options including method, json body, etc.
 * @returns Promise with typed API result
 * 
 * @example
 * // GET request
 * const res = await apiFetch<{ user: User }>("/auth/me");
 * 
 * @example
 * // POST request
 * const res = await apiFetch("/auth/login", {
 *   method: "POST",
 *   json: { employeeId: "EMP000123", password: "password" }
 * });
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<ApiResult<T>> {
  // Build URL: use same-origin (unified server on port 3000)
  // If NEXT_PUBLIC_API_BASE_URL is set and not empty, use it (for production)
  // Otherwise use same-origin (relative URL = same origin)
  let baseUrl = env.apiBaseUrl || "";
  
  // Remove any port 4000 references (legacy backend)
  if (baseUrl.includes(":4000") || baseUrl.includes("localhost:4000")) {
    console.warn("[api] Detected port 4000 in API base URL. Using same-origin instead.");
    baseUrl = "";
  }
  
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;
  // Use relative URL (same-origin) when baseUrl is empty
  const url = baseUrl ? `${baseUrl}${apiPath}` : apiPath;
  
  const headers = new Headers(init.headers);

  // Set Content-Type for JSON requests
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  // Automatically include JWT token from localStorage
  const token = getToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body
    });

    // Handle non-JSON responses (e.g., PDF, Excel)
    const contentType = res.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      if (!res.ok) {
        return { 
          ok: false, 
          error: { message: `Request failed: ${res.statusText}`, status: res.status } 
        };
      }
      // For non-JSON responses, return the response as-is
      // This is handled by downloadFromApi for file downloads
      return { ok: false, error: { message: "Use downloadFromApi for file downloads", status: res.status } };
    }

    const payload = (await res.json().catch(() => null)) as any;
    if (!payload) {
      return { ok: false, error: { message: "Invalid server response", status: res.status } };
    }
    
    // Handle 401 Unauthorized - token might be expired
    if (res.status === 401 && payload.ok === false) {
      // Remove invalid token
      if (typeof window !== "undefined") {
        removeToken();
      }
    }
    
    return payload as ApiResult<T>;
  } catch (error: any) {
    return { 
      ok: false, 
      error: { message: error?.message || "Network error", status: 0 } 
    };
  }
}


