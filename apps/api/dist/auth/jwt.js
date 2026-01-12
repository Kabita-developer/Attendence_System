import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function signAccessToken(payload) {
    const secret = env.JWT_ACCESS_SECRET;
    const expiresIn = (env.JWT_ACCESS_EXPIRES_IN || "1d");
    return jwt.sign(payload, secret, { expiresIn });
}
export function verifyAccessToken(token) {
    const secret = env.JWT_ACCESS_SECRET;
    return jwt.verify(token, secret);
}
