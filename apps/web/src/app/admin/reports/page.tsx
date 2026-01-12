"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { downloadFromApi } from "@/lib/download";

type Employee = { id: string; employeeId: string; name: string };
type MonthlyRow = {
  employeeId: string;
  name: string;
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
  totalSalary: number;
};

export default function AdminReportsPage() {
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = React.useState<string>("");

  const [rows, setRows] = React.useState<MonthlyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function bootstrap() {
    setLoading(true);
    setError(null);

    const e = await apiFetch<{ employees: Employee[] }>("/admin/employees");
    if (!e.ok) throw new Error(e.error.message);
    setEmployees(e.data.employees.map((x) => ({ id: x.id, employeeId: x.employeeId, name: x.name })));
    if (!employeeId && e.data.employees.length > 0) setEmployeeId(e.data.employees[0].employeeId);
    setLoading(false);
  }

  async function loadMonthly() {
    const res = await apiFetch<{ rows: MonthlyRow[] }>(`/admin/reports/monthly-salary?month=${month}`);
    if (!res.ok) throw new Error(res.error.message);
    setRows(res.data.rows);
  }

  React.useEffect(() => {
    bootstrap().catch((e) => setError(e?.message ?? "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    loadMonthly().catch((e) => setError(e?.message ?? "Failed to load monthly report"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function exportDailyPdf() {
    await downloadFromApi(`/admin/reports/daily.pdf?date=${date}`, `daily-attendance-${date}.pdf`);
  }
  async function exportDailyXlsx() {
    await downloadFromApi(`/admin/reports/daily.xlsx?date=${date}`, `daily-attendance-${date}.xlsx`);
  }
  async function exportMonthlyPdf() {
    await downloadFromApi(`/admin/reports/monthly-salary.pdf?month=${month}`, `monthly-salary-${month}.pdf`);
  }
  async function exportMonthlyXlsx() {
    await downloadFromApi(`/admin/reports/monthly-salary.xlsx?month=${month}`, `monthly-salary-${month}.xlsx`);
  }
  async function exportEmployeePdf() {
    if (!employeeId) return;
    await downloadFromApi(
      `/admin/reports/employee-summary.pdf?month=${month}&employeeId=${encodeURIComponent(employeeId)}`,
      `employee-summary-${employeeId}-${month}.pdf`
    );
  }
  async function exportEmployeeXlsx() {
    if (!employeeId) return;
    await downloadFromApi(
      `/admin/reports/employee-summary.xlsx?month=${month}&employeeId=${encodeURIComponent(employeeId)}`,
      `employee-summary-${employeeId}-${month}.xlsx`
    );
  }

  return (
    <AppShell
      role="ADMIN"
      title="Reports"
      subtitle="Daily attendance, monthly salary totals, and employee-wise summaries. Export to PDF/Excel."
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/slots", label: "Slots" },
        { href: "/admin/attendance", label: "Attendance" },
        { href: "/admin/reports", label: "Reports" }
      ]}
    >
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Daily report</CardTitle>
            <CardDescription>Includes ABSENT for employees without a record on the day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={exportDailyXlsx}>
                Excel
              </Button>
              <Button className="flex-1" onClick={exportDailyPdf}>
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Monthly salary</CardTitle>
            <CardDescription>Totals are computed from APPROVED attendance only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Month</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={exportMonthlyXlsx}>
                Excel
              </Button>
              <Button className="flex-1" onClick={exportMonthlyPdf}>
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Employee summary</CardTitle>
            <CardDescription>Detailed sheet for a single employee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Employee</label>
              <select
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.employeeId}>
                    {e.employeeId} — {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={exportEmployeeXlsx} disabled={!employeeId}>
                Excel
              </Button>
              <Button className="flex-1" onClick={exportEmployeePdf} disabled={!employeeId}>
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Monthly salary preview</CardTitle>
            <CardDescription>{month}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Employee ID</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Approved</th>
                    <th className="px-3 py-2 font-medium">Pending</th>
                    <th className="px-3 py-2 font-medium">Rejected</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-3 py-2 font-medium">{r.employeeId}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.approvedDays}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.pendingDays}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.rejectedDays}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{r.totalSalary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


