import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

function validatePin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return false;
  const pin = req.headers.get("x-admin-pin");
  return pin === ADMIN_PIN;
}

// Public GET: anyone can read game status (needed for pause overlay on user screens)
export async function GET() {
  try {
    const snap = await adminDb.collection("config").doc("gameState").get();
    if (!snap.exists) {
      return NextResponse.json({ status: "started" });
    }
    return NextResponse.json({ status: snap.data()?.status ?? "started" });
  } catch {
    return NextResponse.json({ status: "started" });
  }
}

// PIN-protected POST: update game status
export async function POST(req: NextRequest) {
  if (!ADMIN_PIN) {
    return NextResponse.json(
      { error: "Admin PIN not configured on the server." },
      { status: 500 }
    );
  }
  if (!validatePin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body as { status?: string };

  const valid = ["idle", "started", "paused", "stopped"];
  if (!status || !valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
  }

  await adminDb.collection("config").doc("gameState").set({
    status,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, status });
}
