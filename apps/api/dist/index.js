// Catch any uncaught exceptions during module loading - MUST be first!
process.on("uncaughtException", (error) => {
    console.error("\n[api] ✗ Uncaught Exception during startup:");
    if (error instanceof Error) {
        console.error("[api] Error name:", error.name);
        console.error("[api] Error message:", error.message);
        if (error.stack) {
            console.error("[api] Error stack:", error.stack);
        }
    }
    else {
        console.error("[api] Error type:", typeof error);
        console.error("[api] Error value:", String(error));
    }
    console.error("\n");
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("\n[api] ✗ Unhandled Rejection:");
    console.error("[api] Promise:", promise);
    console.error("[api] Reason:", reason);
    if (reason instanceof Error) {
        console.error("[api] Error message:", reason.message);
        console.error("[api] Error stack:", reason.stack);
    }
    console.error("\n");
    process.exit(1);
});
// Now import modules - errors will be caught by handlers above
import { env } from "./config/env.js";
import { connectDb } from "./db.js";
import { createApp } from "./app.js";
async function main() {
    try {
        console.log("[api] Starting server...");
        console.log("[api] Connecting to database...");
        await connectDb();
        console.log("[api] ✓ Database connected");
        console.log("[api] Creating Express app...");
        const app = createApp();
        console.log("[api] ✓ Express app created");
        app.listen(env.PORT, () => {
            // eslint-disable-next-line no-console
            console.log(`[api] ✓ Server listening on http://localhost:${env.PORT}`);
        });
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error("[api] ✗ Startup error:");
        if (error instanceof Error) {
            // eslint-disable-next-line no-console
            console.error("[api] Error message:", error.message);
            // eslint-disable-next-line no-console
            console.error("[api] Error stack:", error.stack);
        }
        else {
            // eslint-disable-next-line no-console
            console.error("[api] Unknown error type:", typeof error);
            // eslint-disable-next-line no-console
            console.error("[api] Error value:", String(error));
            try {
                // eslint-disable-next-line no-console
                console.error("[api] Error JSON:", JSON.stringify(error, null, 2));
            }
            catch {
                // eslint-disable-next-line no-console
                console.error("[api] Could not stringify error");
            }
        }
        process.exit(1);
    }
}
main().catch((err) => {
    console.error("[api] ✗ Unhandled error in main():", err);
    process.exit(1);
});
