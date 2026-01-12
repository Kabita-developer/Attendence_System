"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/token";

export default function LoginPage() {
  const [employeeId, setEmployeeId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiFetch<{ user: any; token: string }>("/auth/login", {
      method: "POST",
      json: { employeeId, password }
    });

    setLoading(false);
    if (!res.ok) return setError(res.error.message);

    // Validate response data
    if (!res.data || !res.data.user || !res.data.token) {
      return setError("Invalid response from server");
    }

    // Store JWT token
    setToken(res.data.token);
    
    // Verify token was stored
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!storedToken) {
      return setError("Failed to store authentication token");
    }

    // Small delay to ensure token is persisted
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check if admin must change password (employees cannot change their own password)
    if (res.data.user.mustChangePassword && res.data.user.role === "ADMIN") {
      window.location.href = "/change-password";
      return;
    }

    // Redirect based on user role
    const userRole = res.data.user.role;
    if (userRole === "ADMIN") {
      window.location.href = "/admin";
    } else if (userRole === "EMPLOYEE") {
      window.location.href = "/employee";
    } else {
      return setError(`Unknown user role: ${userRole}`);
    }
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
              <CardTitle>Login</CardTitle>
              <CardDescription>First time: use your employee ID + one-time password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Employee ID</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="EMP000123"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Password</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="One-time password"
                    type="password"
                    required
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Admin forgot password?{" "}
                  <Link className="underline" href="/admin-reset">
                    Reset via OTP
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}


