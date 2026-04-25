import { NextRequest, NextResponse } from "next/server";
import { nextStage, StageId, STAGE_ORDER } from "@/lib/stages";

const STAGE_CODES: Record<string, string> = {
  "stage-1": process.env.CODE_STAGE_1 ?? "",
  "stage-2": process.env.CODE_STAGE_2 ?? "",
  "stage-3": process.env.CODE_STAGE_3 ?? "",
  "stage-4": process.env.CODE_STAGE_4 ?? "",
  "stage-5": process.env.CODE_STAGE_5 ?? "",
  "stage-6": process.env.CODE_STAGE_6 ?? "",
  "stage-7": process.env.CODE_STAGE_7 ?? "",
};

// Halftime codes are per-house — given to each house's potions team before the event
const HALFTIME_CODES: Record<string, string> = {
  gryffindor: process.env.CODE_HALFTIME_GRYFFINDOR ?? "",
  slytherin:  process.env.CODE_HALFTIME_SLYTHERIN  ?? "",
  ravenclaw:  process.env.CODE_HALFTIME_RAVENCLAW  ?? "",
  hufflepuff: process.env.CODE_HALFTIME_HUFFLEPUFF ?? "",
};

const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { houseId, stageId, code } = body as {
      houseId?: string;
      stageId?: string;
      code?: string;
    };

    if (!houseId || !VALID_HOUSES.includes(houseId)) {
      return NextResponse.json({ error: "Invalid house." }, { status: 400 });
    }

    if (!stageId || !STAGE_ORDER.includes(stageId as StageId)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    if (!code || code.trim().length === 0) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const expected = stageId === "halftime"
      ? HALFTIME_CODES[houseId]
      : STAGE_CODES[stageId];

    if (!expected) {
      return NextResponse.json(
        { error: "Stage code not configured. Contact the Hunt Master." },
        { status: 500 }
      );
    }

    if (code.trim().toUpperCase() !== expected.toUpperCase()) {
      return NextResponse.json(
        { error: stageId === "halftime"
            ? "Wrong code. Only the potions team holds the key to this gate."
            : "Wrong code. The Horcrux resists your attempt." },
        { status: 401 }
      );
    }

    const next = nextStage(stageId as StageId);

    return NextResponse.json({
      success: true,
      nextStageId: next,
      isFinal: next === null,
    });
  } catch (err) {
    console.error("[advance] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
