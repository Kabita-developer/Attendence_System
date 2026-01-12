import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { APP_TZ } from "../config/time.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { AttendanceModel } from "../models/Attendance.js";
import { UserModel } from "../models/User.js";

export const router = Router();

function monthSalaryRows(opts: {
  month: string;
  employees: any[];
  attendance: any[];
}) {
  const byUser: Record<string, { total: number; approvedSlots: number; pendingSlots: number; rejectedSlots: number }> = {};
  for (const e of opts.employees) {
    byUser[String(e._id)] = { total: 0, approvedSlots: 0, pendingSlots: 0, rejectedSlots: 0 };
  }
  for (const a of opts.attendance) {
    const key = String(a.userId);
    if (!byUser[key]) continue;
    if (a.status === "APPROVED") {
      byUser[key].approvedSlots += 1;
      byUser[key].total += a.slotSalary ?? 0;
    } else if (a.status === "PENDING") byUser[key].pendingSlots += 1;
    else if (a.status === "REJECTED") byUser[key].rejectedSlots += 1;
  }

  return opts.employees.map((e) => ({
    Month: opts.month,
    EmployeeId: e.employeeId ?? "",
    Name: e.name ?? "",
    ApprovedSlots: byUser[String(e._id)].approvedSlots,
    PendingSlots: byUser[String(e._id)].pendingSlots,
    RejectedSlots: byUser[String(e._id)].rejectedSlots,
    TotalSalary: byUser[String(e._id)].total
  }));
}

router.get(
  "/daily",
  asyncHandler(async (req, res) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const day = DateTime.fromISO(q.date, { zone: APP_TZ }).startOf("day");

    // Optimized: use index on role+isActive, select only needed fields
    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true })
      .select("_id employeeId name")
      .sort({ employeeId: 1 })
      .lean();
    
    // Optimized: use index on attendanceDate, select only needed fields
    const attendance = await AttendanceModel.find({ attendanceDate: day.toJSDate() })
      .select("userId status slotSalary slotId")
      .populate("slotId", "name")
      .lean();
    
    // Group by user and calculate daily totals
    const byUser = new Map<string, { slots: typeof attendance; dailySalary: number }>();
    for (const a of attendance) {
      const key = String(a.userId);
      if (!byUser.has(key)) {
        byUser.set(key, { slots: [], dailySalary: 0 });
      }
      const userData = byUser.get(key)!;
      userData.slots.push(a);
      if (a.status === "APPROVED") {
        userData.dailySalary += a.slotSalary ?? 0;
      }
    }

    const rows = employees.map((e) => {
      const userData = byUser.get(String(e._id));
      const slots = userData?.slots ?? [];
      const hasAnyAttendance = slots.length > 0;
      const status = hasAnyAttendance
        ? slots.every((s) => s.status === "APPROVED")
          ? "APPROVED"
          : slots.some((s) => s.status === "PENDING")
          ? "PENDING"
          : "REJECTED"
        : "ABSENT";
      
      return {
        employeeId: e.employeeId,
        name: e.name,
        status,
        slotsCount: slots.length,
        dailySalary: userData?.dailySalary ?? 0
      };
    });

    res.json({ ok: true, data: { date: q.date, rows } });
  })
);

router.get(
  "/daily.pdf",
  asyncHandler(async (req, res) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const day = DateTime.fromISO(q.date, { zone: APP_TZ }).startOf("day");

    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true }).sort({ employeeId: 1 }).lean();
    const attendance = await AttendanceModel.find({ attendanceDate: day.toJSDate() })
      .populate("slotId", "name")
      .lean();
    
    // Group by user and calculate daily totals
    const byUser = new Map<string, { slots: typeof attendance; dailySalary: number }>();
    for (const a of attendance) {
      const key = String(a.userId);
      if (!byUser.has(key)) {
        byUser.set(key, { slots: [], dailySalary: 0 });
      }
      const userData = byUser.get(key)!;
      userData.slots.push(a);
      if (a.status === "APPROVED") {
        userData.dailySalary += a.slotSalary ?? 0;
      }
    }

    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="daily-attendance-${q.date}.pdf"`);

    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);

    doc.fontSize(18).text("Daily Attendance Report", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555").text(`Date: ${q.date} (TZ: ${APP_TZ})`);
    doc.moveDown(1);

    doc.fillColor("#111").fontSize(10);
    doc.text("Employee ID", 36, doc.y, { continued: true, width: 100 });
    doc.text("Name", { continued: true, width: 200 });
    doc.text("Status", { continued: true, width: 90 });
    doc.text("Slots", { continued: true, width: 60 });
    doc.text("Salary", { width: 70 });

    doc.moveDown(0.3);
    doc.strokeColor("#ddd").moveTo(36, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    for (const e of employees) {
      const userData = byUser.get(String(e._id));
      const slots = userData?.slots ?? [];
      const hasAnyAttendance = slots.length > 0;
      const status = hasAnyAttendance
        ? slots.every((s) => s.status === "APPROVED")
          ? "APPROVED"
          : slots.some((s) => s.status === "PENDING")
          ? "PENDING"
          : "REJECTED"
        : "ABSENT";
      const salary = userData?.dailySalary ?? 0;

      doc.fillColor("#111").text(e.employeeId ?? "", 36, doc.y, { continued: true, width: 100 });
      doc.text(e.name ?? "", { continued: true, width: 200 });
      doc.text(status, { continued: true, width: 90 });
      doc.text(String(slots.length), { continued: true, width: 60 });
      doc.text(String(salary), { width: 70 });
    }

    doc.end();
  })
);

router.get(
  "/daily.xlsx",
  asyncHandler(async (req, res) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
    const day = DateTime.fromISO(q.date, { zone: APP_TZ }).startOf("day");

    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true }).sort({ employeeId: 1 }).lean();
    const attendance = await AttendanceModel.find({ attendanceDate: day.toJSDate() })
      .populate("slotId", "name")
      .lean();
    
    // Group by user and calculate daily totals
    const byUser = new Map<string, { slots: typeof attendance; dailySalary: number }>();
    for (const a of attendance) {
      const key = String(a.userId);
      if (!byUser.has(key)) {
        byUser.set(key, { slots: [], dailySalary: 0 });
      }
      const userData = byUser.get(key)!;
      userData.slots.push(a);
      if (a.status === "APPROVED") {
        userData.dailySalary += a.slotSalary ?? 0;
      }
    }

    const rows = employees.map((e) => {
      const userData = byUser.get(String(e._id));
      const slots = userData?.slots ?? [];
      const hasAnyAttendance = slots.length > 0;
      const status = hasAnyAttendance
        ? slots.every((s) => s.status === "APPROVED")
          ? "APPROVED"
          : slots.some((s) => s.status === "PENDING")
          ? "PENDING"
          : "REJECTED"
        : "ABSENT";
      
      return {
        Date: q.date,
        EmployeeId: e.employeeId,
        Name: e.name,
        Status: status,
        Slots: slots.length,
        DailySalary: userData?.dailySalary ?? 0
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Daily");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("content-disposition", `attachment; filename="daily-attendance-${q.date}.xlsx"`);
    res.send(buf);
  })
);

router.get(
  "/monthly-salary",
  asyncHandler(async (req, res) => {
    const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true }).sort({ employeeId: 1 }).lean();
    const attendance = await AttendanceModel.find({
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    }).lean();

    const byUser: Record<string, { total: number; approvedSlots: number; pendingSlots: number; rejectedSlots: number }> = {};
    for (const e of employees) {
      byUser[String(e._id)] = { total: 0, approvedSlots: 0, pendingSlots: 0, rejectedSlots: 0 };
    }
    for (const a of attendance) {
      const key = String(a.userId);
      if (!byUser[key]) continue;
      if (a.status === "APPROVED") {
        byUser[key].approvedSlots += 1;
        byUser[key].total += a.slotSalary ?? 0;
      } else if (a.status === "PENDING") byUser[key].pendingSlots += 1;
      else if (a.status === "REJECTED") byUser[key].rejectedSlots += 1;
    }

    const rows = employees.map((e) => ({
      employeeId: e.employeeId,
      name: e.name,
      approvedSlots: byUser[String(e._id)].approvedSlots,
      pendingSlots: byUser[String(e._id)].pendingSlots,
      rejectedSlots: byUser[String(e._id)].rejectedSlots,
      totalSalary: byUser[String(e._id)].total
    }));

    res.json({ ok: true, data: { month: q.month, rows } });
  })
);

router.get(
  "/monthly-salary.xlsx",
  asyncHandler(async (req, res) => {
    const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true }).sort({ employeeId: 1 }).lean();
    const attendance = await AttendanceModel.find({
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    }).lean();

    const rows = monthSalaryRows({ month: q.month, employees, attendance });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "MonthlySalary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("content-disposition", `attachment; filename="monthly-salary-${q.month}.xlsx"`);
    res.send(buf);
  })
);

router.get(
  "/monthly-salary.pdf",
  asyncHandler(async (req, res) => {
    const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const employees = await UserModel.find({ role: "EMPLOYEE", isActive: true }).sort({ employeeId: 1 }).lean();
    const attendance = await AttendanceModel.find({
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    }).lean();

    const rows = monthSalaryRows({ month: q.month, employees, attendance });

    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="monthly-salary-${q.month}.pdf"`);

    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);

    doc.fontSize(18).text("Monthly Salary Report", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555").text(`Month: ${q.month} (TZ: ${APP_TZ})`);
    doc.moveDown(1);

    doc.fillColor("#111").fontSize(10);
    doc.text("Employee ID", 36, doc.y, { continued: true, width: 90 });
    doc.text("Name", { continued: true, width: 190 });
    doc.text("Approved", { continued: true, width: 70 });
    doc.text("Pending", { continued: true, width: 60 });
    doc.text("Rejected", { continued: true, width: 60 });
    doc.text("Total", { width: 70 });

    doc.moveDown(0.3);
    doc.strokeColor("#ddd").moveTo(36, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    for (const r of rows) {
      doc.fillColor("#111").text(String(r.EmployeeId ?? ""), 36, doc.y, { continued: true, width: 90 });
      doc.text(String(r.Name ?? ""), { continued: true, width: 190 });
      doc.text(String(r.ApprovedSlots ?? 0), { continued: true, width: 70 });
      doc.text(String(r.PendingSlots ?? 0), { continued: true, width: 60 });
      doc.text(String(r.RejectedSlots ?? 0), { continued: true, width: 60 });
      doc.text(`₹${r.TotalSalary ?? 0}`, { width: 70 });
    }

    doc.end();
  })
);

router.get(
  "/employee-summary",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        employeeId: z.string().min(3)
      })
      .parse(req.query);

    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const user = (await UserModel.findOne({ role: "EMPLOYEE", employeeId: q.employeeId }).lean()) as any;
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const attendance = (await AttendanceModel.find({
      userId: user._id,
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    })
      .populate("slotId", "name")
      .sort({ attendanceDate: 1, "slotSnapshot.endMinutes": 1 })
      .lean()) as any[];

    // Group by date and calculate daily totals
    const byDate = new Map<string, { slots: typeof attendance; dailySalary: number }>();
    for (const a of attendance) {
      const dateKey = DateTime.fromJSDate(a.attendanceDate).setZone(APP_TZ).toISODate()!;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { slots: [], dailySalary: 0 });
      }
      const dayData = byDate.get(dateKey)!;
      dayData.slots.push(a);
      if (a.status === "APPROVED") {
        dayData.dailySalary += a.slotSalary ?? 0;
      }
    }

    const days: any[] = [];
    let cursor = start.startOf("day");
    while (cursor <= end) {
      const iso = cursor.toISODate()!;
      const dayData = byDate.get(iso);
      const slots = dayData?.slots ?? [];
      const hasAnyAttendance = slots.length > 0;
      const status = hasAnyAttendance
        ? slots.every((s) => s.status === "APPROVED")
          ? "APPROVED"
          : slots.some((s) => s.status === "PENDING")
          ? "PENDING"
          : "REJECTED"
        : "ABSENT";
      
      days.push({
        date: iso,
        status,
        slots: slots.map((s) => ({
          slotName: s.slotSnapshot.name,
          status: s.status,
          slotSalary: s.slotSalary,
          time: DateTime.fromJSDate(s.attendanceTime).setZone(APP_TZ).toFormat("HH:mm"),
          warningMessage: s.warningMessage ?? ""
        })),
        dailySalary: dayData?.dailySalary ?? 0
      });
      cursor = cursor.plus({ days: 1 });
    }

    const total = days.reduce((sum, d) => sum + d.dailySalary, 0);

    res.json({
      ok: true,
      data: {
        month: q.month,
        employee: { employeeId: user.employeeId, name: user.name },
        totalSalary: total,
        days
      }
    });
  })
);

router.get(
  "/employee-summary.xlsx",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        employeeId: z.string().min(3)
      })
      .parse(req.query);

    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const user = (await UserModel.findOne({ role: "EMPLOYEE", employeeId: q.employeeId }).lean()) as any;
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const attendance = (await AttendanceModel.find({
      userId: user._id,
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    })
      .populate("slotId", "name")
      .lean()) as any[];

    // Group by date and calculate daily totals
    const byDate = new Map<string, { slots: typeof attendance; dailySalary: number }>();
    for (const a of attendance) {
      const dateKey = DateTime.fromJSDate(a.attendanceDate).setZone(APP_TZ).toISODate()!;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { slots: [], dailySalary: 0 });
      }
      const dayData = byDate.get(dateKey)!;
      dayData.slots.push(a);
      if (a.status === "APPROVED") {
        dayData.dailySalary += a.slotSalary ?? 0;
      }
    }

    const rows: any[] = [];
    let cursor = start.startOf("day");
    while (cursor <= end) {
      const iso = cursor.toISODate()!;
      const dayData = byDate.get(iso);
      const slots = dayData?.slots ?? [];
      const hasAnyAttendance = slots.length > 0;
      const status = hasAnyAttendance
        ? slots.every((s) => s.status === "APPROVED")
          ? "APPROVED"
          : slots.some((s) => s.status === "PENDING")
          ? "PENDING"
          : "REJECTED"
        : "ABSENT";
      
      rows.push({
        Month: q.month,
        EmployeeId: user.employeeId,
        Name: user.name,
        Date: iso,
        Status: status,
        Slots: slots.length,
        DailySalary: dayData?.dailySalary ?? 0
      });
      cursor = cursor.plus({ days: 1 });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "EmployeeSummary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("content-disposition", `attachment; filename="employee-summary-${user.employeeId}-${q.month}.xlsx"`);
    res.send(buf);
  })
);

router.get(
  "/employee-summary.pdf",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        employeeId: z.string().min(3)
      })
      .parse(req.query);

    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const user = (await UserModel.findOne({ role: "EMPLOYEE", employeeId: q.employeeId }).lean()) as any;
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const attendance = await AttendanceModel.find({
      userId: user._id,
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    })
      .sort({ attendanceDate: 1 })
      .lean();

    const total = attendance.reduce((sum, a) => sum + (a.status === "APPROVED" ? (a.slotSalary ?? 0) : 0), 0);

    res.setHeader("content-type", "application/pdf");
    res.setHeader(
      "content-disposition",
      `attachment; filename="employee-summary-${user.employeeId}-${q.month}.pdf"`
    );

    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);

    doc.fontSize(18).text("Employee Summary", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555").text(`Employee: ${user.name} (${user.employeeId})`);
    doc.text(`Month: ${q.month} (TZ: ${APP_TZ})`);
    doc.moveDown(1);

    doc.fillColor("#111").fontSize(10);
    doc.text("Date", 36, doc.y, { continued: true, width: 100 });
    doc.text("Status", { continued: true, width: 100 });
    doc.text("Slots", { continued: true, width: 70 });
    doc.text("Amount", { width: 90 });
    doc.moveDown(0.3);
    doc.strokeColor("#ddd").moveTo(36, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    // Group by date for better display
    const byDate = new Map<string, typeof attendance>();
    for (const a of attendance) {
      const dateKey = DateTime.fromJSDate(a.attendanceDate).setZone(APP_TZ).toISODate()!;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(a);
    }

    for (const [date, slots] of byDate.entries()) {
      const dailySalary = slots.filter((s) => s.status === "APPROVED").reduce((sum, s) => sum + (s.slotSalary ?? 0), 0);
      doc.text(date, 36, doc.y, {
        continued: true,
        width: 100
      });
      const status = slots.every((s) => s.status === "APPROVED")
        ? "APPROVED"
        : slots.some((s) => s.status === "PENDING")
        ? "PENDING"
        : "REJECTED";
      doc.text(status, { continued: true, width: 100 });
      doc.text(String(slots.length), { continued: true, width: 70 });
      doc.text(String(dailySalary), { width: 90 });
    }

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#111").text(`Total (approved): ₹${total}`, { align: "right" });

    doc.end();
  })
);


