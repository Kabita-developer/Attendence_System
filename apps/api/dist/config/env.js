import dotenv from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { existsSync } from "fs";
// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Try multiple possible paths for .env file
const possiblePaths = [
    join(__dirname, "../../.env"), // From src/config to apps/api
    join(process.cwd(), ".env"), // Current working directory
    resolve(process.cwd(), "apps/api/.env"), // Explicit path from root
];
let envLoaded = false;
let loadedPath = "";
// Try each path until one works
for (const envPath of possiblePaths) {
    if (existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        if (!result.error) {
            envLoaded = true;
            loadedPath = envPath;
            // eslint-disable-next-line no-console
            console.log(`[env] ✓ Loaded .env file from: ${envPath}`);
            break;
        }
    }
}
if (!envLoaded) {
    // eslint-disable-next-line no-console
    console.warn(`[env] ⚠ Warning: Could not find .env file. Tried paths:`, possiblePaths);
    // eslint-disable-next-line no-console
    console.warn(`[env] Current working directory: ${process.cwd()}`);
    // Try loading from default location (current directory)
    const defaultResult = dotenv.config();
    if (!defaultResult.error && defaultResult.parsed) {
        envLoaded = true;
        // eslint-disable-next-line no-console
        console.log(`[env] ✓ Loaded .env file from default location`);
    }
}
// Force reload from process.env to ensure we have the latest values
// This helps when .env file is modified without restart
if (process.env.ADMIN_SETUP_KEY) {
    // eslint-disable-next-line no-console
    console.log(`[env] ✓ ADMIN_SETUP_KEY found in process.env`);
}
else {
    // eslint-disable-next-line no-console
    console.warn(`[env] ⚠ ADMIN_SETUP_KEY NOT found in process.env`);
    // eslint-disable-next-line no-console
    console.warn(`[env] All env vars:`, Object.keys(process.env).filter(k => k.includes('ADMIN') || k.includes('SETUP')));
}
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    MONGODB_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_ACCESS_EXPIRES_IN: z.string().default("1d"),
    APP_TIMEZONE: z.string().default("Asia/Kolkata"),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    // Protects the admin bootstrap signup endpoint. In production, set a strong secret value.
    ADMIN_SETUP_KEY: z.string().min(1).optional()
});
function parseEnv() {
    try {
        return EnvSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            console.error("\n[env] ✗ Environment validation failed:");
            error.errors.forEach((err) => {
                const path = err.path.length > 0 ? err.path.join(".") : "root";
                console.error(`[env]   - ${path}: ${err.message}`);
                if (err.path.length > 0) {
                    const value = process.env[err.path[0]];
                    if (value !== undefined) {
                        console.error(`[env]     Current value: "${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"`);
                    }
                    else {
                        console.error(`[env]     Value: undefined (not set)`);
                    }
                }
            });
            console.error("[env]");
            console.error("[env] Please check your .env file in apps/api/.env");
            console.error("[env] Required variables:");
            console.error("[env]   - MONGODB_URI (e.g., mongodb://127.0.0.1:27017/attendance_system)");
            console.error("[env]   - JWT_ACCESS_SECRET (minimum 16 characters)");
            console.error("\n");
            const err = new Error("Environment validation failed. See errors above.");
            err.name = "EnvironmentValidationError";
            throw err;
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Unknown error during environment validation: ${String(error)}`);
    }
}
let env;
try {
    env = parseEnv();
}
catch (error) {
    // Ensure error is properly formatted before throwing
    if (error instanceof Error) {
        console.error("[env] Fatal error:", error.message);
        process.exit(1);
    }
    else {
        console.error("[env] Fatal error:", String(error));
        process.exit(1);
    }
}
export { env };
// Debug: Log ADMIN_SETUP_KEY status (without exposing the value)
if (process.env.NODE_ENV === "development") {
    if (env.ADMIN_SETUP_KEY) {
        // eslint-disable-next-line no-console
        console.log(`[env] ✓ ADMIN_SETUP_KEY is configured (length: ${env.ADMIN_SETUP_KEY.length} characters)`);
    }
    else {
        // eslint-disable-next-line no-console
        console.warn(`[env] ⚠ ADMIN_SETUP_KEY is NOT configured. Admin signup will fail.`);
    }
}
