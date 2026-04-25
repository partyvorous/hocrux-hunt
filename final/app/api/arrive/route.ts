import { NextRequest, NextResponse } from "next/server";

// Arrival tokens are embedded in QR codes — they prove the player is
// physically at the location. They are separate from the challenge codes
// (CODE_STAGE_X) which are given to the player AFTER completing the challenge.
const ARRIVE_TOKENS: Record<string, string> = {
  "stage-1": process.env.ARRIVE_TOKEN_STAGE_1 ?? "",
  "stage-2": process.env.ARRIVE_TOKEN_STAGE_2 ?? "",
  "stage-3": process.env.ARRIVE_TOKEN_STAGE_3 ?? "",
  halftime: process.env.ARRIVE_TOKEN_HALFTIME ?? "",
  "stage-4": process.env.ARRIVE_TOKEN_STAGE_4 ?? "",
  "stage-5": process.env.ARRIVE_TOKEN_STAGE_5 ?? "",
  "stage-6": process.env.ARRIVE_TOKEN_STAGE_6 ?? "",
  "stage-7": process.env.ARRIVE_TOKEN_STAGE_7 ?? "",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { stageId, arrivalToken } = body as {
    stageId?: string;
    arrivalToken?: string;
  };

  if (!stageId || !arrivalToken) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const expected = ARRIVE_TOKENS[stageId];
  if (!expected) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  }

  if (arrivalToken.trim().toUpperCase() !== expected.toUpperCase()) {
    return NextResponse.json(
      { error: "This QR code is not valid for your current stage." },
      { status: 401 }
    );
  }

  return NextResponse.json({ valid: true });
}
