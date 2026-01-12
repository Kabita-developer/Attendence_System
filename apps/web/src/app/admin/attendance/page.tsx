"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { AttendanceCalendar } from "@/components/attendance-calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Employee = { id: string; employeeId: string; name: string };
type AttendanceRow = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time: string; // ISO
  status: "APPROVED" | "PENDING" | "REJECTED";
  proposedSalary: number;
  approvedSalary: number;
  lateByMinutes: number;
  warningMessage: string;
};

function toLocalDatetimeValue(iso: string) {
  // datetime-local wants "YYYY-MM-DDTHH:mm"
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAttendancePage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = React.useState<string>("");
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");
  const [attendanceTime, setAttendanceTime] = React.useState<string>("");
  const [adminNote, setAdminNote] = React.useState<string>("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const byDateStatus = React.useMemo(() => {
    const map: Record<string, "APPROVED" | "PENDING" | "REJECTED"> = {};
    for (const r of rows) map[r.date] = r.status;
    return map;
  }, [rows]);

  const rowByDate = React.useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    for (const r of rows) map.set(r.date, r);
    return map;
  }, [rows]);

  async function loadEmployees() {
    const res = await apiFetch<{ employees: Employee[] }>("/admin/employees");
    if (!res.ok) throw new Error(res.error.message);
    setEmployees(
      res.data.employees.map((e) => ({ id: e.id, employeeId: e.employeeId, name: e.name }))
    );
    if (!employeeId && res.data.employees.length > 0) setEmployeeId(res.data.employees[0].employeeId);
  }

  async function loadAttendance() {
    if (!employeeId) return;
    const res = await apiFetch<{ attendance: AttendanceRow[] }>(
      `/admin/attendance?month=${month}&employeeId=${encodeURIComponent(employeeId)}`
    );
    if (!res.ok) throw new Error(res.error.message);
    setRows(res.data.attendance);
  }

  async function bootstrap() {
    setLoading(true);
    setError(null);
    setInfo(null);
    await loadEmployees();
    setLoading(false);
  }

  React.useEffect(() => {
    bootstrap().catch((e) => setError(e?.message ?? "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!employeeId) return;
    loadAttendance().catch((e) => setError(e?.message ?? "Failed to load attendance"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month]);

  function onDayClick(dateISO: string) {
    setInfo(null);
    setError(null);
    setSelectedDate(dateISO);
    const existing = rowByDate.get(dateISO);
    if (existing) {
      setStatus(existing.status);
      setAttendanceTime(toLocalDatetimeValue(existing.time));
      setAdminNote("");
    } else {
      setStatus("REJECTED");
      setAttendanceTime(`${dateISO}T12:00`);
      setAdminNote("");
    }
  }

  async function save() {
    if (!selectedDate) return;
    setError(null);
    setInfo(null);

    const iso = new Date(attendanceTime).toISOString();
    const res = await apiFetch<{ id: string }>("/admin/attendance/upsert", {
      method: "POST",
      json: {
        employeeId,
        dateISO: selectedDate,
        attendanceTimeISO: iso,
        status,
        adminNote: adminNote || undefined
      }
    });
    if (!res.ok) return setError(res.error.message);
    setInfo("Saved.");
    await loadAttendance();
  }

  async function clearDay() {
    if (!selectedDate) return;
    setError(null);
    setInfo(null);
    const res = await apiFetch("/admin/attendance/clear", {
      method: "POST",
      json: { employeeId, dateISO: selectedDate }
    });
    if (!res.ok) return setError(res.error.message);
    setInfo("Cleared. Day will show as ABSENT (red).");
    await loadAttendance();
  }

  const selectedRow = selectedDate ? rowByDate.get(selectedDate) : undefined;

  return (
    <AppShell
      role="ADMIN"
      title="Attendance editor"
      subtitle="Click a day to edit status/time. Clear removes the record (shows as Absent)."
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/slots", label: "Slots" },
        { href: "/admin/attendance", label: "Attendance" },
        { href: "/admin/reports", label: "Reports" }
      ]}
      actions={
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border bg-background/60 px-3 text-sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.employeeId}>
                {e.employeeId} — {e.name}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-md border bg-background/60 px-3 text-sm"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      }
    >
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted-foreground">Loading...</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceCalendar month={month} byDateStatus={byDateStatus} onDayClick={onDayClick} />
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{selectedDate ? `Edit ${selectedDate}` : "Select a day"}</CardTitle>
            <CardDescription>
              {selectedDate
                ? selectedRow
                  ? `Existing: ${selectedRow.status} • approved ₹${selectedRow.approvedSalary}`
                  : "No record: day is Absent by default"
                : "Click a date on the calendar to edit attendance."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                disabled={!selectedDate}
              >
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Attendance time</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                type="datetime-local"
                value={attendanceTime}
                onChange={(e) => setAttendanceTime(e.target.value)}
                disabled={!selectedDate}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Admin note (optional)</label>
              <textarea
                className="min-h-24 w-full rounded-md border bg-background/60 px-3 py-2 text-sm"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                disabled={!selectedDate}
                maxLength={500}
                placeholder="Reason / note..."
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={save} disabled={!selectedDate}>
                Save
              </Button>
              <Button className="flex-1" variant="outline" onClick={clearDay} disabled={!selectedDate}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


