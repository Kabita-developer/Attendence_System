import crypto from "crypto";
import { cookieBaseOptions, CSRF_COOKIE_NAME } from "../config/cookies.js";
import { env } from "../config/env.js";
export function issueCsrfCookie(res) {
    const csrf = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE_NAME, csrf, {
        ...cookieBaseOptions,
        httpOnly: false
    });
    return csrf;
}
export const requireCsrf = (req, res, next) => {
    if (!env.CSRF_ENABLED)
        return next();
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS")
        return next();
    // Allow obtaining CSRF cookie without CSRF header.
    if (req.originalUrl?.startsWith("/api/auth/csrf"))
        return next();
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.header("x-csrf-token");
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
            ok: false,
            error: { message: "CSRF validation failed", status: 403 }
        });
    }
    return next();
};
