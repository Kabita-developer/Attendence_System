import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  role: "ADMIN" | "EMPLOYEE";
  employeeId: string;
};

export function signAccessToken(payload: AccessTokenPayload) {
  const secret: Secret = env.JWT_ACCESS_SECRET;
  const expiresIn = (env.JWT_ACCESS_EXPIRES_IN || "1d") as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret: Secret = env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret) as AccessTokenPayload;
}


