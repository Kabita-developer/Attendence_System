import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.js";
import { SlotModel } from "../models/Slot.js";
import { cache } from "../services/cache.js";
export const router = Router();
router.get("/", requireAuth, asyncHandler(async (_req, res) => {
    // Cache slots for 5 minutes (they don't change often)
    const cacheKey = "slots:active";
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json({
            ok: true,
            data: { slots: cached }
        });
    }
    // Optimized query: only select needed fields, use index
    const slots = await SlotModel.find({ isActive: true })
        .select("name startMinutes endMinutes salary isActive sortOrder")
        .sort({ sortOrder: 1, endMinutes: 1 })
        .lean();
    const formatted = slots.map((s) => ({
        id: String(s._id),
        name: s.name,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        salary: s.salary,
        isActive: s.isActive
    }));
    // Cache for 5 minutes
    cache.set(cacheKey, formatted, 5 * 60 * 1000);
    res.json({
        ok: true,
        data: { slots: formatted }
    });
}));
