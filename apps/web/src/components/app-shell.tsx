"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SessionGuard } from "@/components/session-guard";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string };

export function AppShell({
  role,
  title,
  subtitle,
  nav,
  actions,
  children
}: {
  role: "ADMIN" | "EMPLOYEE";
  title: string;
  subtitle?: string;
  nav: NavItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-accent/40">
      <div className="container py-8">
        <SessionGuard role={role}>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Attendance & Salary</div>
              <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={cn(active ? "border border-border" : undefined)}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}

            <div className="ml-auto">{actions}</div>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {children}
          </motion.div>
        </SessionGuard>
      </div>
    </main>
  );
}


