import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export type ApiHandler = (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>;

export function createApiHandler(handler: (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<Response | NextResponse>) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const response = await handler(req, context);
      if (response instanceof NextResponse) {
        return response;
      }
      return NextResponse.json(response);
    } catch (error) {
      console.error("[api] Error:", error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { ok: false, error: { message: error.errors[0]?.message || "Validation error", status: 400 } },
          { status: 400 }
        );
      }
      if (error instanceof Error) {
        return NextResponse.json(
          { ok: false, error: { message: error.message, status: 500 } },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { ok: false, error: { message: "Internal server error", status: 500 } },
        { status: 500 }
      );
    }
  };
}

export async function getJsonBody<T>(req: NextRequest): Promise<T> {
  return req.json() as Promise<T>;
}

export async function getQueryParams<T>(req: NextRequest): Promise<T> {
  const searchParams = req.nextUrl.searchParams;
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params as T;
}

