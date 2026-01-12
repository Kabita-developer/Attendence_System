import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { performanceMonitor, responseTimeHeader } from "./middlewares/performance.js";
import { router as healthRouter } from "./routes/health.js";
import { router as authRouter } from "./routes/auth.js";
import { router as adminRouter } from "./routes/admin.js";
import { router as slotsRouter } from "./routes/slots.js";
import { router as attendanceRouter } from "./routes/attendance.js";
import { router as reportsMeRouter } from "./routes/reportsMe.js";
export function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    // CORS: Allow same origin (when running with Next.js) or configured origin
    const allowedOrigin = process.env.UNIFIED_SERVER === "true" ? undefined : env.WEB_ORIGIN;
    if (allowedOrigin) {
        app.use(cors({
            origin: allowedOrigin,
            credentials: true
        }));
    }
    app.use(helmet());
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
    app.use(express.json({ limit: "1mb" }));
    // Performance monitoring - log slow requests (>100ms)
    app.use(performanceMonitor);
    app.use(responseTimeHeader);
    app.use(rateLimit({
        windowMs: 60_000,
        max: 240,
        standardHeaders: "draft-7",
        legacyHeaders: false
    }));
    app.use("/api/health", healthRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/slots", slotsRouter);
    app.use("/api/attendance", attendanceRouter);
    app.use("/api/reports/me", reportsMeRouter);
    app.use("/api/admin", adminRouter);
    app.use(errorHandler);
    return app;
}
