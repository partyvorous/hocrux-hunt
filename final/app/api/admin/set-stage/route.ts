import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { STAGE_ORDER, StageId, getStage } from "@/lib/stages";

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

  const { houseId, stageId } = (await req.json()) as {
    houseId?: string;
    stageId?: string;
  };

  if (!houseId || !VALID_HOUSES.includes(houseId)) {
    return NextResponse.json({ error: "Invalid house." }, { status: 400 });
  }
  if (!stageId || !STAGE_ORDER.includes(stageId as StageId)) {
    return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
  }

  const houseRef = adminDb.collection("registrations").doc(houseId);
  const snap = await houseRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "House not registered." }, { status: 404 });
  }

  const targetIdx = STAGE_ORDER.indexOf(stageId as StageId);
  // All stages before the target are marked as completed
  const completedStages = STAGE_ORDER.slice(0, targetIdx);

  const stageData = getStage(stageId as StageId);

  await houseRef.set(
    {
      currentStage: stageId,
      completedStages,
      lastSeen: new Date().toISOString(),
      lastSolvedBy: "Hunt Master",
    },
    { merge: true }
  );

  await houseRef.collection("events").add({
    type: "admin_stage_change",
    stageId,
    horcrux: stageData?.horcrux ?? stageId,
    solvedBy: "Hunt Master",
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true, stageId, completedStages });
}
