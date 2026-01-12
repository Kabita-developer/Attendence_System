import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { APP_TZ } from "../config/time.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/auth.js";
import { AttendanceModel } from "../models/Attendance.js";
import { UserModel } from "../models/User.js";
export const router = Router();
router.get("/salary-slip.pdf", requireRole("EMPLOYEE"), asyncHandler(async (req, res) => {
    const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
    const start = DateTime.fromFormat(q.month, "yyyy-MM", { zone: APP_TZ }).startOf("month");
    const end = start.endOf("month");
    const user = await UserModel.findById(req.auth.userId).lean();
    if (!user)
        return res.status(404).json({ ok: false, error: { message: "Not found", status: 404 } });
    const attendance = await AttendanceModel.find({
        userId: req.auth.userId,
        attendanceDate: { $gte: start.toJSDate(), $lte: end.toJSDate() },
        status: "APPROVED"
    })
        .sort({ attendanceDate: 1, "slotSnapshot.endMinutes": 1 })
        .lean();
    const total = attendance.reduce((sum, a) => sum + (a.slotSalary ?? 0), 0);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `attachment; filename="salary-slip-${user.employeeId}-${q.month}.pdf"`);
    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);
    doc.fontSize(18).text("Salary Slip", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555").text(`Employee: ${user.name} (${user.employeeId})`);
    doc.text(`Month: ${q.month} (TZ: ${APP_TZ})`);
    doc.moveDown(1);
    doc.fillColor("#111").fontSize(10);
    doc.text("Date", 36, doc.y, { continued: true, width: 100 });
    doc.text("Slot", { continued: true, width: 150 });
    doc.text("Status", { continued: true, width: 100 });
    doc.text("Amount", { width: 100 });
    doc.moveDown(0.3);
    doc.strokeColor("#ddd").moveTo(36, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);
    // Group by date for better display
    const byDate = new Map();
    for (const a of attendance) {
        const dateKey = DateTime.fromJSDate(a.attendanceDate).setZone(APP_TZ).toISODate();
        if (!byDate.has(dateKey)) {
            byDate.set(dateKey, []);
        }
        byDate.get(dateKey).push(a);
    }
    for (const [date, slots] of byDate.entries()) {
        for (const a of slots) {
            doc.text(date, 36, doc.y, {
                continued: true,
                width: 100
            });
            doc.text(a.slotSnapshot.name, { continued: true, width: 150 });
            doc.text(a.status, { continued: true, width: 100 });
            doc.text(String(a.slotSalary ?? 0), { width: 100 });
        }
    }
    doc.moveDown(1);
    doc.fontSize(12).fillColor("#111").text(`Total: ₹${total}`, { align: "right" });
    doc.end();
}));
