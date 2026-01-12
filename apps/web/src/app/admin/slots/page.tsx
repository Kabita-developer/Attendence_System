"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Slot = {
  id: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  salary: number;
  isActive: boolean;
  sortOrder: number;
};

function mmToTime(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMm(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function AdminSlotsPage() {
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<{ message: string } | null>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [confirmDelete, setConfirmDelete] = React.useState<{ slot: Slot } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [slotName, setSlotName] = React.useState("");
  const [slotStart, setSlotStart] = React.useState("10:00");
  const [slotEnd, setSlotEnd] = React.useState("12:00");
  const [slotSalary, setSlotSalary] = React.useState(200);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<{ slots: Slot[] }>("/admin/slots");
    setLoading(false);
    if (!res.ok) return setError(res.error.message);
    setSlots(res.data.slots);
  }

  React.useEffect(() => {
    load().catch((e) => setError(e?.message ?? "Failed to load"));
  }, []);

  async function addSlot() {
    setError(null);
    setInfo(null);
    const res = await apiFetch("/admin/slots", {
      method: "POST",
      json: {
        name: slotName,
        startMinutes: timeToMm(slotStart),
        endMinutes: timeToMm(slotEnd),
        salary: slotSalary,
        sortOrder: slots.length + 1,
        isActive: true
      }
    });
    if (!res.ok) return setError(res.error.message);
    setInfo("Slot created.");
    setToast({ message: "Slot created successfully" });
    setSlotName("");
    await load();
  }

  async function saveSlot(s: Slot) {
    setError(null);
    setInfo(null);
    const res = await apiFetch(`/admin/slots/${s.id}/update`, {
      method: "POST",
      json: {
        name: s.name,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        salary: s.salary,
        sortOrder: s.sortOrder,
        isActive: s.isActive
      }
    });
    if (!res.ok) return setError(res.error.message);
    setInfo("Slot updated.");
    setToast({ message: "Slot updated successfully" });
    await load();
  }

  async function deleteSlot(s: Slot) {
    setError(null);
    setInfo(null);
    setDeleting(true);
    try {
      const res = await apiFetch<{ deleted: boolean }>(`/admin/slots/${s.id}/delete`, {
        method: "POST"
      });
      if (!res.ok) return setError(res.error.message);
      setInfo("Slot deleted.");
      setToast({ message: "Slot deleted successfully" });
      await load();
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  return (
    <AppShell
      role="ADMIN"
      title="Slot management"
      subtitle="Define daily slots and salary per slot. Employees never select slots manually."
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
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-md overflow-hidden rounded-2xl border bg-background/90 shadow-2xl backdrop-blur"
            >
              <div className="p-5">
                <div className="text-sm font-semibold">Delete slot?</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-medium text-foreground">{confirmDelete.slot.name}</span>? This action can’t be
                  undone.
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteSlot(confirmDelete.slot)}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </Button>
                </div>
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
            <CardTitle>Create slot</CardTitle>
            <CardDescription>Slots cannot overlap if active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                value={slotName}
                onChange={(e) => setSlotName(e.target.value)}
                placeholder="Morning (10:00–12:00)"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start</label>
                <input
                  className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End</label>
                <input
                  className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Salary</label>
              <input
                className="h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                type="number"
                min={0}
                value={slotSalary}
                onChange={(e) => setSlotSalary(Number(e.target.value))}
              />
            </div>
            <Button className="w-full" onClick={addSlot} disabled={!slotName.trim()}>
              Create slot
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Existing slots</CardTitle>
            <CardDescription>Edit time, salary, and activation. Grace period is fixed at 5 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
            <div className="space-y-2">
              {slots.map((s, idx) => (
                <div key={s.id} className="rounded-md border bg-background/40 p-3">
                  <div className="grid gap-2 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-4">
                      <label className="text-xs text-muted-foreground">Name</label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                        value={s.name}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, name: e.target.value };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                        type="time"
                        value={mmToTime(s.startMinutes)}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, startMinutes: timeToMm(e.target.value) };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">End</label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                        type="time"
                        value={mmToTime(s.endMinutes)}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, endMinutes: timeToMm(e.target.value) };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Salary</label>
                      <input
                        className="mt-1 h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                        type="number"
                        min={0}
                        value={s.salary}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, salary: Number(e.target.value) };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Active</label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border bg-background/60 px-3 text-sm"
                        value={s.isActive ? "yes" : "no"}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, isActive: e.target.value === "yes" };
                          setSlots(next);
                        }}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Sort order:{" "}
                      <input
                        className="h-8 w-20 rounded-md border bg-background/60 px-2 text-sm"
                        type="number"
                        value={s.sortOrder}
                        onChange={(e) => {
                          const next = [...slots];
                          next[idx] = { ...s, sortOrder: Number(e.target.value) };
                          setSlots(next);
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete({ slot: s })}>
                        Delete
                      </Button>
                      <Button size="sm" onClick={() => saveSlot(s)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {slots.length === 0 ? (
                <div className="rounded-md border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  No slots yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


