"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

export function SessionGuard({
  role,
  children
}: {
  role: "ADMIN" | "EMPLOYEE";
  children: React.ReactNode;
}) {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ user: { role: "ADMIN" | "EMPLOYEE"; mustChangePassword?: boolean } }>("/auth/me");
        if (!res.ok) {
          console.error("SessionGuard: /auth/me failed", res.error);
          window.location.href = "/login";
          return;
        }
        // Only admins can change passwords - employees cannot change their own password
        if (res.data.user.mustChangePassword && res.data.user.role === "ADMIN") {
          window.location.href = "/change-password";
          return;
        }
        if (res.data.user.role !== role) {
          console.warn(`SessionGuard: Expected role ${role}, got ${res.data.user.role}`);
          window.location.href = "/app";
          return;
        }
        setReady(true);
      } catch (e) {
        console.error("SessionGuard error:", e);
        setError(e?.message ?? "Failed to load session");
      }
    })();
  }, [role]);

  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (!ready) return <div className="text-sm text-muted-foreground">Loading...</div>;
  return <>{children}</>;
}


