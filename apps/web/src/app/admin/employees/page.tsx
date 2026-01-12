"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
  mustChangePassword: boolean;
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [info, setInfo] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<{ message: string } | null>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Employee | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ employees: Employee[] }>("/admin/employees");
    setLoading(false);
    if (!res.ok) return setError(res.error.message);
    setEmployees(res.data.employees);
  }

  React.useEffect(() => {
    load().catch((e) => setError(e?.message ?? "Failed to load"));
  }, []);

  async function createEmployee() {
    setError(null);
    setInfo(null);
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      return setError("All fields are required");
    }
    const res = await apiFetch<{ employee: { employeeId: string } }>("/admin/employees", {
      method: "POST",
      json: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim()
      }
    });
    if (!res.ok) return setError(res.error.message);
    setToast({ message: `Employee ${res.data.employee.employeeId} created successfully.` });
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    await load();
  }

  async function updateEmployee(emp: Employee, updates: { name?: string; email?: string; phone?: string; password?: string; isActive?: boolean }) {
    setError(null);
    setInfo(null);
    const res = await apiFetch<{ employee: { employeeId: string } }>(`/admin/employees/${emp.id}/update`, {
      method: "POST",
      json: updates
    });
    if (!res.ok) return setError(res.error.message);
    setToast({ message: `Employee ${emp.employeeId} updated successfully.` });
    setEditingEmployee(null);
    await load();
  }

  async function deleteEmployee(emp: Employee) {
    setDeleting(true);
    setError(null);
    setInfo(null);
    const res = await apiFetch<{ deleted: boolean }>(`/admin/employees/${emp.id}/delete`, {
      method: "POST"
    });
    setDeleting(false);
    if (!res.ok) {
      setConfirmDelete(null);
      return setError(res.error.message);
    }
    setToast({ message: `Employee ${emp.employeeId} deleted successfully.` });
    setConfirmDelete(null);
    await load();
  }

  return (
    <AppShell
      role="ADMIN"
      title="Employees"
      subtitle="Create employee accounts, generate OTP, and reset passwords."
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/slots", label: "Slots" },
        { href: "/admin/attendance", label: "Attendance" },
        { href: "/admin/reports", label: "Reports" }
      ]}
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed right-6 top-6 z-50 w-[min(420px,calc(100vw-3rem))]"
          >
            <div className="relative overflow-hidden rounded-xl border border-emerald-400/25 bg-background/70 p-4 shadow-2xl backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent" />
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">Success</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{toast.message}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-destructive/25 bg-background p-6 shadow-2xl"
            >
              <h3 className="mb-2 text-lg font-semibold">Delete Employee</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{confirmDelete.employeeId}</strong> ({confirmDelete.name})? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteEmployee(confirmDelete)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mb-4 text-sm text-muted-foreground">{info}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create employee</CardTitle>
            <CardDescription>
              Employee ID is auto-generated. All fields are required. Password is stored in plain text.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Employee name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email *</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone *</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password *</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type="password"
                required
              />
            </div>
            <Button className="w-full" onClick={createEmployee} disabled={!name.trim() || !email.trim() || !phone.trim() || !password.trim()}>
              Create employee
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employee list</CardTitle>
            <CardDescription>View and manage employee accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Employee ID</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Password</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map((e) => {
                    const isEditing = editingEmployee?.id === e.id;
                    return (
                      <tr key={e.id}>
                        <td className="px-3 py-2 font-medium">{e.employeeId}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              className="h-8 w-full rounded-md border bg-background/60 px-2 text-sm"
                              defaultValue={e.name}
                              onBlur={(ev) => {
                                if (ev.target.value !== e.name) {
                                  updateEmployee(e, { name: ev.target.value });
                                }
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") {
                                  ev.currentTarget.blur();
                                }
                              }}
                            />
                          ) : (
                            e.name
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isEditing ? (
                            <input
                              className="h-8 w-full rounded-md border bg-background/60 px-2 text-sm"
                              type="email"
                              defaultValue={e.email}
                              onBlur={(ev) => {
                                if (ev.target.value !== e.email) {
                                  updateEmployee(e, { email: ev.target.value });
                                }
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") {
                                  ev.currentTarget.blur();
                                }
                              }}
                            />
                          ) : (
                            e.email || "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isEditing ? (
                            <input
                              className="h-8 w-full rounded-md border bg-background/60 px-2 text-sm"
                              defaultValue={e.phone}
                              onBlur={(ev) => {
                                if (ev.target.value !== e.phone) {
                                  updateEmployee(e, { phone: ev.target.value });
                                }
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") {
                                  ev.currentTarget.blur();
                                }
                              }}
                            />
                          ) : (
                            e.phone || "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                          {isEditing ? (
                            <input
                              className="h-8 w-full rounded-md border bg-background/60 px-2 text-sm font-mono"
                              type="password"
                              defaultValue={e.password}
                              onBlur={(ev) => {
                                if (ev.target.value !== e.password) {
                                  updateEmployee(e, { password: ev.target.value });
                                }
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") {
                                  ev.currentTarget.blur();
                                }
                              }}
                            />
                          ) : (
                            e.password || "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {isEditing ? (
                            <select
                              className="h-8 rounded-md border bg-background/60 px-2 text-sm"
                              defaultValue={e.isActive ? "true" : "false"}
                              onChange={(ev) => {
                                updateEmployee(e, { isActive: ev.target.value === "true" });
                              }}
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          ) : (
                            <>
                              {e.isActive ? "Active" : "Inactive"}
                              {e.mustChangePassword ? " • Must change password" : ""}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingEmployee(null)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setEditingEmployee(e)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmDelete(e)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
            {!loading && employees.length === 0 ? (
              <div className="text-sm text-muted-foreground">No employees found.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


