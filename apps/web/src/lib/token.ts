"use client";

/**
 * JWT Token Management - localStorage
 * 
 * Stores JWT authorization tokens in browser localStorage for both ADMIN and EMPLOYEE users.
 * Tokens are automatically included in API requests via the Authorization header.
 * 
 * Storage: localStorage (persists across browser sessions)
 * Key: "auth_token"
 */

const TOKEN_KEY = "auth_token";

/**
 * Get the stored JWT token from localStorage
 * @returns JWT token string or null if not found
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store JWT token in localStorage
 * Used after successful login (both ADMIN and EMPLOYEE)
 * @param token - JWT token string from the API
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove JWT token from localStorage
 * Used on logout or when token is invalid/expired
 */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

