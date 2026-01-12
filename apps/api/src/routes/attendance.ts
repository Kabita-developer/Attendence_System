import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/auth.js";
import { nowTz, APP_TZ, startOfDayDate } from "../config/time.js";
import { SlotModel } from "../models/Slot.js";
import { AttendanceModel } from "../models/Attendance.js";
import { calcSlotSalary } from "../services/salaryCalc.js";
import { SalaryLogModel } from "../models/SalaryLog.js";
import { cache } from "../services/cache.js";

export const router = Router();

router.post(
  "/mark",
  requireRole("EMPLOYEE"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        slotId: z.string().min(1) // Slot ID to mark attendance for
      })
      .parse(req.body);

    const current = nowTz();
    const attendanceDate = startOfDayDate(current);
    const minutesSinceStartOfDay = Math.floor(current.diff(current.startOf("day"), "minutes").minutes);

    // Get the slot - check cache first, then database
    let slot = cache.get<any>(`slot:${body.slotId}`);
    if (!slot) {
      slot = await SlotModel.findById(body.slotId)
        .select("name startMinutes endMinutes salary isActive")
        .lean();
      if (slot) {
        cache.set(`slot:${body.slotId}`, slot, 5 * 60 * 1000); // Cache for 5 minutes
      }
    }
    
    if (!slot || !slot.isActive) {
      return res.status(404).json({
        ok: false,
        error: { message: "Slot not found or inactive", status: 404 }
      });
    }

    // Check if already marked for this slot today - use compound index
    const existing = await AttendanceModel.findOne({
      userId: req.auth!.userId,
      attendanceDate,
      slotId: body.slotId
    })
      .select("_id status")
      .lean();
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: { message: "Attendance already marked for this slot today", status: 409 }
      });
    }

    // Create slot snapshot
    const slotSnapshot = {
      slotId: String(slot._id),
      name: slot.name,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      salary: slot.salary
    };

    // Determine status based on strict rules
    let status: "APPROVED" | "PENDING" | "REJECTED";
    let slotSalary = 0;
    let lateByMinutes = 0;
    let warningMessage = "";

    const slotEndTime = slot.endMinutes;
    const gracePeriodEnd = slotEndTime + 5;

    if (minutesSinceStartOfDay <= slotEndTime) {
      // Case 1: On or before slot end time → APPROVED, full salary
      status = "APPROVED";
      slotSalary = slot.salary;
    } else if (minutesSinceStartOfDay <= gracePeriodEnd) {
      // Case 2: After slot end but within 5 minutes grace → PENDING, 0 salary
      status = "PENDING";
      slotSalary = 0;
      lateByMinutes = minutesSinceStartOfDay - slotEndTime;
      warningMessage = `Late by ${lateByMinutes} minute(s). Admin approval required.`;
    } else {
      // Case 3: After slot end + 5 minutes → REJECTED, 0 salary, cannot be approved
      status = "REJECTED";
      slotSalary = 0;
      lateByMinutes = minutesSinceStartOfDay - slotEndTime;
      warningMessage = `Late by ${lateByMinutes} minute(s). Attendance rejected.`;
    }

    // Create attendance record
    const attendance = await AttendanceModel.create({
      userId: req.auth!.userId,
      attendanceDate,
      slotId: body.slotId,
      attendanceTime: current.toJSDate(),
      status,
      slotSalary,
      lateByMinutes,
      warningMessage,
      slotSnapshot
    });

    // Create salary log only if APPROVED
    if (status === "APPROVED") {
      await SalaryLogModel.create({
        userId: req.auth!.userId,
        attendanceId: attendance._id,
        attendanceDate,
        slots: 1, // One slot
        amount: slotSalary,
        action: "AUTO_APPROVED",
        createdAt: new Date()
      });
    }

    res.status(201).json({
      ok: true,
      data: {
        attendance: {
          id: String(attendance._id),
          slotId: String(slot._id),
          slotName: slot.name,
          date: DateTime.fromJSDate(attendanceDate).setZone(APP_TZ).toISODate(),
          time: current.toISO(),
          status,
          slotSalary,
          lateByMinutes,
          warningMessage
        }
      }
    });
  })
);

router.get(
  "/me",
  requireRole("EMPLOYEE"),
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/) // YYYY-MM
      })
      .parse(req.query);

    const start = DateTime.fromFormat(query.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");

    // Get all slot-wise attendance records for the month - optimized query
    const rows = await AttendanceModel.find({
      userId: req.auth!.userId,
      attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() }
    })
      .select("attendanceDate attendanceTime status slotSalary lateByMinutes warningMessage slotSnapshot slotId")
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

    // Calculate daily salary (sum of APPROVED slots only)
    const attendance = Array.from(byDate.entries()).map(([date, records]) => {
      const approvedSalary = records
        .filter((r) => r.status === "APPROVED")
        .reduce((sum, r) => sum + r.slotSalary, 0);

      return {
        date,
        slots: records.map((a) => ({
          id: String(a._id),
          slotId: String(a.slotId),
          slotName: a.slotSnapshot.name,
          time: DateTime.fromJSDate(a.attendanceTime).setZone(APP_TZ).toISO(),
          status: a.status,
          slotSalary: a.slotSalary,
          lateByMinutes: a.lateByMinutes,
          warningMessage: a.warningMessage
        })),
        dailySalary: approvedSalary // Sum of APPROVED slots only
      };
    });

    res.json({
      ok: true,
      data: {
        month: query.month,
        attendance
      }
    });
  })
);


