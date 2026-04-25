"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  loadSession,
  saveSession,
  clearSession,
  HouseSession,
} from "@/lib/session";
import { getHouse, House } from "@/lib/houses";
import { StageId, STAGE_ORDER, getStage } from "@/lib/stages";

export interface SyncNotification {
  id: string;
  solvedBy: string;
  horcrux: string;
  stageId: StageId;
  stageCode?: string;
  isAdminSkip?: boolean;
  penaltyMinutes?: number;
}

interface UseHouseSessionReturn {
  session: HouseSession | null;
  house: House | null;
  isLoaded: boolean;
  isRegistered: boolean;
  isHousePaused: boolean;
  advanceToStage: (stageId: StageId) => Promise<void>;
  resetSession: () => void;
  notification: SyncNotification | null;
  dismissNotification: () => void;
}

export function useHouseSession(): UseHouseSessionReturn {
  const [session, setSession] = useState<HouseSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notification, setNotification] = useState<SyncNotification | null>(null);
  const [isHousePaused, setIsHousePaused] = useState(false);
  const sessionStartRef = useRef<Date>(new Date());

  // Load from localStorage on mount; register player name in Firestore members array
  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setIsLoaded(true);

    if (s?.houseId && s?.playerName) {
      const houseDocRef = doc(db, "registrations", s.houseId);
      setDoc(
        houseDocRef,
        { members: arrayUnion(s.playerName) },
        { merge: true }
      ).catch(() => {}); // best-effort, non-blocking
    }
  }, []);

  // onSnapshot: sync highest stage across all devices in the same house
  useEffect(() => {
    if (!session?.houseId) return;

    const houseDocRef = doc(db, "registrations", session.houseId);

    const unsubscribe = onSnapshot(houseDocRef, (snap) => {
      if (!snap.exists()) return;
      const remote = snap.data();
      const remoteStage = remote.currentStage as StageId;

      // Per-house pause
      setIsHousePaused(!!remote.isPaused);

      setSession((current) => {
        if (!current) return current;

        // Admin reset: if resetAt is newer than when this player registered,
        // push them back to stage-1 regardless of local progress
        if (remote.resetAt) {
          const resetAt = new Date(remote.resetAt as string).getTime();
          if (resetAt > current.registeredAt) {
            const reset: HouseSession = {
              ...current,
              currentStage: "stage-1",
              completedStages: [],
              registeredAt: resetAt + 1, // advance past reset so this never fires again
            };
            saveSession(reset);
            return reset;
          }
        }

        // Normal forward sync: take the highest stage
        const localIdx = STAGE_ORDER.indexOf(current.currentStage);
        const remoteIdx = STAGE_ORDER.indexOf(remoteStage);
        if (remoteIdx > localIdx) {
          const updated: HouseSession = {
            ...current,
            currentStage: remoteStage,
            completedStages: remote.completedStages ?? current.completedStages,
          };
          saveSession(updated);
          return updated;
        }
        return current;
      });
    }, (err) => {
      console.error("[sync] onSnapshot error:", err.code, err.message);
    });

    return () => unsubscribe();
  }, [session?.houseId]);

  // onSnapshot: receive notifications when another device advances a stage
  useEffect(() => {
    if (!session?.houseId || !session?.playerName) return;

    const eventsRef = collection(db, "registrations", session.houseId, "events");
    const q = query(
      eventsRef,
      where("timestamp", ">", Timestamp.fromDate(sessionStartRef.current)),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const event = change.doc.data();
        // Don't notify the person who triggered it
        if (event.solvedBy === session.playerName) return;
        setNotification({
          id: change.doc.id,
          solvedBy: event.solvedBy,
          horcrux: event.horcrux,
          stageId: event.stageId as StageId,
          stageCode: event.stageCode as string | undefined,
          isAdminSkip: event.isAdminSkip as boolean | undefined,
          penaltyMinutes: event.penaltyMinutes as number | undefined,
        });
      });
    });

    return () => unsubscribe();
  }, [session?.houseId, session?.playerName]);

  const advanceToStage = useCallback(async (stageId: StageId) => {
    setSession((current) => {
      if (!current) return current;

      const localIdx = STAGE_ORDER.indexOf(current.currentStage);
      const newIdx = STAGE_ORDER.indexOf(stageId);
      const resolvedStageId = STAGE_ORDER[Math.max(localIdx, newIdx)];

      const completed = current.completedStages.includes(resolvedStageId)
        ? current.completedStages
        : [...current.completedStages, resolvedStageId];

      const updated: HouseSession = {
        ...current,
        currentStage: resolvedStageId,
        completedStages: completed,
      };
      saveSession(updated);

      // Write to Firestore asynchronously
      const houseDocRef = doc(db, "registrations", current.houseId);
      setDoc(houseDocRef, {
        currentStage: resolvedStageId,
        completedStages: completed,
        lastSeen: new Date().toISOString(),
        lastSolvedBy: current.playerName,
      }, { merge: true }).then(() => {
        const stageData = getStage(resolvedStageId);
        const eventsRef = collection(db, "registrations", current.houseId, "events");
        return addDoc(eventsRef, {
          type: "stage_advanced",
          stageId: resolvedStageId,
          horcrux: stageData?.horcrux ?? resolvedStageId,
          solvedBy: current.playerName,
          timestamp: serverTimestamp(),
        });
      }).catch((err) => {
        console.error("[useHouseSession] Firestore write failed:", err);
      });

      return updated;
    });
  }, []);

  const resetSession = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const house = session ? getHouse(session.houseId) : null;

  return {
    session,
    house,
    isLoaded,
    isRegistered: session !== null,
    isHousePaused,
    advanceToStage,
    resetSession,
    notification,
    dismissNotification,
  };
}
