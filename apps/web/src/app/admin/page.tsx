"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { downloadFromApi } from "@/lib/download";

type Slot = { id: string; name: string; startMinutes: number; endMinutes: number; salary: number; isActive?: boolean; sortOrder?: number };
type AttendanceSlot = {
  id: string;
  slotId: string;
  slotName: string;
  time: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "ABSENT";
  slotSalary: number;
  lateByMinutes: number;
  warningMessage: string;
  adminNote?: string;
};
type AttendanceDay = {
  date: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  slots: AttendanceSlot[];
  dailySalary: number;
};
type PendingRow = {
  id: string;
  slotId: string;
  slotName: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  time: string;
  status: "PENDING";
  slotSalary: number;
  lateByMinutes: number;
  warningMessage: string;
};

function mmToTime(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function AdminPage() {
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [pending, setPending] = React.useState<PendingRow[]>([]);

  const [newEmpName, setNewEmpName] = React.useState("");
  const [newEmpEmail, setNewEmpEmail] = React.useState("");
  const [createEmpInfo, setCreateEmpInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [slotName, setSlotName] = React.useState("");
  const [slotStart, setSlotStart] = React.useState("10:00");
  const [slotEnd, setSlotEnd] = React.useState("12:00");
  const [slotSalary, setSlotSalary] = React.useState(200);

  async function bootstrap() {
    setError(null);
    const s = await apiFetch<{ slots: Slot[] }>("/admin/slots");
    if (!s.ok) return setError(s.error.message);
    setSlots(s.data.slots);

    const a = await apiFetch<{ attendance: AttendanceDay[] }>(`/admin/attendance?month=${month}`);
    if (!a.ok) return setError(a.error.message);
    // Flatten slot-wise attendance to show pending slots
    const pendingSlots: PendingRow[] = [];
    for (const day of a.data.attendance) {
      for (const slot of day.slots) {
        if (slot.status === "PENDING") {
          pendingSlots.push({
            id: slot.id,
            slotId: slot.slotId,
            slotName: slot.slotName,
            userId: day.userId,
            employeeId: day.employeeId,
            employeeName: day.employeeName,
            date: day.date,
            time: slot.time,
            status: "PENDING",
            slotSalary: slot.slotSalary,
            lateByMinutes: slot.lateByMinutes,
            warningMessage: slot.warningMessage
          });
        }
      }
    }
    setPending(pendingSlots);
  }

  React.useEffect(() => {
    bootstrap().catch((e) => setError(e?.message ?? "Failed to load admin data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function createEmployee() {
    setError(null);
    setCreateEmpInfo(null);
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      return setError("Name and email are required. Note: All fields (name, email, phone, password) are required for employee creation.");
    }
    const res = await apiFetch<{ employee: any }>("/admin/employees", {
      method: "POST",
      json: { name: newEmpName.trim(), email: newEmpEmail.trim(), phone: "+0000000000", password: "TempPass123" }
    });
    if (!res.ok) return setError(res.error.message);
    setCreateEmpInfo(`Created ${res.data.employee.employeeId}`);
    setNewEmpName("");
    setNewEmpEmail("");
  }

  async function addSlot() {
    setError(null);
    const [sh, sm] = slotStart.split(":").map(Number);
    const [eh, em] = slotEnd.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    const res = await apiFetch("/admin/slots", {
      method: "POST",
      json: { name: slotName, startMinutes, endMinutes, salary: slotSalary, sortOrder: slots.length + 1, isActive: true }
    });
    if (!res.ok) return setError(res.error.message);
    setSlotName("");
    await bootstrap();
  }

  async function approveAttendance(id: string) {
    setError(null);
    const res = await apiFetch(`/admin/attendance/${id}/approve`, { method: "POST", json: {} });
    if (!res.ok) return setError(res.error.message);
    await bootstrap();
  }

  async function rejectAttendance(id: string) {
    setError(null);
    const res = await apiFetch(`/admin/attendance/${id}/reject`, { method: "POST", json: {} });
    if (!res.ok) return setError(res.error.message);
    await bootstrap();
  }

  async function exportDailyPdf() {
    const date = new Date().toISOString().slice(0, 10);
    await downloadFromApi(`/admin/reports/daily.pdf?date=${date}`, `daily-attendance-${date}.pdf`);
  }
  async function exportDailyXlsx() {
    const date = new Date().toISOString().slice(0, 10);
    await downloadFromApi(`/admin/reports/daily.xlsx?date=${date}`, `daily-attendance-${date}.xlsx`);
  }

  return (
    <AppShell
      role="ADMIN"
      title="Admin Dashboard"
      subtitle="Manage employees, slots, pending approvals, and export reports."
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/slots", label: "Slots" },
        { href: "/admin/attendance", label: "Attendance" },
        { href: "/admin/reports", label: "Reports" }
      ]}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/reports">Open reports</Link>
          </Button>
          <Button variant="outline" onClick={exportDailyXlsx}>
            Daily Excel
          </Button>
        </div>
      }
    >
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {createEmpInfo ? <p className="mb-4 text-sm text-muted-foreground">{createEmpInfo}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick create employee</CardTitle>
            <CardDescription>Auto-generates Employee ID + one-time password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                placeholder="Employee name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email (optional)</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <Button className="w-full" onClick={createEmployee} disabled={!newEmpName.trim()}>
              Create employee
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <CardDescription>Late marks become PENDING after slot end + 5 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Month</div>
              <input
                className="h-9 rounded-md border bg-background/60 px-3 text-sm"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            {pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-md border bg-background/40 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    {p.employeeName} ({p.employeeId}) • {p.date} • Slot: {p.slotName}
                  </div>
                  <div className="text-muted-foreground">
                    Late by {p.lateByMinutes}m • Slot salary: ₹{p.slotSalary} • {p.warningMessage}
                  </div>
                  <div className="text-muted-foreground">Attendance time: {new Date(p.time).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => rejectAttendance(p.id)}>
                    Reject
                  </Button>
                  <Button onClick={() => approveAttendance(p.id)}>Approve</Button>
                </div>
              </div>
            ))}
            {pending.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No pending items for this month.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Slot snapshot</CardTitle>
            <CardDescription>
              View and edit slots in{" "}
              <Link className="underline" href="/admin/slots">
                Slot management
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y rounded-md border p-0">
            {slots.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-muted-foreground">
                    {mmToTime(s.startMinutes)}–{mmToTime(s.endMinutes)} • ₹{s.salary}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{s.isActive ? "Active" : "Inactive"}</div>
              </div>
            ))}
            {slots.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No slots yet.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


