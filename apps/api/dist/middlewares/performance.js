/**
 * Performance monitoring middleware
 * Logs slow requests (>100ms) for optimization
 */
export const performanceMonitor = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (duration > 100) {
            console.warn(`[perf] Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
    });
    next();
};
/**
 * Response time header middleware
 * Sets X-Response-Time header before response is sent
 */
export const responseTimeHeader = (req, res, next) => {
    const start = Date.now();
    // Helper to set header if not already sent
    const setHeader = () => {
        if (!res.headersSent) {
            const duration = Date.now() - start;
            try {
                res.setHeader("X-Response-Time", `${duration}ms`);
            }
            catch {
                // Ignore if headers already sent
            }
        }
    };
    // Intercept res.end
    const originalEnd = res.end;
    res.end = function (chunk, encoding, cb) {
        setHeader();
        return originalEnd.call(this, chunk, encoding, cb);
    };
    // Intercept res.send (which is commonly used)
    const originalSend = res.send;
    res.send = function (body) {
        setHeader();
        return originalSend.call(this, body);
    };
    // Intercept res.json (which is commonly used)
    const originalJson = res.json;
    res.json = function (body) {
        setHeader();
        return originalJson.call(this, body);
    };
    next();
};
