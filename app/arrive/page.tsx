"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MagicBackground from "@/components/MagicBackground";
import { loadSession, saveSession } from "@/lib/session";
import { getStage, StageId, STAGE_ORDER } from "@/lib/stages";
import { getHouse, House } from "@/lib/houses";
import SlidingPuzzle from "@/components/SlidingPuzzle";
import ChessBoard from "@/components/ChessBoard";
import GamePausedOverlay from "@/components/GamePausedOverlay";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// Tile letters for the Stage 4 puzzle — must match CODE_STAGE_4 in .env.local
const STAGE4_PUZZLE_TILES = ["G", "E", "M", "I", "N", "O"];

type PageState =
  | "validating"
  | "verify-codes"
  | "challenge"
  | "puzzle"
  | "submitting"
  | "success"
  | "error";

// ─── Inner component ──────────────────────────────────────────────────────────

function ArriveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const stageId = searchParams.get("stage") as StageId | null;
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("validating");
  const [errorMsg, setErrorMsg] = useState("");

  // Previous-code verification
  const [pendingVerifications, setPendingVerifications] = useState<StageId[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalToVerify, setTotalToVerify] = useState(0);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Current stage challenge
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [claimedCode, setClaimedCode] = useState("");
  const [house, setHouse] = useState<House | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [puzzleCode, setPuzzleCode] = useState("");

  const [adminSkipNotice, setAdminSkipNotice] = useState<{
    stageCode: string;
    penaltyMinutes: number;
  } | null>(null);
  const [isHousePaused, setIsHousePaused] = useState(false);

  const validated = useRef(false);
  const mountTimeRef = useRef(new Date());

  // ── Step 1: Validate QR arrival token ──────────────────────────
  useEffect(() => {
    if (validated.current) return;
    validated.current = true;

    if (!stageId || !token) {
      setErrorMsg("This QR code is invalid or incomplete.");
      setPageState("error");
      return;
    }

    const session = loadSession();
    if (!session) {
      router.replace("/");
      return;
    }

    const h = getHouse(session.houseId);
    if (h) setHouse(h);

    if (session.currentStage !== stageId) {
      const alreadyDone = session.completedStages.includes(stageId);
      setErrorMsg(
        alreadyDone
          ? "Your team has already completed this stage."
          : "Your team hasn't reached this stage yet. Keep going!"
      );
      setPageState("error");
      return;
    }

    fetch("/api/arrive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, arrivalToken: token }),
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!ok) {
          setErrorMsg(data.error ?? "Invalid QR code.");
          setPageState("error");
          return;
        }

        // Check if previous stage codes need to be verified first
        const completedOrdered = STAGE_ORDER.filter((sid) =>
          session.completedStages.includes(sid) && sid !== "halftime"
        );
        if (completedOrdered.length > 0) {
          setPendingVerifications(completedOrdered);
          setTotalToVerify(completedOrdered.length);
          setPageState("verify-codes");
        } else {
          setPageState("challenge");
        }
      })
      .catch(() => {
        setErrorMsg("Network error. Check your connection and try again.");
        setPageState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for admin events: skip, pause, mark-complete ───────────────────
  useEffect(() => {
    if (!house?.id || !stageId) return;

    // Listen on house doc for pause state
    const houseDocRef = doc(db, "registrations", house.id);
    const unsubDoc = onSnapshot(houseDocRef, (snap) => {
      if (!snap.exists()) return;
      setIsHousePaused(!!snap.data()?.isPaused);
    });

    // Listen for event-driven changes (admin skip, mark-complete)
    const eventsRef = collection(db, "registrations", house.id, "events");
    const q = query(
      eventsRef,
      where("timestamp", ">", Timestamp.fromDate(mountTimeRef.current)),
      orderBy("timestamp", "asc")
    );

    const unsubEvents = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const event = change.doc.data();

        if (event.isAdminSkip && event.stageId === stageId) {
          setAdminSkipNotice({
            stageCode: event.stageCode ?? "",
            penaltyMinutes: event.penaltyMinutes ?? 5,
          });
        }

        // Hunt Master marked final stage complete
        if (event.type === "house_completed" && stageId === "stage-7") {
          const session = loadSession();
          if (session) {
            const updated = {
              ...session,
              currentStage: "stage-7" as StageId,
              completedStages: session.completedStages.includes("stage-7" as StageId)
                  ? session.completedStages
                  : ([...session.completedStages, "stage-7"] as StageId[]),
            };
            saveSession(updated);
          }
          setPageState("success");
          setClaimedCode("");
        }
      });
    });

    return () => {
      unsubDoc();
      unsubEvents();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house?.id, stageId]);

  // Show "Continue" button 4s after success
  useEffect(() => {
    if (pageState !== "success") return;
    const t = setTimeout(() => setShowContinue(true), 4000);
    return () => clearTimeout(t);
  }, [pageState]);

  // ── Step 2: Verify previous stage code ──────────────────────────
  const handleVerifyCode = async () => {
    if (!verifyCode.trim() || pendingVerifications.length === 0) return;
    setVerifyError(null);
    setVerifySubmitting(true);

    const session = loadSession();
    if (!session) { router.replace("/"); return; }

    const verifyingStage = pendingVerifications[0];

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: verifyingStage, code: verifyCode.trim(), houseId: session.houseId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error ?? "Wrong code. Try again.");
        // Audit log — failed verification attempt
        const eventsRef = collection(db, "registrations", session.houseId, "events");
        addDoc(eventsRef, {
          type: "code_attempt",
          stageId: verifyingStage,
          attemptedCode: verifyCode.trim().toUpperCase(),
          solvedBy: session.playerName,
          success: false,
          context: "pre-challenge verification",
          timestamp: serverTimestamp(),
        }).catch(console.error);
        setVerifySubmitting(false);
        return;
      }

      // Correct — advance to next pending or to challenge
      const remaining = pendingVerifications.slice(1);
      setPendingVerifications(remaining);
      setVerifiedCount((n) => n + 1);
      setVerifyCode("");
      setVerifyError(null);
      setVerifySubmitting(false);

      if (remaining.length === 0) {
        setPageState("challenge");
      }
    } catch {
      setVerifyError("Network error. Check your connection.");
      setVerifySubmitting(false);
    }
  };

  // ── Step 3: Submit current stage code ───────────────────────────
  const handleCodeSubmit = async (codeOverride?: string) => {
    const submitCode = (codeOverride ?? code).trim();
    if (!submitCode || !stageId) return;
    setCodeError(null);
    setPageState("submitting");

    const session = loadSession();
    if (!session) { router.replace("/"); return; }

    try {
      const res = await fetch("/api/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          houseId: session.houseId,
          stageId,
          code: submitCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error ?? "Wrong code. Try again.");
        setPageState("challenge");
        const failEventsRef = collection(db, "registrations", session.houseId, "events");
        addDoc(failEventsRef, {
          type: "code_attempt",
          stageId,
          attemptedCode: submitCode.toUpperCase(),
          solvedBy: session.playerName,
          success: false,
          timestamp: serverTimestamp(),
        }).catch(console.error);
        return;
      }

      const nextStageId = data.nextStageId as StageId | undefined;
      const isFinal = !!data.isFinal;
      const newCurrentStage = isFinal ? stageId : (nextStageId ?? stageId);
      const completedStages = session.completedStages.includes(stageId)
        ? session.completedStages
        : [...session.completedStages, stageId];

      saveSession({ ...session, currentStage: newCurrentStage, completedStages });

      const stageData = getStage(stageId);
      const houseDocRef = doc(db, "registrations", session.houseId);
      setDoc(houseDocRef, {
        currentStage: newCurrentStage,
        completedStages,
        lastSeen: new Date().toISOString(),
        lastSolvedBy: session.playerName,
      }, { merge: true })
        .then(() => {
          const eventsRef = collection(db, "registrations", session.houseId, "events");
          return addDoc(eventsRef, {
            type: "stage_advanced",
            stageId,
            stageCode: submitCode.toUpperCase(),
            horcrux: stageData?.horcrux ?? stageId,
            solvedBy: session.playerName,
            timestamp: serverTimestamp(),
          });
        })
        .catch(console.error);

      // Halftime has no "remember your code" screen — go straight to the next clue
      if (stageId === "halftime") {
        window.location.href = "/";
        return;
      }

      setClaimedCode(submitCode.toUpperCase());
      setPageState("success");
    } catch {
      setCodeError("Network error. Check your connection.");
      setPageState("challenge");
    }
  };

  const stageData = stageId ? getStage(stageId) : null;
  const houseColor = house?.colors.primary ?? "#c9a96e";
  const houseGlow = house?.colors.glow ?? "rgba(201,169,110,0.4)";
  const houseSecondary = house?.colors.secondary ?? "#3d2c0a";

  // Data for the stage currently being verified
  const verifyingStageId = pendingVerifications[0] ?? null;
  const verifyingStageData = verifyingStageId ? getStage(verifyingStageId) : null;
  const verifyProgress = totalToVerify > 0 ? verifiedCount + 1 : 1;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <main className="min-h-screen relative z-10 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">

        <AnimatePresence mode="wait">

          {/* ── Validating ──────────────────────────────────────── */}
          {pageState === "validating" && (
            <motion.div
              key="validating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="text-5xl"
              >
                ✦
              </motion.div>
              <p className="font-cinzel text-xs tracking-[0.3em] opacity-40">
                VERIFYING LOCATION…
              </p>
            </motion.div>
          )}

          {/* ── Previous code verification ───────────────────── */}
          {pageState === "verify-codes" && verifyingStageData && (
            <motion.div
              key={`verify-${verifyingStageId}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Header */}
              <div
                className="rounded-sm overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${houseSecondary}60, rgba(10,8,2,0.97))`,
                  border: `1px solid ${houseColor}50`,
                }}
              >
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {house && (
                      <span className="text-2xl select-none" style={{ filter: `drop-shadow(0 0 8px ${houseColor})` }}>
                        {house.emoji}
                      </span>
                    )}
                    <div>
                      <p className="font-cinzel text-xs font-bold tracking-wider" style={{ color: houseColor }}>
                        {house?.name.toUpperCase()}
                      </p>
                      <p className="font-crimson italic text-xs opacity-40">
                        Ministry checkpoint
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-cinzel opacity-40" style={{ fontSize: "0.6rem", letterSpacing: "0.15em" }}>
                      CODE {verifyProgress} OF {totalToVerify}
                    </p>
                    <p className="text-lg">{verifyingStageData.horcruxEmoji}</p>
                  </div>
                </div>
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
              </div>

              {/* Progress dots */}
              {totalToVerify > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: totalToVerify }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i < verifiedCount ? 20 : 8,
                        height: 8,
                        background: i < verifiedCount
                          ? houseColor
                          : i === verifiedCount
                          ? "transparent"
                          : "rgba(255,255,255,0.08)",
                        border: i === verifiedCount
                          ? `1px solid ${houseColor}`
                          : "none",
                        boxShadow: i === verifiedCount ? `0 0 6px ${houseGlow}` : "none",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Verification card */}
              <div
                className="rounded-sm overflow-hidden"
                style={{
                  background: "rgba(8,6,2,0.98)",
                  border: `1px solid rgba(251,191,36,0.3)`,
                  boxShadow: "0 0 30px rgba(251,191,36,0.06)",
                }}
              >
                <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)" }} />
                <div className="px-5 py-6 space-y-4">

                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔐</span>
                    <p className="font-cinzel text-xs tracking-[0.25em] text-yellow-400 font-bold">
                      MEMORY TOLL
                    </p>
                  </div>

                  <p className="font-crimson text-sm leading-relaxed" style={{ color: "rgba(240,217,160,0.75)" }}>
                    Before the challenge is revealed, the Ministry demands proof
                    you have not forgotten what your house has destroyed.
                  </p>

                  <div
                    className="rounded-sm px-4 py-3 flex items-center gap-3"
                    style={{
                      background: `${houseSecondary}25`,
                      border: `1px solid ${houseColor}25`,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{verifyingStageData.horcruxEmoji}</span>
                    <div>
                      <p className="font-cinzel font-bold text-xs tracking-wider" style={{ color: houseColor }}>
                        {verifyingStageData.horcrux}
                      </p>
                      <p className="font-crimson italic text-xs opacity-40">
                        Stage {verifyingStageData.number} · Enter the code your team received
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => {
                      setVerifyCode(e.target.value.toUpperCase());
                      setVerifyError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                    disabled={verifySubmitting}
                    placeholder="CODE"
                    className={`code-input ${verifyError ? "error" : ""}`}
                    autoFocus
                  />

                  <AnimatePresence>
                    {verifyError && (
                      <motion.p
                        key="verify-err"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="error-message"
                      >
                        {verifyError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={handleVerifyCode}
                    disabled={verifySubmitting || !verifyCode.trim()}
                    whileHover={!verifySubmitting && !!verifyCode.trim() ? { scale: 1.02 } : undefined}
                    whileTap={!verifySubmitting && !!verifyCode.trim() ? { scale: 0.97 } : undefined}
                    className="parchment-btn w-full"
                    style={{
                      borderColor: verifyCode.trim() ? "rgba(251,191,36,0.6)" : undefined,
                      boxShadow: verifyCode.trim() ? "0 0 16px rgba(251,191,36,0.15)" : "none",
                    }}
                  >
                    {verifySubmitting ? "Checking…" : "✦ Confirm Code"}
                  </motion.button>
                </div>
                <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)" }} />
              </div>

              {verifiedCount > 0 && (
                <p className="text-center font-crimson italic text-xs opacity-30">
                  {verifiedCount} of {totalToVerify} codes confirmed
                </p>
              )}
            </motion.div>
          )}

          {/* ── Challenge screen ─────────────────────────────── */}
          {(pageState === "challenge" || pageState === "submitting") && stageData && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45 }}
              className="space-y-5"
            >
              {/* House + location confirmed banner */}
              <div
                className="rounded-sm overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${houseSecondary}60, rgba(10,8,2,0.97))`,
                  border: `1px solid ${houseColor}50`,
                  boxShadow: `0 0 30px ${houseGlow}20`,
                }}
              >
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {house && (
                      <span
                        className="text-2xl select-none"
                        style={{ filter: `drop-shadow(0 0 8px ${houseColor})` }}
                      >
                        {house.emoji}
                      </span>
                    )}
                    <div>
                      <p className="font-cinzel text-xs font-bold tracking-wider" style={{ color: houseColor }}>
                        {house?.name.toUpperCase()}
                      </p>
                      <p className="font-crimson italic text-xs opacity-40">
                        Location confirmed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-cinzel text-xs tracking-wider opacity-50" style={{ fontSize: "0.6rem" }}>
                      {stageData.isHalftime ? "CHECKPOINT" : `STAGE ${stageData.number} OF 7`}
                    </p>
                    <p className="text-lg">{stageData.horcruxEmoji}</p>
                  </div>
                </div>
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
              </div>

              {/* Horcrux name */}
              <div className="text-center space-y-1">
                <p className="font-cinzel text-xs tracking-[0.3em] opacity-40">
                  {stageData.isHalftime ? "MINISTRY CHECKPOINT" : "YOU HAVE FOUND"}
                </p>
                <h1
                  className="font-cinzel text-2xl font-bold tracking-wide"
                  style={{ color: houseColor }}
                >
                  {stageData.horcrux}
                </h1>
              </div>

              {/* THE CHALLENGE */}
              <div
                className="rounded-sm px-5 py-5 space-y-3"
                style={{
                  background: "rgba(8,6,2,0.98)",
                  border: `1px solid ${houseColor}35`,
                }}
              >
                <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}50, transparent)`, marginBottom: "1rem" }} />

                <p
                  className="font-cinzel text-xs tracking-[0.3em]"
                  style={{ color: houseColor, opacity: 0.75 }}
                >
                  {stageData.isHalftime ? "⚡ SECOND HALF BEGINS" : "⚔ THE CHALLENGE"}
                </p>
                {stageData.isHalftime ? (
                  <p className="font-crimson text-base leading-relaxed" style={{ color: "rgba(240,217,160,0.9)" }}>
                    Your scavenger team has done an outstanding job — three Horcruxes destroyed.{" "}
                    <span className="font-bold not-italic" style={{ color: houseColor }}>
                      Now it&apos;s your turn to take over.
                    </span>{" "}
                    Enter the house code you were given before the event to unlock the second half of the hunt.
                  </p>
                ) : stageData.challengeSteps ? (
                  <ol className="space-y-2.5" style={{ paddingLeft: 0, listStyle: "none" }}>
                    {stageData.challengeSteps.map((step, i) => (
                      <li key={i} className="flex items-baseline gap-3 font-crimson text-base leading-relaxed" style={{ color: "rgba(240,217,160,0.88)" }}>
                        <span
                          className="font-cinzel font-bold flex-shrink-0"
                          style={{ color: houseColor, fontSize: "0.75rem" }}
                        >
                          {i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-crimson text-base leading-relaxed" style={{ color: "rgba(240,217,160,0.9)" }}>
                    {stageData.challenge}
                  </p>
                )}

                {/* Badger's Riddle (stage 4 key hunt) */}
                {stageData.keyRiddle && stageData.keyRiddle.length > 0 && (
                  <div
                    className="rounded-sm px-4 py-4 space-y-1.5"
                    style={{
                      background: `${houseSecondary}20`,
                      border: `1px solid ${houseColor}30`,
                    }}
                  >
                    <p
                      className="font-cinzel text-xs tracking-[0.2em]"
                      style={{ color: houseColor, opacity: 0.8 }}
                    >
                      🔑 THE BADGER&apos;S RIDDLE
                    </p>
                    {stageData.keyRiddle.map((line, i) => (
                      <p
                        key={i}
                        className="font-crimson italic text-sm leading-relaxed"
                        style={{ color: "rgba(240,217,160,0.75)" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {/* Chess board (stage 5) */}
                {stageData.hasChess && stageData.chessFen && (
                  <>
                    <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}30, transparent)`, margin: "1rem 0" }} />
                    <p
                      className="font-cinzel text-xs tracking-[0.3em]"
                      style={{ color: houseColor, opacity: 0.75 }}
                    >
                      ♟ THE POSITION
                    </p>
                    <div
                      className="rounded-sm p-4"
                      style={{
                        background: "rgba(8,6,2,0.95)",
                        border: `1px solid ${houseColor}30`,
                        boxShadow: `0 0 24px ${houseGlow}15`,
                      }}
                    >
                      <ChessBoard
                        fen={stageData.chessFen}
                        houseColor={houseColor}
                        houseGlow={houseGlow}
                      />
                    </div>
                  </>
                )}

                {!stageData.isHalftime && !stageData.hasPuzzle && !stageData.hasChess && (
                  <>
                    <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}30, transparent)`, margin: "1rem 0" }} />

                    <p
                      className="font-cinzel text-xs tracking-[0.3em]"
                      style={{ color: houseColor, opacity: 0.75 }}
                    >
                      📋 HOW TO GET YOUR CODE
                    </p>
                    <p className="font-crimson text-sm leading-relaxed opacity-70">
                      Complete the challenge above as a team. Once your team is done,
                      your{" "}
                      <span className="font-bold not-italic" style={{ color: houseColor, opacity: 1 }}>
                        Hunt Master will reveal the secret code
                      </span>{" "}
                      for this stage. Enter it below to claim your Horcrux.
                    </p>
                  </>
                )}

                <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}30, transparent)`, margin: "1rem 0" }} />

                {stageData.isPresentation ? (
                  /* ── Final presentation stage — no code input ── */
                  <div className="space-y-3">
                    <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}30, transparent)`, margin: "0.5rem 0" }} />
                    <div
                      className="rounded-sm px-4 py-4 text-center space-y-2"
                      style={{
                        background: `${houseSecondary}20`,
                        border: `1px solid ${houseColor}30`,
                      }}
                    >
                      <motion.p
                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="font-cinzel text-xs tracking-[0.3em]"
                        style={{ color: houseColor }}
                      >
                        ✦ AWAITING HUNT MASTER ✦
                      </motion.p>
                      <p className="font-crimson italic text-sm opacity-60">
                        Complete the presentation above. Your Hunt Master will confirm your house&apos;s completion.
                      </p>
                    </div>
                  </div>
                ) : stageData.hasPuzzle ? (
                  <>
                    <p
                      className="font-cinzel text-xs tracking-[0.3em]"
                      style={{ color: houseColor, opacity: 0.75 }}
                    >
                      🧩 NEXT: TILE PUZZLE
                    </p>
                    <p className="font-crimson text-sm leading-relaxed opacity-70">
                      Once you have Hufflepuff&apos;s Cup in hand, tap below to open the
                      tile puzzle and unlock your stage code.
                    </p>
                    <AnimatePresence>
                      {codeError && (
                        <motion.p
                          key="puzzle-err"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="error-message"
                        >
                          {codeError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <motion.button
                      onClick={() => { setPuzzleCode(""); setPageState("puzzle"); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="parchment-btn w-full"
                      style={{
                        borderColor: `${houseColor}80`,
                        boxShadow: `0 0 20px ${houseGlow}25`,
                      }}
                    >
                      🧩 Reveal the Tile Puzzle
                    </motion.button>
                  </>
                ) : (
                  <>
                    <p
                      className="font-cinzel text-xs tracking-[0.3em]"
                      style={{ color: houseColor, opacity: 0.75 }}
                    >
                      {stageData.isHalftime ? "ENTER YOUR HOUSE CODE" : stageData.isFinal ? "ENTER FINAL CODE" : stageData.hasChess ? "ENTER VOLUNTEER'S CODE" : "ENTER STAGE CODE"}
                    </p>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setCodeError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                      disabled={pageState === "submitting"}
                      placeholder="CODE"
                      className={`code-input ${codeError ? "error" : ""}`}
                    />
                    <AnimatePresence>
                      {codeError && (
                        <motion.p
                          key="err"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="error-message"
                        >
                          {codeError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      onClick={() => handleCodeSubmit()}
                      disabled={pageState === "submitting" || !code.trim()}
                      whileHover={pageState !== "submitting" && !!code.trim() ? { scale: 1.02 } : undefined}
                      whileTap={pageState !== "submitting" && !!code.trim() ? { scale: 0.97 } : undefined}
                      className="parchment-btn w-full"
                      style={{
                        borderColor: code.trim() ? `${houseColor}80` : undefined,
                        boxShadow: code.trim() ? `0 0 20px ${houseGlow}25` : "none",
                      }}
                    >
                      {pageState === "submitting" ? "Verifying…" : stageData.isHalftime ? "⚡ Unlock the Second Half" : stageData.isFinal ? "⚡ End the Hunt" : "⚡ Claim the Horcrux"}
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Tile puzzle screen ───────────────────────────── */}
          {pageState === "puzzle" && stageData && (
            <motion.div
              key="puzzle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45 }}
              className="space-y-5"
            >
              {/* House header */}
              <div
                className="rounded-sm overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${houseSecondary}60, rgba(10,8,2,0.97))`,
                  border: `1px solid ${houseColor}50`,
                  boxShadow: `0 0 30px ${houseGlow}20`,
                }}
              >
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {house && (
                      <span className="text-2xl select-none" style={{ filter: `drop-shadow(0 0 8px ${houseColor})` }}>
                        {house.emoji}
                      </span>
                    )}
                    <div>
                      <p className="font-cinzel text-xs font-bold tracking-wider" style={{ color: houseColor }}>
                        {house?.name.toUpperCase()}
                      </p>
                      <p className="font-crimson italic text-xs opacity-40">Tile puzzle</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-cinzel text-xs tracking-wider opacity-50" style={{ fontSize: "0.6rem" }}>
                      STAGE {stageData.number} OF 7
                    </p>
                    <p className="text-lg">{stageData.horcruxEmoji}</p>
                  </div>
                </div>
                <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
              </div>

              {/* Puzzle card */}
              <div
                className="rounded-sm px-5 py-5 space-y-4"
                style={{
                  background: "rgba(8,6,2,0.98)",
                  border: `1px solid ${houseColor}35`,
                }}
              >
                <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${houseColor}50, transparent)`, marginBottom: "1rem" }} />

                <p
                  className="font-cinzel text-xs tracking-[0.3em]"
                  style={{ color: houseColor, opacity: 0.75 }}
                >
                  🧩 THE VAULT PUZZLE
                </p>
                <p className="font-crimson text-sm leading-relaxed opacity-70">
                  Slide the tiles into the correct arrangement. The golden letter
                  tiles reveal your stage code — read them left to right, row by row.
                </p>

                <SlidingPuzzle
                  codeTiles={STAGE4_PUZZLE_TILES}
                  houseColor={houseColor}
                  houseGlow={houseGlow}
                  onSolved={(solved) => setPuzzleCode(solved)}
                />

                <AnimatePresence>
                  {puzzleCode && (
                    <motion.div
                      key="puzzle-solved"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)", margin: "0.5rem 0" }} />
                      <div
                        className="rounded-sm overflow-hidden"
                        style={{
                          background: "rgba(251,191,36,0.04)",
                          border: "1px solid rgba(251,191,36,0.4)",
                          boxShadow: "0 0 24px rgba(251,191,36,0.08)",
                        }}
                      >
                        <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)" }} />
                        <div className="px-5 py-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✦</span>
                            <p className="font-cinzel text-xs tracking-[0.25em] text-yellow-400 font-bold">
                              PUZZLE SOLVED — CODE REVEALED
                            </p>
                          </div>
                          <div
                            className="rounded-sm py-3 px-4 text-center"
                            style={{
                              background: "rgba(0,0,0,0.5)",
                              border: "1px solid rgba(251,191,36,0.3)",
                            }}
                          >
                            <p
                              className="font-cinzel text-xs tracking-widest opacity-40 mb-1"
                              style={{ fontSize: "0.6rem" }}
                            >
                              YOUR STAGE CODE
                            </p>
                            <p
                              className="font-mono font-bold"
                              style={{
                                fontSize: "1.8rem",
                                color: "#fbbf24",
                                textShadow: "0 0 20px rgba(251,191,36,0.5)",
                                letterSpacing: "0.5em",
                              }}
                            >
                              {puzzleCode}
                            </p>
                          </div>
                          <motion.button
                            onClick={() => handleCodeSubmit(puzzleCode)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="parchment-btn w-full"
                            style={{
                              borderColor: `${houseColor}80`,
                              boxShadow: `0 0 20px ${houseGlow}25`,
                            }}
                          >
                            ⚡ Enter the Vault
                          </motion.button>
                        </div>
                        <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)" }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setPageState("challenge")}
                className="font-cinzel text-xs tracking-widest opacity-25 hover:opacity-50 transition-opacity w-full text-center"
              >
                ← Back to Challenge
              </button>
            </motion.div>
          )}

          {/* ── Success screen ───────────────────────────────── */}
          {pageState === "success" && stageData && (
            stageData.isFinal ? (

              /* ── FINAL STAGE: Voldemort death screen ─────────── */
              <motion.div
                key="success-final"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center"
                style={{ background: "rgba(0,0,0,0.97)" }}
              >
                {/* GIF */}
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                  className="w-full max-w-sm px-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://i.makeagif.com/media/7-02-2015/90B8xw.gif"
                    alt="Voldemort dies"
                    className="w-full rounded-sm"
                    style={{ boxShadow: "0 0 80px rgba(180,30,30,0.5)" }}
                  />
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.7 }}
                  className="text-center space-y-4 px-6 mt-8 max-w-sm"
                >
                  <h1
                    className="font-cinzel font-black tracking-widest"
                    style={{
                      fontSize: "1.6rem",
                      background: "linear-gradient(135deg, #c9a96e 0%, #f0d080 50%, #c9a96e 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Voldemort is now dead.
                  </h1>

                  <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)" }} />

                  <p className="font-crimson italic text-lg leading-relaxed" style={{ color: "rgba(240,217,160,0.75)" }}>
                    But did you kill him first?
                  </p>
                  <p className="font-cinzel text-sm tracking-[0.2em]" style={{ color: "rgba(201,169,110,0.6)" }}>
                    Please occupy your tables.
                  </p>
                </motion.div>
              </motion.div>

            ) : (

              /* ── Regular stage success ───────────────────────── */
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-5"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="rounded-sm overflow-hidden text-center"
                  style={{
                    background: "rgba(8,6,2,0.98)",
                    border: `1px solid ${houseColor}65`,
                    boxShadow: `0 0 60px ${houseGlow}`,
                  }}
                >
                  <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
                  <div className="px-6 py-8 space-y-4">
                    <motion.div
                      className="text-6xl select-none"
                      animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                    >
                      💥
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className="font-cinzel text-xs tracking-[0.4em] opacity-50 mb-1">
                        HORCRUX CLAIMED
                      </p>
                      <h2 className="font-cinzel text-2xl font-bold" style={{ color: houseColor }}>
                        {stageData.horcrux}
                      </h2>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-sm"
                      style={{
                        background: `${houseSecondary}30`,
                        border: `1px solid ${houseColor}25`,
                      }}
                    >
                      <span className="text-xl">📦</span>
                      <p className="font-crimson text-sm leading-snug opacity-80 text-left">
                        Collect your physical{" "}
                        <span className="font-bold not-italic" style={{ color: houseColor }}>
                          Horcrux token
                        </span>{" "}
                        from the Hunt Master before moving on.
                      </p>
                    </motion.div>
                  </div>
                  <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${houseColor}, transparent)` }} />
                </motion.div>

                {/* REMEMBER YOUR CODE */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-sm overflow-hidden"
                  style={{
                    background: "rgba(251,191,36,0.04)",
                    border: "1px solid rgba(251,191,36,0.4)",
                    boxShadow: "0 0 30px rgba(251,191,36,0.08)",
                  }}
                >
                  <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)" }} />
                  <div className="px-5 py-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <p className="font-cinzel text-xs tracking-[0.25em] text-yellow-400 font-bold">
                        REMEMBER THIS CODE
                      </p>
                    </div>
                    <div
                      className="rounded-sm py-4 px-6 text-center"
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(251,191,36,0.3)",
                      }}
                    >
                      <p className="font-cinzel text-xs tracking-widest opacity-40 mb-2" style={{ fontSize: "0.6rem" }}>
                        YOUR STAGE CODE
                      </p>
                      <p
                        className="font-mono font-bold tracking-[0.4em]"
                        style={{
                          fontSize: "2rem",
                          color: "#fbbf24",
                          textShadow: "0 0 20px rgba(251,191,36,0.5)",
                          letterSpacing: "0.5em",
                        }}
                      >
                        {claimedCode}
                      </p>
                    </div>
                    <p className="font-crimson text-sm leading-relaxed" style={{ color: "rgba(240,217,160,0.8)" }}>
                      You will need this code at a future stage. If you arrive
                      without it,{" "}
                      <span className="font-bold not-italic text-yellow-400">
                        your team cannot proceed.
                      </span>{" "}
                      Write it down or screenshot this screen.
                    </p>
                  </div>
                  <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)" }} />
                </motion.div>

                <AnimatePresence>
                  {showContinue && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <motion.button
                        onClick={() => { window.location.href = "/"; }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="parchment-btn w-full"
                        style={{
                          borderColor: `${houseColor}80`,
                          boxShadow: `0 0 20px ${houseGlow}25`,
                        }}
                      >
                        ✦ Reveal the Next Clue
                      </motion.button>
                      <p className="text-center font-crimson italic text-xs opacity-25">
                        Make sure you have noted your code before continuing.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            )
          )}

          {/* ── Error screen ─────────────────────────────────── */}
          {pageState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[60vh] flex flex-col items-center justify-center gap-5"
            >
              <div
                className="rounded-sm px-6 py-8 space-y-4 text-center w-full"
                style={{
                  background: "rgba(229,115,115,0.05)",
                  border: "1px solid rgba(229,115,115,0.25)",
                }}
              >
                <p className="text-4xl">⚠️</p>
                <p className="font-cinzel text-xs tracking-[0.25em] text-red-400">
                  CANNOT PROCEED
                </p>
                <p className="font-crimson italic text-base leading-relaxed opacity-75">
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="font-cinzel text-xs tracking-widest opacity-35 hover:opacity-60 transition-opacity"
              >
                ← Return to the Hunt
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Admin skip overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {adminSkipNotice && (
          <motion.div
            key="admin-skip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm rounded-sm overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #12100a, #1e1a0e)",
                border: "1px solid rgba(251,191,36,0.5)",
                boxShadow: "0 0 60px rgba(251,191,36,0.12), 0 20px 60px rgba(0,0,0,0.9)",
              }}
            >
              <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)" }} />
              <div className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-4xl">🔮</p>
                  <p className="font-cinzel text-sm font-bold tracking-widest text-yellow-400">
                    PUZZLE SKIPPED
                  </p>
                  <p className="font-crimson text-base" style={{ color: "rgba(240,217,160,0.8)" }}>
                    The Hunt Master has skipped the tile puzzle for your house.
                  </p>
                </div>

                <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)" }} />

                <div
                  className="rounded-sm py-3 px-4 text-center space-y-1"
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(251,191,36,0.3)" }}
                >
                  <p className="font-cinzel tracking-widest text-yellow-400/50" style={{ fontSize: "0.6rem" }}>
                    THE ANSWER WAS
                  </p>
                  <p
                    className="font-mono font-bold text-yellow-400"
                    style={{
                      fontSize: "1.75rem",
                      letterSpacing: "0.5em",
                      textShadow: "0 0 16px rgba(251,191,36,0.4)",
                    }}
                  >
                    {adminSkipNotice.stageCode}
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-sm"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
                >
                  <span className="text-sm">⏱</span>
                  <p className="font-cinzel text-xs text-red-400 tracking-wider font-bold">
                    {adminSkipNotice.penaltyMinutes}-MINUTE PENALTY added to your house time
                  </p>
                </div>

                <button
                  onClick={() => { window.location.href = "/"; }}
                  className="parchment-btn w-full"
                  style={{ borderColor: "rgba(251,191,36,0.5)" }}
                >
                  ✦ Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Per-house pause overlay ─────────────────────────────────────────── */}
      <GamePausedOverlay
        paused={isHousePaused}
        houseSpecific
        houseName={house?.name}
      />
    </main>
  );
}

// ─── Page (Suspense wrapper required for useSearchParams) ─────────────────────

export default function ArrivePage() {
  return (
    <>
      <MagicBackground />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-4xl opacity-30">
            ✦
          </div>
        }
      >
        <ArriveContent />
      </Suspense>
    </>
  );
}
