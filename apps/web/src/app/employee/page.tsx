"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, AlertCircle, Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceCalendar } from "@/components/attendance-calendar";
import { apiFetch } from "@/lib/api";
import { downloadFromApi } from "@/lib/download";

type Slot = { id: string; name: string; startMinutes: number; endMinutes: number; salary: number; isActive?: boolean };
type AttendanceSlot = {
  id: string;
  slotId: string;
  slotName: string;
  time: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "ABSENT";
  slotSalary: number;
  lateByMinutes: number;
  warningMessage: string;
};
type AttendanceDay = {
  date: string;
  slots: AttendanceSlot[];
  dailySalary: number;
};

function mmToTime(m: number) {
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function EmployeePage() {
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [attendanceDays, setAttendanceDays] = React.useState<AttendanceDay[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionInfo, setActionInfo] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<{ slot: Slot; slotId: string } | null>(null);
  const [marking, setMarking] = React.useState(false);
  const [successToast, setSuccessToast] = React.useState<{ message: string; slotName: string } | null>(null);

  React.useEffect(() => {
    if (!successToast) return;
    const t = window.setTimeout(() => setSuccessToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [successToast]);

  // Calculate overall day status for calendar (green if all slots approved, yellow if any pending, red if any rejected/absent)
  const byDateStatus = React.useMemo(() => {
    const map: Record<string, "APPROVED" | "PENDING" | "REJECTED"> = {};
    for (const day of attendanceDays) {
      const slotStatuses = day.slots.map((s) => s.status);
      if (slotStatuses.length === 0) {
        // No slots marked - check if it's a past date
        const today = new Date().toISOString().slice(0, 10);
        if (day.date <= today) map[day.date] = "REJECTED"; // ABSENT
      } else if (slotStatuses.every((s) => s === "APPROVED")) {
        map[day.date] = "APPROVED";
      } else if (slotStatuses.some((s) => s === "PENDING")) {
        map[day.date] = "PENDING";
      } else {
        map[day.date] = "REJECTED";
      }
    }
    return map;
  }, [attendanceDays]);

  const monthTotal = React.useMemo(
    () => attendanceDays.reduce((sum, day) => sum + day.dailySalary, 0),
    [attendanceDays]
  );

  const approvedSlotsCount = React.useMemo(
    () => attendanceDays.reduce((sum, day) => sum + day.slots.filter((s) => s.status === "APPROVED").length, 0),
    [attendanceDays]
  );

  const pendingSlotsCount = React.useMemo(
    () => attendanceDays.reduce((sum, day) => sum + day.slots.filter((s) => s.status === "PENDING").length, 0),
    [attendanceDays]
  );

  const rejectedSlotsCount = React.useMemo(
    () => attendanceDays.reduce((sum, day) => sum + day.slots.filter((s) => s.status === "REJECTED").length, 0),
    [attendanceDays]
  );

  async function load() {
    setLoading(true);
    setActionError(null);
    
    // Load slots - use public slots endpoint that employees can access
    const slotsRes = await apiFetch<{ slots: Slot[] }>("/slots");
    if (!slotsRes.ok) {
      setLoading(false);
      return setActionError(slotsRes.error.message);
    }
    // Filter to show only active slots
    setSlots(slotsRes.data.slots.filter((s) => s.isActive));

    // Load attendance
    const res = await apiFetch<{ attendance: AttendanceDay[] }>("/attendance/me?month=" + month);
    setLoading(false);
    if (!res.ok) return setActionError(res.error.message);
    setAttendanceDays(res.data.attendance);
  }

  React.useEffect(() => {
    load().catch((e) => setActionError(e?.message ?? "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function handleSlotSelect(slot: Slot) {
    setSelectedSlot({ slot, slotId: slot.id });
    setActionError(null);
    setActionInfo(null);
  }

  async function confirmMarkAttendance() {
    if (!selectedSlot) return;
    setMarking(true);
    setActionError(null);
    setActionInfo(null);
    
    const res = await apiFetch<{ attendance: any }>("/attendance/mark", {
      method: "POST",
      json: { slotId: selectedSlot.slotId }
    });
    
    setMarking(false);
    if (!res.ok) {
      setActionError(res.error.message);
      setSelectedSlot(null);
      return;
    }
    
    const message = res.data.attendance.warningMessage ||
      `Attendance marked for ${res.data.attendance.slotName}. Status: ${res.data.attendance.status}`;
    setActionInfo(message);
    setSuccessToast({ message, slotName: res.data.attendance.slotName });
    setSelectedSlot(null);
    await load();
  }

  async function downloadSlip() {
    setActionError(null);
    setActionInfo(null);
    try {
      await downloadFromApi(`/reports/me/salary-slip.pdf?month=${month}`, `salary-slip-${month}.pdf`);
    } catch (e: any) {
      setActionError(e?.message ?? "Download failed");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const todaySlots = React.useMemo(() => {
    const todayDay = attendanceDays.find((d) => d.date === today);
    if (!todayDay) return slots.map((s) => ({ slot: s, attendance: null }));
    return slots.map((s) => ({
      slot: s,
      attendance: todayDay.slots.find((a) => a.slotId === s.id) || null
    }));
  }, [slots, attendanceDays, today]);

  return (
    <AppShell
      role="EMPLOYEE"
      title="Employee Dashboard"
      subtitle="Mark attendance for each slot separately. Salary is calculated from APPROVED slots only."
      nav={[{ href: "/employee", label: "Dashboard" }]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSlip}>
            Salary slip (PDF)
          </Button>
        </div>
      }
    >
      {actionError ? <p className="mb-4 text-sm text-destructive">{actionError}</p> : null}
      {actionInfo ? <p className="mb-4 text-sm text-muted-foreground">{actionInfo}</p> : null}

      {/* Today's slots for marking attendance */}
      <Card className="mb-4 border-2">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Today's Available Slots</CardTitle>
          </div>
          <CardDescription className="text-base">
            Select a slot and mark your attendance. Each slot can be marked once per day.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading slots...</div>
          ) : todaySlots.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No slots available for today.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todaySlots.map(({ slot, attendance }, index) => {
                const slotEndTime = mmToTime(slot.endMinutes);
                const slotStartTime = mmToTime(slot.startMinutes);
                const canMark = !attendance && today === new Date().toISOString().slice(0, 10);
                const isSelected = selectedSlot?.slotId === slot.id;

                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg"
                        : attendance
                        ? "border-muted bg-background/60"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className="p-4">
                      {/* Slot Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{slot.name}</h3>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {slotStartTime} - {slotEndTime}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-full bg-primary/10 px-3 py-1">
                          <span className="text-sm font-semibold text-primary">₹{slot.salary}</span>
                        </div>
                      </div>

                      {/* Attendance Status or Action Button */}
                      {attendance ? (
                        <div className="space-y-2 rounded-md bg-muted/30 p-3">
                          <div className="flex items-center gap-2">
                            {attendance.status === "APPROVED" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : attendance.status === "PENDING" ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                attendance.status === "APPROVED"
                                  ? "text-green-600"
                                  : attendance.status === "PENDING"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {attendance.status}
                            </span>
                          </div>
                          {attendance.warningMessage && (
                            <p className="text-xs text-muted-foreground">{attendance.warningMessage}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Marked: {new Date(attendance.time).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!canMark || loading}
                          className="w-full font-medium"
                          variant={isSelected ? "default" : "default"}
                        >
                          {canMark ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Select & Mark (by {slotEndTime})
                            </>
                          ) : (
                            "Cannot mark"
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Month summary</CardTitle>
            <CardDescription>{month}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved salary</span>
              <span className="font-medium">₹{monthTotal}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved slots</span>
              <span className="font-medium">{approvedSlotsCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending slots</span>
              <span className="font-medium">{pendingSlotsCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rejected/Absent slots</span>
              <span className="font-medium">{rejectedSlotsCount}</span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Attendance calendar</div>
            <input
              className="h-9 rounded-md border bg-background/60 px-3 text-sm"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <AttendanceCalendar month={month} byDateStatus={byDateStatus} />
        </div>
      </div>

      {/* Slot Selection Confirmation Dialog */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !marking && setSelectedSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border-2 border-primary/20 bg-background p-6 shadow-2xl"
            >
              <div className="mb-6">
                <h3 className="mb-2 text-2xl font-bold text-foreground">Confirm Slot Selection</h3>
                <p className="text-sm text-muted-foreground">
                  Please review the slot details before marking your attendance
                </p>
              </div>

              {/* Slot Details Card */}
              <div className="mb-6 space-y-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <Calendar className="h-4 w-4" />
                    Slot Name
                  </span>
                  <span className="text-lg font-bold text-primary">{selectedSlot.slot.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <Clock className="h-4 w-4" />
                    Time Range
                  </span>
                  <span className="font-medium">
                    {mmToTime(selectedSlot.slot.startMinutes)} - {mmToTime(selectedSlot.slot.endMinutes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Salary</span>
                  <span className="rounded-full bg-primary px-3 py-1 text-lg font-bold text-primary-foreground">
                    ₹{selectedSlot.slot.salary}
                  </span>
                </div>
              </div>

              {/* Info Message */}
              <div className="mb-6 rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  <strong>Note:</strong> Your attendance status will be automatically determined based on the current
                  time. If you mark before the slot end time, it will be APPROVED. If within 5 minutes after, it will
                  be PENDING (requires admin approval).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSlot(null)}
                  disabled={marking}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={confirmMarkAttendance} disabled={marking} className="flex-1 font-semibold">
                  {marking ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                      />
                      Marking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm & Mark Attendance
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed left-1/2 top-4 z-50 w-full max-w-md"
          >
            <div className="mx-4 rounded-lg border-2 border-green-500/50 bg-gradient-to-r from-green-50 to-green-100 p-4 shadow-xl dark:from-green-950/50 dark:to-green-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Attendance Marked Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">{successToast.message}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}


