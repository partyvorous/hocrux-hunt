import { NextRequest, NextResponse } from "next/server";
import { STAGE_ORDER, StageId } from "@/lib/stages";

const STAGE_CODES: Record<string, string> = {
  "stage-1": process.env.CODE_STAGE_1 ?? "",
  "stage-2": process.env.CODE_STAGE_2 ?? "",
  "stage-3": process.env.CODE_STAGE_3 ?? "",
  "stage-4": process.env.CODE_STAGE_4 ?? "",
  "stage-5": process.env.CODE_STAGE_5 ?? "",
  "stage-6": process.env.CODE_STAGE_6 ?? "",
  "stage-7": process.env.CODE_STAGE_7 ?? "",
};

// Halftime codes are per-house — needed when verifying halftime as a previous stage
const HALFTIME_CODES: Record<string, string> = {
  gryffindor: process.env.CODE_HALFTIME_GRYFFINDOR ?? "",
  slytherin:  process.env.CODE_HALFTIME_SLYTHERIN  ?? "",
  ravenclaw:  process.env.CODE_HALFTIME_RAVENCLAW  ?? "",
  hufflepuff: process.env.CODE_HALFTIME_HUFFLEPUFF ?? "",
};

export async function POST(req: NextRequest) {
  try {
    const { stageId, code, houseId } = await req.json() as {
      stageId?: string;
      code?: string;
      houseId?: string;
    };

    if (!stageId || !STAGE_ORDER.includes(stageId as StageId)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const expected = stageId === "halftime"
      ? HALFTIME_CODES[houseId ?? ""]
      : STAGE_CODES[stageId];

    if (!expected) {
      return NextResponse.json(
        { error: "Stage not configured. Contact the Hunt Master." },
        { status: 500 }
      );
    }

    if (code.trim().toUpperCase() !== expected.toUpperCase()) {
      return NextResponse.json(
        { error: "Wrong code. Your team must remember every Horcrux destroyed." },
        { status: 401 }
      );
    }

    return NextResponse.json({ correct: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
