import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { SlotModel } from "../models/Slot.js";
import { cache } from "../services/cache.js";
export const router = Router();
/**
 * Parse time string to minutes since midnight
 * Supports formats:
 * - "01:00 PM" or "1:00 PM" (12-hour with AM/PM)
 * - "13:00" or "1:00" (24-hour)
 * - "01:00:00 PM" (with seconds)
 *
 * @param timeStr - Time string to parse
 * @returns Minutes since midnight (0-1439)
 */
function parseTimeToMinutes(timeStr) {
    // Remove extra spaces and convert to uppercase for easier parsing
    const cleaned = timeStr.trim().toUpperCase();
    // Try to match 12-hour format with AM/PM
    const pmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(PM|AM)$/);
    if (pmMatch) {
        let hours = parseInt(pmMatch[1], 10);
        const minutes = parseInt(pmMatch[2], 10);
        const period = pmMatch[3];
        if (hours < 1 || hours > 12) {
            throw new Error(`Invalid hour in 12-hour format: ${hours}`);
        }
        if (minutes < 0 || minutes > 59) {
            throw new Error(`Invalid minutes: ${minutes}`);
        }
        // Convert to 24-hour format
        if (period === "PM" && hours !== 12) {
            hours += 12;
        }
        else if (period === "AM" && hours === 12) {
            hours = 0;
        }
        return hours * 60 + minutes;
    }
    // Try to match 24-hour format
    const hour24Match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hour24Match) {
        const hours = parseInt(hour24Match[1], 10);
        const minutes = parseInt(hour24Match[2], 10);
        if (hours < 0 || hours > 23) {
            throw new Error(`Invalid hour in 24-hour format: ${hours}`);
        }
        if (minutes < 0 || minutes > 59) {
            throw new Error(`Invalid minutes: ${minutes}`);
        }
        return hours * 60 + minutes;
    }
    throw new Error(`Invalid time format: "${timeStr}". Expected formats: "01:00 PM", "13:00", "1:00 PM", etc.`);
}
function overlaps(a, b) {
    return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}
router.get("/", asyncHandler(async (_req, res) => {
    const slots = await SlotModel.find().sort({ isActive: -1, sortOrder: 1, endMinutes: 1 }).lean();
    res.json({
        ok: true,
        data: {
            slots: slots.map((s) => ({
                id: String(s._id),
                name: s.name,
                startMinutes: s.startMinutes,
                endMinutes: s.endMinutes,
                salary: s.salary,
                isActive: s.isActive,
                sortOrder: s.sortOrder
            }))
        }
    });
}));
router.post("/", asyncHandler(async (req, res) => {
    // Accept either time strings or minutes (for backward compatibility)
    const rawBody = z
        .object({
        name: z.string().min(1).max(80),
        startTime: z.string().optional(), // e.g., "01:00 PM" or "13:00"
        endTime: z.string().optional(), // e.g., "04:00 PM" or "16:00"
        startMinutes: z.union([z.number().int().min(0).max(1439), z.string()]).optional(),
        endMinutes: z.union([z.number().int().min(1).max(1440), z.string()]).optional(),
        salary: z.number().min(0),
        sortOrder: z.number().int().optional().default(0),
        isActive: z.boolean().optional().default(true)
    })
        .parse(req.body);
    // Parse time strings to minutes
    let startMinutes;
    let endMinutes;
    try {
        if (rawBody.startTime) {
            startMinutes = parseTimeToMinutes(rawBody.startTime);
        }
        else if (rawBody.startMinutes !== undefined) {
            startMinutes = typeof rawBody.startMinutes === "string"
                ? parseTimeToMinutes(rawBody.startMinutes)
                : rawBody.startMinutes;
        }
        else {
            return res.status(400).json({
                ok: false,
                error: { message: "Either startTime or startMinutes is required", status: 400 }
            });
        }
        if (rawBody.endTime) {
            endMinutes = parseTimeToMinutes(rawBody.endTime);
        }
        else if (rawBody.endMinutes !== undefined) {
            endMinutes = typeof rawBody.endMinutes === "string"
                ? parseTimeToMinutes(rawBody.endMinutes)
                : rawBody.endMinutes;
        }
        else {
            return res.status(400).json({
                ok: false,
                error: { message: "Either endTime or endMinutes is required", status: 400 }
            });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({
                ok: false,
                error: { message: error.message, status: 400 }
            });
        }
        return res.status(400).json({
            ok: false,
            error: { message: "Invalid time format", status: 400 }
        });
    }
    if (endMinutes <= startMinutes) {
        return res.status(400).json({
            ok: false,
            error: { message: "End time must be after start time", status: 400 }
        });
    }
    const body = {
        name: rawBody.name,
        startMinutes,
        endMinutes,
        salary: rawBody.salary,
        sortOrder: rawBody.sortOrder,
        isActive: rawBody.isActive
    };
    if (body.isActive) {
        const active = await SlotModel.find({ isActive: true }).lean();
        const next = { startMinutes: body.startMinutes, endMinutes: body.endMinutes };
        const collision = active.some((s) => overlaps(next, { startMinutes: s.startMinutes, endMinutes: s.endMinutes }));
        if (collision) {
            return res.status(409).json({ ok: false, error: { message: "Slot overlaps an existing active slot", status: 409 } });
        }
    }
    const slot = await SlotModel.create(body);
    // Invalidate cache when slot is created
    cache.invalidateSlots();
    cache.clear(`slot:${String(slot._id)}`);
    res.status(201).json({ ok: true, data: { slot: { id: String(slot._id) } } });
}));
router.post("/:id", asyncHandler(updateSlot));
router.post("/:id/update", asyncHandler(updateSlot));
async function updateSlot(req, res) {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const rawBody = z
        .object({
        name: z.string().min(1).max(80).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        startMinutes: z.union([z.number().int().min(0).max(1439), z.string()]).optional(),
        endMinutes: z.union([z.number().int().min(1).max(1440), z.string()]).optional(),
        salary: z.number().min(0).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional()
    })
        .parse(req.body);
    const slot = await SlotModel.findById(params.id);
    if (!slot)
        return res.status(404).json({ ok: false, error: { message: "Slot not found", status: 404 } });
    // Parse time strings to minutes if provided
    let startMinutes;
    let endMinutes;
    try {
        if (rawBody.startTime) {
            startMinutes = parseTimeToMinutes(rawBody.startTime);
        }
        else if (rawBody.startMinutes !== undefined) {
            startMinutes =
                typeof rawBody.startMinutes === "string" ? parseTimeToMinutes(rawBody.startMinutes) : rawBody.startMinutes;
        }
        if (rawBody.endTime) {
            endMinutes = parseTimeToMinutes(rawBody.endTime);
        }
        else if (rawBody.endMinutes !== undefined) {
            endMinutes = typeof rawBody.endMinutes === "string" ? parseTimeToMinutes(rawBody.endMinutes) : rawBody.endMinutes;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return res.status(400).json({
                ok: false,
                error: { message: error.message, status: 400 }
            });
        }
        return res.status(400).json({
            ok: false,
            error: { message: "Invalid time format", status: 400 }
        });
    }
    const next = {
        name: rawBody.name ?? slot.name,
        startMinutes: startMinutes ?? slot.startMinutes,
        endMinutes: endMinutes ?? slot.endMinutes,
        salary: rawBody.salary ?? slot.salary,
        sortOrder: rawBody.sortOrder ?? slot.sortOrder,
        isActive: rawBody.isActive ?? slot.isActive
    };
    if (next.endMinutes <= next.startMinutes) {
        return res.status(400).json({ ok: false, error: { message: "endMinutes must be > startMinutes", status: 400 } });
    }
    if (next.isActive) {
        const active = await SlotModel.find({ isActive: true, _id: { $ne: slot._id } }).lean();
        const collision = active.some((s) => overlaps(next, { startMinutes: s.startMinutes, endMinutes: s.endMinutes }));
        if (collision) {
            return res
                .status(409)
                .json({ ok: false, error: { message: "Slot overlaps an existing active slot", status: 409 } });
        }
    }
    slot.set(next);
    await slot.save();
    // Invalidate cache when slot is updated
    cache.invalidateSlots();
    cache.clear(`slot:${String(slot._id)}`);
    return res.json({ ok: true, data: { updated: true } });
}
// Delete (hard-delete): permanently removes the slot document
router.delete("/:id", asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const deleted = await SlotModel.findByIdAndDelete(params.id).lean();
    if (!deleted) {
        return res.status(404).json({ ok: false, error: { message: "Slot not found", status: 404 } });
    }
    // Invalidate cache when slot is deleted
    cache.invalidateSlots();
    cache.clear(`slot:${params.id}`);
    return res.json({ ok: true, data: { deleted: true } });
}));
// Docs-friendly delete route alias: POST /api/admin/slots/:id/delete
router.post("/:id/delete", asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const deleted = await SlotModel.findByIdAndDelete(params.id).lean();
    if (!deleted) {
        return res.status(404).json({ ok: false, error: { message: "Slot not found", status: 404 } });
    }
    // Invalidate cache when slot is deleted
    cache.invalidateSlots();
    cache.clear(`slot:${params.id}`);
    return res.json({ ok: true, data: { deleted: true } });
}));
