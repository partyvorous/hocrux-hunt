import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "";
const HOUSE_IDS = ["gryffindor", "slytherin", "ravenclaw", "hufflepuff"];

function validatePin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return false;
  const pin = req.headers.get("x-admin-pin");
  return pin === ADMIN_PIN;
}

export async function GET(req: NextRequest) {
  if (!ADMIN_PIN) {
    return NextResponse.json(
      { error: "Admin PIN not configured on the server." },
      { status: 500 }
    );
  }
  if (!validatePin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const houses = await Promise.all(
    HOUSE_IDS.map(async (houseId) => {
      const houseDoc = await adminDb
        .collection("registrations")
        .doc(houseId)
        .get();

      const eventsSnap = await adminDb
        .collection("registrations")
        .doc(houseId)
        .collection("events")
        .orderBy("timestamp", "desc")
        .limit(40)
        .get();

      const events = eventsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          houseId,
          type: data.type ?? "stage_advanced",
          stageId: data.stageId ?? "",
          horcrux: data.horcrux ?? "",
          solvedBy: data.solvedBy ?? "",
          attemptedCode: data.attemptedCode ?? null,
          success: data.success ?? null,
          timestamp:
            data.timestamp?.toDate?.()?.toISOString() ??
            new Date().toISOString(),
        };
      });

      return {
        houseId,
        registered: houseDoc.exists,
        data: houseDoc.exists
          ? {
              currentStage: houseDoc.data()?.currentStage ?? "stage-1",
              completedStages: houseDoc.data()?.completedStages ?? [],
              members: houseDoc.data()?.members ?? [],
              lastSolvedBy: houseDoc.data()?.lastSolvedBy ?? null,
              lastSeen: houseDoc.data()?.lastSeen ?? null,
              isPaused: houseDoc.data()?.isPaused ?? false,
              isCompleted: houseDoc.data()?.isCompleted ?? false,
            }
          : null,
        events,
      };
    })
  );

  return NextResponse.json({ houses });
}
