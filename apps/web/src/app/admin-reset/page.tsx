"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

export default function AdminResetPage() {
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");

  const [devOtp, setDevOtp] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function requestOtp() {
    setError(null);
    setInfo(null);
    setDevOtp(null);
    setLoading(true);
    const res = await apiFetch<{ requested: boolean; devOtp?: string }>("/auth/admin/request-password-reset", {
      method: "POST",
      json: { email }
    });
    setLoading(false);
    if (!res.ok) return setError(res.error.message);
    setInfo("If the admin account exists, an OTP has been issued.");
    setDevOtp(res.data.devOtp ?? null);
  }

  async function confirm() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const res = await apiFetch<{ reset: boolean }>("/auth/admin/confirm-password-reset", {
      method: "POST",
      json: { email, otp, newPassword }
    });
    setLoading(false);
    if (!res.ok) return setError(res.error.message);
    setInfo("Password updated. Please login.");
    setTimeout(() => (window.location.href = "/login"), 700);
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-accent/40">
      <div className="container flex min-h-dvh items-center justify-center py-14">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="w-full max-w-md border-white/15 bg-card/70">
            <CardHeader>
              <CardTitle>Admin password reset</CardTitle>
              <CardDescription>Request OTP and set a new password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Admin email</label>
                <input
                  className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>

              <Button className="w-full" variant="outline" onClick={requestOtp} disabled={loading || !email}>
                {loading ? "Requesting..." : "Request OTP"}
              </Button>

              {devOtp ? (
                <div className="rounded-md border bg-background/40 p-3 text-sm">
                  <div className="font-medium">Dev OTP</div>
                  <div className="text-muted-foreground">{devOtp}</div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">OTP</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">New password</label>
                  <input
                    className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    minLength={8}
                    placeholder="New password"
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

              <Button className="w-full" onClick={confirm} disabled={loading || !email || !otp || newPassword.length < 8}>
                {loading ? "Updating..." : "Confirm reset"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Back to{" "}
                <Link className="underline" href="/login">
                  login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}


