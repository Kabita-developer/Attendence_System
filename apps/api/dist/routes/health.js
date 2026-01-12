import { Router } from "express";
import { env } from "../config/env.js";
export const router = Router();
router.get("/", (_req, res) => {
    res.json({ ok: true, status: "up" });
});
// Debug endpoint to check env configuration (development only)
router.get("/debug-env", (_req, res) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ ok: false, error: { message: "Not available in production", status: 403 } });
    }
    res.json({
        ok: true,
        data: {
            adminSetupKeyConfigured: !!env.ADMIN_SETUP_KEY,
            adminSetupKeyLength: env.ADMIN_SETUP_KEY?.length || 0,
            adminSetupKeyFirstChar: env.ADMIN_SETUP_KEY ? env.ADMIN_SETUP_KEY[0] : null,
            adminSetupKeyLastChar: env.ADMIN_SETUP_KEY ? env.ADMIN_SETUP_KEY[env.ADMIN_SETUP_KEY.length - 1] : null,
            processEnvHasKey: !!process.env.ADMIN_SETUP_KEY,
            processEnvKeyLength: process.env.ADMIN_SETUP_KEY?.length || 0,
            cwd: process.cwd()
        }
    });
});
