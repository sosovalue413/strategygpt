import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export function requireApiAccess(request: Request) {
  const token = getServerEnv().apiToken;
  if (!token) return null;

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
  const headerToken = request.headers.get("x-strategygpt-token");
  if (bearer === token || headerToken === token) return null;

  return NextResponse.json(
    {
      error: "Unauthorized request."
    },
    { status: 401 }
  );
}
