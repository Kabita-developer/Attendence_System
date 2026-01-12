const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Create Next.js app
const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// Initialize Express app and database connection
let expressApp;
let dbConnected = false;

async function initializeBackend() {
  try {
    // Set unified server flag for Express app
    process.env.UNIFIED_SERVER = "true";
    
    // Connect to database first
    const dbPath = path.join(__dirname, "../api/dist/db.js");
    const { connectDb } = require(dbPath);
    console.log("[server] Connecting to database...");
    await connectDb();
    dbConnected = true;
    console.log("[server] ✓ Database connected");

    // Then create Express app
    const appPath = path.join(__dirname, "../api/dist/app.js");
    const { createApp } = require(appPath);
    expressApp = createApp();
    console.log("[server] ✓ Express app initialized");
  } catch (error) {
    console.error("[server] ✗ Failed to initialize backend:", error.message);
    if (error.code === "MODULE_NOT_FOUND") {
      console.error("[server] Make sure to build the API first:");
      console.error("[server]   npm run build -w @app/api");
      console.error("[server] Or run: npm run dev (from root)");
    }
    throw error;
  }
}

nextApp.prepare().then(async () => {
  try {
    // Initialize backend (database + Express)
    await initializeBackend();

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        const { pathname } = parsedUrl;

        // Route API requests to Express
        if (pathname?.startsWith("/api/")) {
          if (!dbConnected) {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ ok: false, error: { message: "Database not connected", status: 503 } }));
          }
          return expressApp(req, res);
        }

        // Route everything else to Next.js
        return handle(req, res, parsedUrl);
      } catch (err) {
        console.error("[server] Error handling request:", req.url, err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: { message: "Internal server error", status: 500 } }));
      }
    });

    server.listen(port, () => {
      console.log(`[server] ✓ Ready on http://${hostname}:${port}`);
      console.log(`[server] ✓ Next.js frontend + Express API running on port ${port}`);
      console.log(`[server] ✓ Server-side rendering enabled`);
    });
  } catch (error) {
    console.error("[server] ✗ Failed to start server:", error);
    process.exit(1);
  }
});

