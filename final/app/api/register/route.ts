import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Access codes are stored server-side only — never exposed to client
const HOUSE_CODES: Record<string, string> = {
  gryffindor: process.env.CODE_GRYFFINDOR ?? "",
  slytherin: process.env.CODE_SLYTHERIN ?? "",
  ravenclaw: process.env.CODE_RAVENCLAW ?? "",
  hufflepuff: process.env.CODE_HUFFLEPUFF ?? "",
};

const VALID_HOUSES = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { houseId, code } = body as { houseId?: string; code?: string };

    // Validate inputs
    if (!houseId || !VALID_HOUSES.includes(houseId)) {
      return NextResponse.json(
        { error: "Invalid house selection." },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Access code is required." },
        { status: 400 }
      );
    }

    const expectedCode = HOUSE_CODES[houseId];

    if (!expectedCode) {
      return NextResponse.json(
        { error: "House codes are not configured. Contact the Hunt Master." },
        { status: 500 }
      );
    }

    // Case-insensitive comparison
    if (code.trim().toUpperCase() !== expectedCode.toUpperCase()) {
      return NextResponse.json(
        {
          error:
            "Incorrect access code. The Ministry denies your entry. Check with your house captain.",
        },
        { status: 401 }
      );
    }

    // Record registration in Firestore
    const registrationRef = adminDb.collection("registrations").doc(houseId);
    const existing = await registrationRef.get();

    if (existing.exists) {
      // Already registered — just return success (idempotent)
      return NextResponse.json({ success: true, houseId, alreadyRegistered: true });
    }

    await registrationRef.set({
      houseId,
      registeredAt: new Date().toISOString(),
      currentStage: "stage-1",
      completedStages: [],
      lastSeen: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, houseId });
  } catch (err) {
    console.error("[register] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
