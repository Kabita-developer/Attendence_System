import type { RequestHandler } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { UserModel, type UserRole } from "../models/User.js";

declare global {
  // eslint-disable-next-line no-var
  var __authTypes: unknown;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      role: UserRole;
      employeeId: string;
    };
    user?: {
      id: string;
      role: UserRole;
      employeeId: string;
    };
  }
}

function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

// Cache user lookups for 1 minute (JWT already has role/employeeId)
const userCache = new Map<string, { role: string; employeeId: string; isActive: boolean; expiresAt: number }>();

export async function tryAuthFromHeader(req: any): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) return false;

  try {
    const payload = verifyAccessToken(token);
    const userId = payload.sub;
    
    // Check cache first
    const cached = userCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      if (!cached.isActive) return false;
      req.auth = { 
        userId, 
        role: cached.role as any,
        employeeId: cached.employeeId
      };
      req.user = {
        id: userId,
        role: cached.role as any,
        employeeId: cached.employeeId
      };
      return true;
    }

    // Optimized query: only select needed fields
    const user = await UserModel.findById(userId)
      .select("role employeeId isActive")
      .lean();
    
    if (!user || !user.isActive) return false;
    
    // Cache for 1 minute
    userCache.set(userId, {
      role: user.role,
      employeeId: user.employeeId || payload.employeeId,
      isActive: user.isActive,
      expiresAt: Date.now() + 60000
    });
    
    // Set both req.auth (existing) and req.user (new structure)
    req.auth = { 
      userId, 
      role: user.role,
      employeeId: user.employeeId || payload.employeeId
    };
    req.user = {
      id: userId,
      role: user.role,
      employeeId: user.employeeId || payload.employeeId
    };
    return true;
  } catch {
    return false;
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const ok = await tryAuthFromHeader(req);
  if (!ok) {
    return res.status(401).json({
      ok: false,
      error: { message: "Unauthorized", status: 401 }
    });
  }
  return next();
};

export function requireRole(role: UserRole): RequestHandler {
  return async (req, res, next) => {
    const ok = await tryAuthFromHeader(req);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        error: { message: "Unauthorized", status: 401 }
      });
    }
    // Check role from req.user (primary) or req.auth (fallback)
    const userRole = req.user?.role || req.auth?.role;
    if (userRole !== role) {
      return res.status(403).json({
        ok: false,
        error: { message: "Forbidden", status: 403 }
      });
    }
    return next();
  };
}


