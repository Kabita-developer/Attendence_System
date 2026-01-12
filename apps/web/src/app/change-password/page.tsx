"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // Check if user is admin - only admins can change passwords
  React.useEffect(() => {
    (async () => {
      const res = await apiFetch<{ user: { role: "ADMIN" | "EMPLOYEE" } }>("/auth/me");
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }
      if (res.data.user.role !== "ADMIN") {
        // Employees cannot change their own password - redirect to their dashboard
        window.location.href = res.data.user.role === "EMPLOYEE" ? "/employee" : "/app";
        return;
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const res = await apiFetch<{ changed: boolean }>("/auth/change-password", {
      method: "POST",
      json: { currentPassword, newPassword }
    });

    setLoading(false);
    if (!res.ok) return setError(res.error.message);

    setInfo("Password updated. Redirecting...");
    setTimeout(() => {
      window.location.href = "/app";
    }, 600);
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-accent/40">
      <div className="container flex min-h-dvh items-center justify-center py-14">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border-white/15 bg-card/70">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Admin only: Change your admin password. Employees cannot change their own passwords - only admins can update employee passwords.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Current password</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">New password</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
                <Button className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}


