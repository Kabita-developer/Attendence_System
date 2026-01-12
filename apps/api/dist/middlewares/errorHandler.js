export const errorHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = status >= 500 ? "Internal server error" : (err?.message ?? "Request failed");
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(status).json({
        ok: false,
        error: {
            message,
            status
        }
    });
};
