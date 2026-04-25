import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";

function validatePin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return false;
  return req.headers.get("x-admin-pin") === ADMIN_PIN;
}

const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];

export async function POST(req: NextRequest) {
  if (!ADMIN_PIN) {
    return NextResponse.json(
      { error: "Admin PIN not configured." },
      { status: 500 }
    );
  }
  if (!validatePin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { houseId } = await req.json() as { houseId?: string };

  if (!houseId || !VALID_HOUSES.includes(houseId)) {
    return NextResponse.json({ error: "Invalid house." }, { status: 400 });
  }

  const houseRef = adminDb.collection("registrations").doc(houseId);
  const resetAt = new Date().toISOString();

  // Delete all events so the activity log is clean
  const eventsSnap = await houseRef.collection("events").get();
  const batch = adminDb.batch();
  eventsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Overwrite house doc — resetAt is the key field that triggers
  // client-side session reset in useHouseSession
  batch.set(houseRef, {
    houseId,
    currentStage: "stage-1",
    completedStages: [],
    members: [],
    lastSolvedBy: null,
    lastSeen: resetAt,
    resetAt,
  });

  await batch.commit();

  return NextResponse.json({ success: true, houseId, resetAt });
}
