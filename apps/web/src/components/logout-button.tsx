"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { removeToken } from "@/lib/token";

export function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = React.useState(false);

  async function logout() {
    setLoading(true);
    try {
      removeToken();
    } finally {
      setLoading(false);
      window.location.href = "/login";
    }
  }

  return (
    <Button className={className} variant="outline" onClick={logout} disabled={loading}>
      {loading ? "Signing out..." : "Logout"}
    </Button>
  );
}


