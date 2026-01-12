import type { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler(
  // Allow returning Response objects (common Express pattern) while still capturing async errors.
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}


