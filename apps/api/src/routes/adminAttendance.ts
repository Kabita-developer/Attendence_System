import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { APP_TZ, startOfDayDate } from "../config/time.js";
import { AttendanceModel } from "../models/Attendance.js";
import { SalaryLogModel } from "../models/SalaryLog.js";
import { SlotModel } from "../models/Slot.js";
import { UserModel } from "../models/User.js";

export const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        employeeId: z.string().optional()
      })
      .parse(req.query);

    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    const match: any = {
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    };

    if (q.employeeId) {
      // Optimized: use index on employeeId, select only _id
      const user = await UserModel.findOne({ employeeId: q.employeeId })
        .select("_id")
        .lean();
      if (!user) {
        return res.json({ ok: true, data: { month: q.month, attendance: [] } });
      }
      match.userId = user._id;
    }

    // Get all slot-wise attendance records - optimized with select
    const rows = await AttendanceModel.find(match)
      .select("userId attendanceDate attendanceTime status slotSalary lateByMinutes warningMessage adminNote slotSnapshot slotId")
      .populate("userId", "employeeId name")
      .populate("slotId", "name startMinutes endMinutes salary")
      .sort({ attendanceDate: 1, "slotSnapshot.endMinutes": 1 })
      .lean();

    // Group by date and calculate daily totals
    const byDate = new Map<string, typeof rows>();
    for (const row of rows) {
      const dateKey = DateTime.fromJSDate(row.attendanceDate).setZone(APP_TZ).toISODate()!;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(row);
    }

    // Format response with slot-wise data and daily salary totals
    const attendance = Array.from(byDate.entries()).map(([date, records]) => {
      const approvedSalary = records
        .filter((r) => r.status === "APPROVED")
        .reduce((sum, r) => sum + r.slotSalary, 0);

      return {
        date,
        userId: String(records[0]!.userId),
        employeeId: (records[0]!.userId as any)?.employeeId || "",
        employeeName: (records[0]!.userId as any)?.name || "",
        slots: records.map((a) => ({
          id: String(a._id),
          slotId: String(a.slotId),
          slotName: a.slotSnapshot.name,
          time: DateTime.fromJSDate(a.attendanceTime).setZone(APP_TZ).toISO(),
          status: a.status,
          slotSalary: a.slotSalary,
          lateByMinutes: a.lateByMinutes,
          warningMessage: a.warningMessage,
          adminNote: a.adminNote
        })),
        dailySalary: approvedSalary // Sum of APPROVED slots only
      };
    });

    res.json({
      ok: true,
      data: {
        month: q.month,
        attendance
      }
    });
  })
);

router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        adminNote: z.string().max(500).optional()
      })
      .parse(req.body);

    const attendance = await AttendanceModel.findById(params.id);
    if (!attendance) return res.status(404).json({ ok: false, error: { message: "Attendance not found", status: 404 } });

    // Only PENDING slots can be approved - REJECTED slots cannot be approved
    if (attendance.status !== "PENDING") {
      return res.status(400).json({
        ok: false,
        error: {
          message: `Cannot approve attendance with status ${attendance.status}. Only PENDING slots can be approved.`,
          status: 400
        }
      });
    }

    // Approve the slot - set status to APPROVED and grant full slot salary
    attendance.status = "APPROVED";
    attendance.slotSalary = attendance.slotSnapshot.salary; // Grant full slot salary
    attendance.warningMessage = ""; // Clear warning message
    attendance.reviewedBy = req.auth!.userId as any;
    attendance.reviewedAt = new Date();
    attendance.adminNote = body.adminNote ?? attendance.adminNote ?? "";
    await attendance.save();

    // Create salary log entry
    await SalaryLogModel.create({
      userId: attendance.userId,
      attendanceId: attendance._id,
      attendanceDate: attendance.attendanceDate,
      slots: 1, // One slot
      amount: attendance.slotSalary,
      action: "ADMIN_APPROVED",
      createdBy: req.auth!.userId,
      createdAt: new Date()
    });

    res.json({ ok: true, data: { approved: true } });
  })
);

router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z.object({ adminNote: z.string().max(500).optional() }).parse(req.body);

    const attendance = await AttendanceModel.findById(params.id);
    if (!attendance) return res.status(404).json({ ok: false, error: { message: "Attendance not found", status: 404 } });

    // Only PENDING slots can be rejected (REJECTED slots are already rejected by system)
    if (attendance.status !== "PENDING") {
      return res.status(400).json({
        ok: false,
        error: {
          message: `Cannot reject attendance with status ${attendance.status}. Only PENDING slots can be rejected.`,
          status: 400
        }
      });
    }

    attendance.status = "REJECTED";
    attendance.slotSalary = 0; // Ensure salary is 0
    attendance.reviewedBy = req.auth!.userId as any;
    attendance.reviewedAt = new Date();
    attendance.adminNote = body.adminNote ?? attendance.adminNote ?? "";
    await attendance.save();

    res.json({ ok: true, data: { rejected: true } });
  })
);

router.post(
  "/upsert",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employeeId: z.string().min(3),
        dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slotId: z.string().min(1), // Required: which slot to upsert
        attendanceTimeISO: z.string().datetime().optional(),
        status: z.enum(["APPROVED", "PENDING", "REJECTED"]),
        adminNote: z.string().max(500).optional()
      })
      .parse(req.body);

    const user = await UserModel.findOne({ employeeId: body.employeeId, role: "EMPLOYEE" }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const slot = await SlotModel.findById(body.slotId).lean();
    if (!slot) return res.status(404).json({ ok: false, error: { message: "Slot not found", status: 404 } });

    const day = DateTime.fromISO(body.dateISO, { zone: APP_TZ }).startOf("day");
    const dt = body.attendanceTimeISO
      ? DateTime.fromISO(body.attendanceTimeISO, { zone: APP_TZ })
      : day.plus({ hours: 12 }); // default noon if not provided

    const attendanceDate = day.toJSDate();

    // Create slot snapshot
    const slotSnapshot = {
      slotId: String(slot._id),
      name: slot.name,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      salary: slot.salary
    };

    // Calculate slot salary based on status
    const slotSalary = body.status === "APPROVED" ? slot.salary : 0;

    const updated = await AttendanceModel.findOneAndUpdate(
      { userId: user._id, attendanceDate, slotId: body.slotId },
      {
        $set: {
          attendanceTime: dt.toJSDate(),
          status: body.status,
          slotSalary,
          slotSnapshot,
          reviewedBy: req.auth!.userId,
          reviewedAt: new Date(),
          adminNote: body.adminNote ?? ""
        },
        $setOnInsert: { userId: user._id, attendanceDate, slotId: body.slotId }
      },
      { upsert: true, new: true }
    );

    // Delete existing salary log for this attendance if any
    await SalaryLogModel.deleteMany({ attendanceId: updated._id }).catch(() => undefined);

    // Create salary log only if APPROVED
    if (body.status === "APPROVED") {
      await SalaryLogModel.create({
        userId: user._id,
        attendanceId: updated._id,
        attendanceDate,
        slots: 1, // One slot
        amount: slotSalary,
        action: "ADMIN_MODIFIED",
        createdBy: req.auth!.userId,
        createdAt: new Date()
      });
    }

    res.json({ ok: true, data: { id: String(updated._id) } });
  })
);

router.post(
  "/clear",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employeeId: z.string().min(3),
        dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slotId: z.string().optional() // Optional: if provided, clear only this slot; otherwise clear all slots for the date
      })
      .parse(req.body);

    const user = await UserModel.findOne({ employeeId: body.employeeId, role: "EMPLOYEE" }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const day = DateTime.fromISO(body.dateISO, { zone: APP_TZ });
    const attendanceDate = startOfDayDate(day);

    const match: any = { userId: user._id, attendanceDate };
    if (body.slotId) {
      match.slotId = body.slotId;
    }

    const attendances = await AttendanceModel.find(match).lean();
    if (attendances.length === 0) return res.json({ ok: true, data: { cleared: true } });

    const attendanceIds = attendances.map((a) => a._id);
    await SalaryLogModel.deleteMany({ attendanceId: { $in: attendanceIds } }).catch(() => undefined);
    await AttendanceModel.deleteMany(match);

    res.json({ ok: true, data: { cleared: true } });
  })
);

router.post(
  "/delete",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employeeId: z.string().min(3),
        dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slotId: z.string().optional() // Optional: if provided, delete only this slot; otherwise delete all slots for the date
      })
      .parse(req.body);

    const user = await UserModel.findOne({ employeeId: body.employeeId, role: "EMPLOYEE" }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });

    const day = DateTime.fromISO(body.dateISO, { zone: APP_TZ }).startOf("day");
    const attendanceDate = day.toJSDate();

    const match: any = { userId: user._id, attendanceDate };
    if (body.slotId) {
      match.slotId = body.slotId;
    }

    const deleted = await AttendanceModel.deleteMany(match);
    // We don't delete salary logs automatically (audit trail). Admin can re-approve which creates a new log.

    res.json({ ok: true, data: { deleted: deleted.deletedCount > 0 } });
  })
);


