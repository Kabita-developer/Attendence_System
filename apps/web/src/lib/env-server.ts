import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
  ADMIN_SETUP_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});

function parseEnv() {
  const raw = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    APP_TIMEZONE: process.env.APP_TIMEZONE || "Asia/Kolkata",
    ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY,
    NODE_ENV: process.env.NODE_ENV || "development"
  };

  return EnvSchema.parse(raw);
}

export const env = parseEnv();

