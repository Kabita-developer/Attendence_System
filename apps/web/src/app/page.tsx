import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-background to-accent/40">
      <div className="container py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Attendance & Salary</div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                Premium attendance tracking with automatic slot-based salary
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Employees mark attendance once per day. Salary is computed automatically based on
                completed slots at attendance time, with late/pending approval workflow.
              </p>
            </div>
            <div className="hidden gap-2 md:flex">
              <Button asChild variant="outline">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Get started</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Facebook-style login</CardTitle>
                <CardDescription>Persistent secure cookie token (no repeat password).</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                After first login, you’ll be auto-logged-in using a server-stored token.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Slot-based salary</CardTitle>
                <CardDescription>System auto-calculates; employee never selects slots.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Mark time decides how many slots are completed and how much salary is earned.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Calendar + reports</CardTitle>
                <CardDescription>Monthly view with exports (PDF/Excel).</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Admin can review, approve pending entries, edit dates, and export reports.
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 flex gap-2 md:hidden">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}


