import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { nextStage } from "@/lib/stages";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";
const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];
const SKIP_PENALTY_MINUTES = 5;
// NOTE: must match STAGE4_PUZZLE_TILES in app/arrive/page.tsx
const PUZZLE_ANSWER = process.env.CODE_STAGE_4 ?? "GEMINO";

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

  const data = snap.data()!;

  if (data.currentStage !== "stage-4") {
    return NextResponse.json(
      { error: "House is not on the puzzle stage." },
      { status: 400 }
    );
  }

  const completedStages: string[] = data.completedStages ?? [];
  const updatedCompleted = completedStages.includes("stage-4")
    ? completedStages
    : [...completedStages, "stage-4"];

  const next = nextStage("stage-4") ?? "stage-5";
  const existingPenalty: number = data.penaltyMinutes ?? 0;

  await houseRef.set(
    {
      currentStage: next,
      completedStages: updatedCompleted,
      penaltyMinutes: existingPenalty + SKIP_PENALTY_MINUTES,
      lastSeen: new Date().toISOString(),
      lastSolvedBy: "Hunt Master",
    },
    { merge: true }
  );

  await houseRef.collection("events").add({
    type: "stage_advanced",
    stageId: "stage-4",
    stageCode: PUZZLE_ANSWER,
    horcrux: "Hufflepuff's Cup",
    solvedBy: "Hunt Master",
    isAdminSkip: true,
    penaltyMinutes: SKIP_PENALTY_MINUTES,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true, nextStage: next, penaltyMinutes: SKIP_PENALTY_MINUTES });
}
