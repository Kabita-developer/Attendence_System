"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

export default function AppEntryPage() {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const res = await apiFetch<{ user: { role: "ADMIN" | "EMPLOYEE"; mustChangePassword?: boolean } }>(
        "/auth/me"
      );
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }
      // Only admins can change passwords - employees cannot change their own password
      if (res.data.user.mustChangePassword && res.data.user.role === "ADMIN") {
        window.location.href = "/change-password";
        return;
      }
      window.location.href = res.data.user.role === "ADMIN" ? "/admin" : "/employee";
    })().catch((e) => setError(e?.message ?? "Failed to load session"));
  }, []);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-accent/40">
      <div className="container flex min-h-dvh items-center justify-center py-14">
        <div className="text-center text-sm text-muted-foreground">
          {error ? error : "Loading your workspace..."}
        </div>
      </div>
    </main>
  );
}


