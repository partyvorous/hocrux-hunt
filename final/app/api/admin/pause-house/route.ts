import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";
const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];

function validatePin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return false;
  return req.headers.get("x-admin-pin") === ADMIN_PIN;
}

export async function POST(req: NextRequest) {
  if (!ADMIN_PIN) {
    return NextResponse.json({ error: "Admin PIN not configured." }, { status: 500 });
  }
  if (!validatePin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { houseId, pause } = (await req.json()) as {
    houseId?: string;
    pause?: boolean;
  };

  if (!houseId || !VALID_HOUSES.includes(houseId)) {
    return NextResponse.json({ error: "Invalid house." }, { status: 400 });
  }

  const houseRef = adminDb.collection("registrations").doc(houseId);
  const snap = await houseRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "House not registered." }, { status: 404 });
  }

  const currentStage = snap.data()?.currentStage ?? "unknown";

  if (pause) {
    await houseRef.set(
      { isPaused: true, pausedAt: new Date().toISOString() },
      { merge: true }
    );
    await houseRef.collection("events").add({
      type: "house_paused",
      stageId: currentStage,
      horcrux: "—",
      solvedBy: "Hunt Master",
      timestamp: new Date(),
    });
  } else {
    const pausedAt = snap.data()?.pausedAt as string | undefined;
    let pauseDurationSeconds = 0;
    if (pausedAt) {
      pauseDurationSeconds = Math.round(
        (Date.now() - new Date(pausedAt).getTime()) / 1000
      );
    }
    const existing = snap.data()?.totalPausedSeconds ?? 0;
    await houseRef.set(
      {
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: existing + pauseDurationSeconds,
      },
      { merge: true }
    );
    await houseRef.collection("events").add({
      type: "house_resumed",
      stageId: currentStage,
      horcrux: "—",
      solvedBy: "Hunt Master",
      pauseDurationSeconds,
      timestamp: new Date(),
    });
  }

  return NextResponse.json({ success: true, pause });
}
