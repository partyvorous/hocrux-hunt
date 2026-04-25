import type { HouseId } from "./houses";
import type { StageId } from "./stages";

export interface HouseSession {
  houseId: HouseId;
  houseName: string;
  playerName: string;
  registeredAt: number;
  currentStage: StageId;
  completedStages: StageId[];
}

const SESSION_KEY = "hocrux-hunt-session";

export function saveSession(session: HouseSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable
  }
}

export function loadSession(): HouseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HouseSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function updateSessionStage(stageId: StageId): void {
  const session = loadSession();
  if (!session) return;
  const completed = session.completedStages.includes(stageId)
    ? session.completedStages
    : [...session.completedStages, stageId];
  saveSession({ ...session, currentStage: stageId, completedStages: completed });
}
