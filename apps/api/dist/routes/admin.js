import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/auth.js";
import { nextEmployeeId } from "../services/employeeId.js";
import { UserModel } from "../models/User.js";
import { router as adminSlotsRouter } from "./adminSlots.js";
import { router as adminAttendanceRouter } from "./adminAttendance.js";
import { router as adminReportsRouter } from "./adminReports.js";
export const router = Router();
router.use(requireRole("ADMIN"));
router.use("/slots", adminSlotsRouter);
router.use("/attendance", adminAttendanceRouter);
router.use("/reports", adminReportsRouter);
router.post("/employees", asyncHandler(async (req, res) => {
    const body = z
        .object({
        name: z.string().min(1).max(120),
        email: z.string().email(),
        phone: z.string().min(5).max(30),
        password: z.string().min(1).max(128)
    })
        .parse(req.body);
    const employeeId = await nextEmployeeId();
    const user = await UserModel.create({
        role: "EMPLOYEE",
        employeeId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash: body.password, // Store password in plain text
        passwordUpdatedAt: new Date(),
        mustChangePassword: false,
        isActive: true
    });
    res.status(201).json({
        ok: true,
        data: {
            employee: {
                id: String(user._id),
                employeeId: user.employeeId,
                name: user.name,
                email: user.email ?? "",
                phone: user.phone ?? ""
            }
        }
    });
}));
router.get("/employees", asyncHandler(async (_req, res) => {
    // Optimized: use index on role, select only needed fields
    const employees = await UserModel.find({ role: "EMPLOYEE" })
        .select("_id employeeId name email phone passwordHash isActive mustChangePassword createdAt")
        .sort({ employeeId: 1 })
        .lean();
    res.json({
        ok: true,
        data: {
            employees: employees.map((e) => ({
                id: String(e._id),
                employeeId: e.employeeId,
                name: e.name,
                email: e.email ?? "",
                phone: e.phone ?? "",
                password: e.passwordHash ?? "", // Password stored in plain text
                isActive: e.isActive,
                mustChangePassword: e.mustChangePassword,
                createdAt: e.createdAt
            }))
        }
    });
}));
router.post("/employees/:id/update", asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
        .object({
        name: z.string().min(1).max(120).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(5).max(30).optional(),
        password: z.string().min(1).max(128).optional(),
        isActive: z.boolean().optional()
    })
        .parse(req.body);
    // Optimized: select only needed fields
    const user = await UserModel.findById(params.id)
        .select("_id role employeeId name email phone passwordHash isActive");
    if (!user || user.role !== "EMPLOYEE") {
        return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });
    }
    if (body.name !== undefined)
        user.name = body.name;
    if (body.email !== undefined)
        user.email = body.email;
    if (body.phone !== undefined)
        user.phone = body.phone;
    if (body.password !== undefined) {
        user.passwordHash = body.password; // Store password in plain text
        user.passwordUpdatedAt = new Date();
    }
    if (body.isActive !== undefined)
        user.isActive = body.isActive;
    await user.save();
    res.json({
        ok: true,
        data: {
            employee: {
                id: String(user._id),
                employeeId: user.employeeId,
                name: user.name,
                email: user.email ?? "",
                phone: user.phone ?? ""
            }
        }
    });
}));
router.post("/employees/:id/delete", asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    // Optimized: select only role to check, then delete
    const user = await UserModel.findById(params.id)
        .select("_id role");
    if (!user || user.role !== "EMPLOYEE") {
        return res.status(404).json({ ok: false, error: { message: "Employee not found", status: 404 } });
    }
    await UserModel.findByIdAndDelete(params.id);
    res.json({
        ok: true,
        data: {
            deleted: true
        }
    });
}));
