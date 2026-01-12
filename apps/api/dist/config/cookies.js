import { env } from "./env.js";
export const cookieBaseOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/"
};
export const ACCESS_COOKIE_NAME = "access_token";
export const LOGIN_COOKIE_NAME = "login_token";
export const CSRF_COOKIE_NAME = "csrf_token";
