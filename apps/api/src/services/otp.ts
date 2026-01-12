import { randomToken } from "../utils/crypto.js";

export function generateOneTimePassword() {
  // 10 chars (hex) -> 40 bits; short but strong enough for first-login OTP if rate-limited.
  return randomToken(5).toUpperCase();
}


