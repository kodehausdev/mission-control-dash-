// Polled by the dashboard's live feed. Operator-gated; reads on the
// service role server-side.

import { NextResponse } from "next/server";
import { getOperator } from "@/lib/server/operator";
import { listFeed } from "@/lib/server/activity";

export async function GET(req: Request) {
  const op = await getOperator();
  if (op.status !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const afterId = Number(url.searchParams.get("after")) || undefined;
  const tenantId = url.searchParams.get("tenant") ?? undefined;
  const items = await listFeed(10, { afterId, tenantId });
  return NextResponse.json({ items });
}
