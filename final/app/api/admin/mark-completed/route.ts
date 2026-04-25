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

  const { houseId } = (await req.json()) as { houseId?: string };

  if (!houseId || !VALID_HOUSES.includes(houseId)) {
    return NextResponse.json({ error: "Invalid house." }, { status: 400 });
  }

  const houseRef = adminDb.collection("registrations").doc(houseId);
  const snap = await houseRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "House not registered." }, { status: 404 });
  }

  const completedAt = new Date().toISOString();

  await houseRef.set(
    { isCompleted: true, completedAt },
    { merge: true }
  );

  await houseRef.collection("events").add({
    type: "house_completed",
    stageId: "stage-7",
    horcrux: "Harry Potter",
    solvedBy: "Hunt Master",
    completedAt,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true, completedAt });
}
