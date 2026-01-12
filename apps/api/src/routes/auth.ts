import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { verifyPassword } from "../auth/password.js";
import { signAccessToken } from "../auth/jwt.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { hashPassword } from "../auth/password.js";
import { env } from "../config/env.js";
import { generateOneTimePassword } from "../services/otp.js";

export const router = Router();

router.post(
  "/admin/signup",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().min(1).max(120).optional(),
        password: z.string().min(8).max(128),
        setupKey: z.string().min(1)
      })
      .parse(req.body);

    // Check both env.ADMIN_SETUP_KEY and process.env.ADMIN_SETUP_KEY as fallback
    const setupKey = env.ADMIN_SETUP_KEY || process.env.ADMIN_SETUP_KEY;
    
    if (!setupKey || setupKey.trim() === "") {
      return res.status(403).json({ 
        ok: false, 
        error: { 
          message: "ADMIN_SETUP_KEY not configured. Please set ADMIN_SETUP_KEY in your .env file and restart the server. Check /api/health/debug-env for debugging info.", 
          status: 403 
        } 
      });
    }
    
    // Use the setupKey we found (from env or process.env)
    if (body.setupKey !== setupKey) {
      return res.status(403).json({ 
        ok: false, 
        error: { 
          message: `Invalid setup key. Expected key length: ${setupKey.length}, Received: ${body.setupKey.length}. Check /api/health/debug-env for debugging info.`, 
          status: 403 
        } 
      });
    }

    // Bootstrap only: block if any admin already exists
    const existingAdmin = await UserModel.findOne({ role: "ADMIN" }).lean();
    if (existingAdmin) {
      return res.status(409).json({ ok: false, error: { message: "Admin already exists", status: 409 } });
    }

    const admin = await UserModel.create({
      role: "ADMIN",
      employeeId: "ADMIN",
      name: body.name ?? "Admin",
      email: body.email,
      passwordHash: await hashPassword(body.password),
      passwordUpdatedAt: new Date(),
      mustChangePassword: false,
      isActive: true
    });

    return res.status(201).json({
      ok: true,
      data: {
        admin: {
          id: String(admin._id),
          role: admin.role,
          employeeId: admin.employeeId,
          name: admin.name,
          email: admin.email ?? ""
        }
      }
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employeeId: z.string().min(3),
        password: z.string().min(1)
      })
      .parse(req.body);

    // Optimized query: use index on employeeId, select only needed fields
    const user = await UserModel.findOne({ employeeId: body.employeeId })
      .select("_id role employeeId name passwordHash isActive mustChangePassword")
      .lean();
    
    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, error: { message: "Invalid credentials", status: 401 } });
    }

    // Check plain text password first (for new employees), then fall back to hashed (for existing users)
    let ok = false;
    if (user.passwordHash && user.passwordHash.length < 60) {
      // Plain text password (stored directly, less than 60 chars indicates it's not a bcrypt hash)
      ok = body.password === user.passwordHash;
    } else {
      // Hashed password (bcrypt hash is ~60 chars)
      ok = await verifyPassword(body.password, user.passwordHash);
    }
    if (!ok) {
      return res.status(401).json({ ok: false, error: { message: "Invalid credentials", status: 401 } });
    }

    if (!user.employeeId) {
      return res.status(500).json({ ok: false, error: { message: "User missing employeeId", status: 500 } });
    }

    const token = signAccessToken({ 
      sub: String(user._id), 
      role: user.role,
      employeeId: user.employeeId
    });

    return res.json({
      ok: true,
      data: {
        user: {
          id: String(user._id),
          role: user.role,
          employeeId: user.employeeId,
          name: user.name,
          mustChangePassword: user.mustChangePassword
        },
        token
      }
    });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    // JWT tokens are stateless, so logout is handled client-side by removing the token
    res.json({ ok: true, data: { loggedOut: true } });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.auth!.userId).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: "Not found", status: 404 } });

    res.json({
      ok: true,
      data: {
        user: {
          id: String(user._id),
          role: user.role,
          employeeId: user.employeeId,
          name: user.name,
          mustChangePassword: user.mustChangePassword
        }
      }
    });
  })
);

router.post(
  "/change-password",
  requireRole("ADMIN"), // Only admins can change passwords
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128)
      })
      .parse(req.body);

    const user = await UserModel.findById(req.auth!.userId);
    if (!user) return res.status(404).json({ ok: false, error: { message: "Not found", status: 404 } });

    // Check plain text password first (for new admins), then fall back to hashed (for existing admins)
    let ok = false;
    if (user.passwordHash && user.passwordHash.length < 60) {
      // Plain text password
      ok = body.currentPassword === user.passwordHash;
    } else {
      // Hashed password
      ok = await verifyPassword(body.currentPassword, user.passwordHash);
    }
    if (!ok) return res.status(400).json({ ok: false, error: { message: "Invalid current password", status: 400 } });

    user.passwordHash = body.newPassword; // Store password in plain text
    user.passwordUpdatedAt = new Date();
    user.mustChangePassword = false;
    await user.save();

    res.json({ ok: true, data: { changed: true } });
  })
);

// Admin OTP-based password reset (for when admin forgets password)
router.post(
  "/admin/request-password-reset",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);

    const admin = await UserModel.findOne({ role: "ADMIN", email: body.email, isActive: true });
    // Always respond OK to avoid account enumeration
    if (!admin) return res.json({ ok: true, data: { requested: true } });

    const otp = generateOneTimePassword();
    admin.passwordResetOtpHash = await hashPassword(otp);
    admin.passwordResetRequestedAt = new Date();
    admin.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await admin.save();

    // In production you'd send this OTP via email/SMS. For dev, return it to make the demo usable.
    const includeOtp = env.NODE_ENV !== "production";
    return res.json({
      ok: true,
      data: { requested: true, ...(includeOtp ? { devOtp: otp } : {}) }
    });
  })
);

router.post(
  "/admin/confirm-password-reset",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        otp: z.string().min(4),
        newPassword: z.string().min(8).max(128)
      })
      .parse(req.body);

    const admin = await UserModel.findOne({ role: "ADMIN", email: body.email, isActive: true });
    // Keep response generic
    if (!admin || !admin.passwordResetOtpHash || !admin.passwordResetOtpExpiresAt) {
      return res.status(400).json({ ok: false, error: { message: "Invalid OTP", status: 400 } });
    }

    if (admin.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: { message: "OTP expired", status: 400 } });
    }

    const ok = await verifyPassword(body.otp, admin.passwordResetOtpHash);
    if (!ok) return res.status(400).json({ ok: false, error: { message: "Invalid OTP", status: 400 } });

    admin.passwordHash = await hashPassword(body.newPassword);
    admin.passwordUpdatedAt = new Date();
    admin.mustChangePassword = false;
    admin.passwordResetOtpHash = undefined;
    admin.passwordResetOtpExpiresAt = undefined;
    admin.passwordResetRequestedAt = undefined;
    await admin.save();

    return res.json({ ok: true, data: { reset: true } });
  })
);


