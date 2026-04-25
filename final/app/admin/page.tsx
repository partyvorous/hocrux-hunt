"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MagicBackground from "@/components/MagicBackground";
import MinistrySeal from "@/components/MinistrySeal";
import { HOUSE_LIST, getHouse, HouseId } from "@/lib/houses";
import { getStage, STAGE_ORDER } from "@/lib/stages";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameStatus = "idle" | "started" | "paused" | "stopped";

interface EventEntry {
  id: string;
  houseId: string;
  type: string;
  stageId: string;
  horcrux: string;
  solvedBy: string;
  attemptedCode?: string | null;
  success?: boolean | null;
  timestamp: string;
}

interface HouseInfo {
  houseId: string;
  registered: boolean;
  data: {
    currentStage: string;
    completedStages: string[];
    members: string[];
    lastSolvedBy: string | null;
    lastSeen: string | null;
    isPaused: boolean;
    isCompleted: boolean;
  } | null;
  events: EventEntry[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  // Auth
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Dashboard data
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [housesData, setHousesData] = useState<HouseInfo[]>([]);
  const [allEvents, setAllEvents] = useState<EventEntry[]>([]);
  const [controlLoading, setControlLoading] = useState<GameStatus | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Reset state
  const [confirmReset, setConfirmReset] = useState<string | null>(null); // houseId awaiting confirm
  const [resetting, setResetting] = useState<string | null>(null);       // houseId being reset

  // Skip puzzle state
  const [confirmSkipPuzzle, setConfirmSkipPuzzle] = useState<string | null>(null);
  const [skippingPuzzle, setSkippingPuzzle] = useState<string | null>(null);

  // Stage change state
  const [stagePickerHouse, setStagePickerHouse] = useState<string | null>(null);
  const [stagingTo, setStagingTo] = useState<Record<string, string>>({});
  const [settingStage, setSettingStage] = useState<string | null>(null);

  // Per-house pause state
  const [pausingHouse, setPausingHouse] = useState<string | null>(null);

  // Mark completed state
  const [confirmMarkComplete, setConfirmMarkComplete] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async (p: string): Promise<boolean> => {
    try {
      const headers = { "x-admin-pin": p };
      const [dataRes, stateRes] = await Promise.all([
        fetch("/api/admin/data", { headers }),
        fetch("/api/admin/gamestate", { headers }),
      ]);

      if (!dataRes.ok) return false;

      const [data, stateData] = await Promise.all([
        dataRes.json(),
        stateRes.ok ? stateRes.json() : Promise.resolve({ status: "idle" }),
      ]);

      const houses: HouseInfo[] = data.houses ?? [];
      setHousesData(houses);
      setGameStatus(stateData.status ?? "idle");

      // Combine and sort all events across houses
      const combined: EventEntry[] = [];
      for (const h of houses) combined.push(...(h.events ?? []));
      combined.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAllEvents(combined);
      setLastRefreshed(new Date());
      return true;
    } catch {
      return false;
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setCheckingSession(false);
      return;
    }
    const stored = sessionStorage.getItem("admin_pin");
    if (!stored) {
      setCheckingSession(false);
      return;
    }
    fetchData(stored).then((ok) => {
      if (ok) {
        setSavedPin(stored);
        setPin(stored);
        setIsAuthenticated(true);
      } else {
        sessionStorage.removeItem("admin_pin");
      }
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!isAuthenticated || !savedPin) return;
    intervalRef.current = setInterval(() => fetchData(savedPin), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, savedPin, fetchData]);

  // ─── Auth ───────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!pin.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    const ok = await fetchData(pin.trim());
    if (ok) {
      setSavedPin(pin.trim());
      sessionStorage.setItem("admin_pin", pin.trim());
      setIsAuthenticated(true);
    } else {
      setAuthError("The Ministry denies your access. Invalid PIN.");
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_pin");
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsAuthenticated(false);
    setSavedPin("");
    setPin("");
  };

  // ─── Game controls ──────────────────────────────────────────────────────────

  const handleGameControl = async (status: GameStatus) => {
    setControlLoading(status);
    try {
      const res = await fetch("/api/admin/gamestate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": savedPin,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setGameStatus(status);
    } finally {
      setControlLoading(null);
    }
  };

  // ─── Set stage ──────────────────────────────────────────────────────────────

  const handleSetStage = async (houseId: string) => {
    const stageId = stagingTo[houseId];
    if (!stageId) return;
    setSettingStage(houseId);
    setStagePickerHouse(null);
    try {
      await fetch("/api/admin/set-stage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": savedPin,
        },
        body: JSON.stringify({ houseId, stageId }),
      });
      await fetchData(savedPin);
    } finally {
      setSettingStage(null);
    }
  };

  // ─── Skip puzzle ────────────────────────────────────────────────────────────

  const handleSkipPuzzle = async (houseId: string) => {
    setSkippingPuzzle(houseId);
    setConfirmSkipPuzzle(null);
    try {
      await fetch("/api/admin/skip-puzzle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": savedPin,
        },
        body: JSON.stringify({ houseId }),
      });
      await fetchData(savedPin);
    } finally {
      setSkippingPuzzle(null);
    }
  };

  // ─── Per-house pause / resume ───────────────────────────────────────────────

  const handlePauseHouse = async (houseId: string, pause: boolean) => {
    setPausingHouse(houseId);
    try {
      await fetch("/api/admin/pause-house", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": savedPin },
        body: JSON.stringify({ houseId, pause }),
      });
      await fetchData(savedPin);
    } finally {
      setPausingHouse(null);
    }
  };

  // ─── Mark final stage complete ──────────────────────────────────────────────

  const handleMarkComplete = async (houseId: string) => {
    setMarkingComplete(houseId);
    setConfirmMarkComplete(null);
    try {
      await fetch("/api/admin/mark-completed", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": savedPin },
        body: JSON.stringify({ houseId }),
      });
      await fetchData(savedPin);
    } finally {
      setMarkingComplete(null);
    }
  };

  // ─── House reset ────────────────────────────────────────────────────────────

  const handleReset = async (houseId: string) => {
    setResetting(houseId);
    setConfirmReset(null);
    try {
      await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": savedPin,
        },
        body: JSON.stringify({ houseId }),
      });
      await fetchData(savedPin);
    } finally {
      setResetting(null);
    }
  };

  // ─── Loading state while checking stored session ─────────────────────────

  if (checkingSession) {
    return (
      <>
        <MagicBackground />
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="text-4xl"
          >
            ✦
          </motion.div>
        </div>
      </>
    );
  }

  // ─── PIN screen ────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <>
        <MagicBackground />
        <div className="min-h-screen relative z-10 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-sm p-8 space-y-6"
              style={{
                background:
                  "linear-gradient(160deg, rgba(15,12,5,0.97) 0%, rgba(10,8,2,0.99) 100%)",
                border: "1px solid rgba(201,169,110,0.3)",
                boxShadow:
                  "0 0 60px rgba(201,169,110,0.05), inset 0 0 60px rgba(201,169,110,0.02)",
              }}
            >
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <MinistrySeal size={80} animate={false} />
                </div>
                <h1
                  className="font-cinzel text-xl font-bold tracking-wider"
                  style={{ color: "#c9a96e" }}
                >
                  Hunt Master
                </h1>
                <p className="font-crimson italic text-sm opacity-50">
                  Administrative Access · Ministry Classified
                </p>
              </div>

              <div className="divider-magic" />

              <div className="space-y-3">
                <label className="label-parchment">Admin PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setAuthError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••"
                  className="code-input"
                  autoFocus
                />
                <AnimatePresence>
                  {authError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-xs text-center font-crimson italic"
                    >
                      {authError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleLogin}
                disabled={authLoading || !pin.trim()}
                className="w-full py-3 font-cinzel text-sm tracking-widest transition-all duration-200 rounded-sm"
                style={{
                  background:
                    authLoading || !pin.trim()
                      ? "rgba(201,169,110,0.08)"
                      : "linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.1))",
                  border: "1px solid rgba(201,169,110,0.4)",
                  color: "#c9a96e",
                  opacity: authLoading || !pin.trim() ? 0.5 : 1,
                }}
              >
                {authLoading ? "VERIFYING..." : "✦ ENTER ✦"}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  const statusConfig: Record<
    GameStatus,
    { label: string; color: string; glow: string }
  > = {
    idle: { label: "IDLE", color: "#888888", glow: "rgba(136,136,136,0.4)" },
    started: {
      label: "LIVE",
      color: "#4ade80",
      glow: "rgba(74,222,128,0.4)",
    },
    paused: {
      label: "PAUSED",
      color: "#fbbf24",
      glow: "rgba(251,191,36,0.4)",
    },
    stopped: {
      label: "STOPPED",
      color: "#f87171",
      glow: "rgba(248,113,113,0.4)",
    },
  };
  const sc = statusConfig[gameStatus];

  return (
    <>
      <MagicBackground />
      <main className="min-h-screen relative z-10 px-4 py-6 max-w-4xl mx-auto space-y-5">

        {/* ─── Header ─── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <MinistrySeal size={44} animate={false} />
            <div>
              <h1
                className="font-cinzel text-lg font-bold"
                style={{ color: "#c9a96e" }}
              >
                Hunt Master
              </h1>
              <p className="font-cinzel text-xs tracking-[0.25em] opacity-40">
                DASHBOARD
              </p>
            </div>
          </div>

          <div className="text-right space-y-1">
            {lastRefreshed && (
              <p className="font-crimson italic text-xs opacity-30">
                ↻ {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={handleLogout}
              className="font-cinzel text-xs tracking-wider opacity-30 hover:opacity-60 transition-opacity"
            >
              Sign Out
            </button>
          </div>
        </motion.header>

        <div className="divider-magic" />

        {/* ─── Game Controls ─── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div
            className="rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{
              background: `linear-gradient(135deg, ${sc.glow.replace("0.4", "0.06")}, rgba(10,8,2,0.98))`,
              border: `1px solid ${sc.color}30`,
            }}
          >
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={{
                  opacity: gameStatus === "started" ? [0.5, 1, 0.5] : 1,
                  scale: gameStatus === "started" ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 1.5,
                  repeat: gameStatus === "started" ? Infinity : 0,
                }}
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: sc.color,
                  boxShadow: `0 0 10px ${sc.glow}`,
                }}
              />
              <div>
                <span
                  className="font-cinzel text-sm font-bold tracking-widest"
                  style={{ color: sc.color }}
                >
                  {sc.label}
                </span>
                <p className="font-crimson italic text-xs opacity-40">
                  {gameStatus === "idle" && "Hunt not yet started"}
                  {gameStatus === "started" && "Hunt is running · Players can proceed"}
                  {gameStatus === "paused" && "All player screens are showing pause overlay"}
                  {gameStatus === "stopped" && "Hunt has ended"}
                </p>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-2 flex-wrap">
              <ControlButton
                label={gameStatus === "paused" ? "Resume" : "Start"}
                icon="▶"
                color="#4ade80"
                active={gameStatus === "started"}
                disabled={
                  gameStatus === "started" || controlLoading !== null
                }
                loading={controlLoading === "started"}
                onClick={() => handleGameControl("started")}
              />
              <ControlButton
                label="Pause"
                icon="⏸"
                color="#fbbf24"
                active={gameStatus === "paused"}
                disabled={
                  gameStatus !== "started" || controlLoading !== null
                }
                loading={controlLoading === "paused"}
                onClick={() => handleGameControl("paused")}
              />
              <ControlButton
                label="Stop"
                icon="⏹"
                color="#f87171"
                active={gameStatus === "stopped"}
                disabled={
                  gameStatus === "idle" ||
                  gameStatus === "stopped" ||
                  controlLoading !== null
                }
                loading={controlLoading === "stopped"}
                onClick={() => handleGameControl("stopped")}
              />
            </div>
          </div>
        </motion.section>

        <div className="divider-magic" />

        {/* ─── House Progress ─── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="font-cinzel text-xs tracking-[0.3em] opacity-50">
            HOUSE PROGRESS
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {HOUSE_LIST.map((house, i) => {
              const info = housesData.find((h) => h.houseId === house.id);
              const members = info?.data?.members ?? [];
              const completed = (info?.data?.completedStages ?? []).filter((s: string) => s !== "halftime").length;
              const totalStages = STAGE_ORDER.filter((s) => s !== "halftime").length;
              const currentStage = info?.data?.currentStage;
              const stageName = currentStage
                ? getStage(currentStage)?.title ?? currentStage
                : null;

              return (
                <motion.div
                  key={house.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="rounded-sm p-4 space-y-3"
                  style={{
                    background: `linear-gradient(160deg, ${house.colors.secondary}25 0%, rgba(10,8,2,0.96) 100%)`,
                    border: `1px solid ${
                      info?.registered
                        ? house.colors.primary + "50"
                        : "rgba(201,169,110,0.12)"
                    }`,
                    boxShadow: info?.registered
                      ? `0 0 20px ${house.colors.glow}15`
                      : "none",
                  }}
                >
                  {/* House header */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{house.emoji}</span>
                    <div>
                      <p
                        className="font-cinzel text-xs font-bold tracking-wider"
                        style={{ color: house.colors.primary }}
                      >
                        {house.name.toUpperCase()}
                      </p>
                      <p className="font-crimson italic text-xs opacity-40">
                        {info?.registered
                          ? `${members.length} player${members.length !== 1 ? "s" : ""}`
                          : "Not registered"}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {info?.registered && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span
                          className="font-cinzel opacity-50"
                          style={{ fontSize: "0.6rem" }}
                        >
                          {completed}/{totalStages} STAGES
                        </span>
                        <span
                          className="font-cinzel opacity-50"
                          style={{ fontSize: "0.6rem" }}
                        >
                          {Math.round((completed / totalStages) * 100)}%
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(completed / totalStages) * 100}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ background: house.colors.primary }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current stage */}
                  {info?.registered && stageName && (
                    <p
                      className="font-crimson italic leading-tight"
                      style={{ fontSize: "0.7rem", opacity: 0.55 }}
                    >
                      Attempting: {stageName}
                    </p>
                  )}

                  {/* Members */}
                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {members.slice(0, 6).map((name) => (
                        <span
                          key={name}
                          className="font-cinzel px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: `${house.colors.primary}15`,
                            border: `1px solid ${house.colors.primary}28`,
                            color: house.colors.text,
                            fontSize: "0.58rem",
                          }}
                        >
                          {name}
                        </span>
                      ))}
                      {members.length > 6 && (
                        <span
                          className="font-cinzel opacity-35"
                          style={{ fontSize: "0.58rem", alignSelf: "center" }}
                        >
                          +{members.length - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Last solved */}
                  {info?.data?.lastSolvedBy && (
                    <p
                      className="font-crimson italic opacity-35"
                      style={{ fontSize: "0.68rem" }}
                    >
                      Last: {info.data.lastSolvedBy}
                    </p>
                  )}

                  {/* ── Stage change control ── */}
                  {info?.registered && (
                    <div
                      style={{
                        borderTop: `1px solid ${house.colors.primary}20`,
                        paddingTop: "0.6rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {settingStage === house.id ? (
                          <motion.p
                            key="setting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-cinzel text-xs opacity-40 text-center tracking-wider"
                            style={{ fontSize: "0.6rem" }}
                          >
                            Changing stage…
                          </motion.p>
                        ) : stagePickerHouse === house.id ? (
                          <motion.div
                            key="picker"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                          >
                            <select
                              value={stagingTo[house.id] ?? info.data?.currentStage ?? "stage-1"}
                              onChange={(e) =>
                                setStagingTo((prev) => ({ ...prev, [house.id]: e.target.value }))
                              }
                              className="w-full font-cinzel text-xs py-1 px-2 rounded-sm"
                              style={{
                                background: "rgba(10,8,2,0.95)",
                                border: `1px solid ${house.colors.primary}40`,
                                color: house.colors.primary,
                                fontSize: "0.6rem",
                                outline: "none",
                              }}
                            >
                              {STAGE_ORDER.map((sid) => {
                                const s = getStage(sid);
                                return (
                                  <option key={sid} value={sid}>
                                    {s?.isHalftime ? "Halftime" : `Stage ${s?.number}`} — {s?.title ?? sid}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSetStage(house.id)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: `${house.colors.primary}18`,
                                  border: `1px solid ${house.colors.primary}50`,
                                  color: house.colors.primary,
                                  fontSize: "0.6rem",
                                }}
                              >
                                Move
                              </button>
                              <button
                                onClick={() => setStagePickerHouse(null)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="change-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                              setStagingTo((prev) => ({
                                ...prev,
                                [house.id]: info.data?.currentStage ?? "stage-1",
                              }));
                              setStagePickerHouse(house.id);
                            }}
                            className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                            style={{
                              background: `${house.colors.primary}08`,
                              border: `1px solid ${house.colors.primary}25`,
                              color: `${house.colors.primary}70`,
                              fontSize: "0.6rem",
                            }}
                          >
                            ⟿ Change Stage
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── Per-house pause / resume ── */}
                  {info?.registered && !info.data?.isCompleted && (
                    <div
                      style={{
                        borderTop: `1px solid rgba(251,191,36,0.15)`,
                        paddingTop: "0.6rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {pausingHouse === house.id ? (
                        <p
                          className="font-cinzel text-xs opacity-40 text-center tracking-wider"
                          style={{ fontSize: "0.6rem" }}
                        >
                          {info.data?.isPaused ? "Resuming…" : "Pausing…"}
                        </p>
                      ) : info.data?.isPaused ? (
                        <button
                          onClick={() => handlePauseHouse(house.id, false)}
                          className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                          style={{
                            background: "rgba(74,222,128,0.08)",
                            border: "1px solid rgba(74,222,128,0.35)",
                            color: "rgba(74,222,128,0.8)",
                            fontSize: "0.6rem",
                          }}
                        >
                          ▶ Resume House
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePauseHouse(house.id, true)}
                          className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                          style={{
                            background: "rgba(251,191,36,0.05)",
                            border: "1px solid rgba(251,191,36,0.22)",
                            color: "rgba(251,191,36,0.6)",
                            fontSize: "0.6rem",
                          }}
                        >
                          ⏸ Pause House
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Skip puzzle control — only visible on stage-4 ── */}
                  {info?.registered && info.data?.currentStage === "stage-4" && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(251,191,36,0.2)",
                        paddingTop: "0.6rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {skippingPuzzle === house.id ? (
                          <motion.p
                            key="skipping"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-cinzel text-xs opacity-40 text-center tracking-wider"
                            style={{ fontSize: "0.6rem" }}
                          >
                            Skipping puzzle…
                          </motion.p>
                        ) : confirmSkipPuzzle === house.id ? (
                          <motion.div
                            key="confirm-skip"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                          >
                            <p
                              className="font-cinzel text-xs text-center tracking-wider"
                              style={{ color: "#fbbf24", fontSize: "0.6rem" }}
                            >
                              Skip puzzle? +5 min penalty
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSkipPuzzle(house.id)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: "rgba(251,191,36,0.12)",
                                  border: "1px solid rgba(251,191,36,0.45)",
                                  color: "#fbbf24",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Yes, Skip
                              </button>
                              <button
                                onClick={() => setConfirmSkipPuzzle(null)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="skip-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmSkipPuzzle(house.id)}
                            className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                            style={{
                              background: "rgba(251,191,36,0.05)",
                              border: "1px solid rgba(251,191,36,0.22)",
                              color: "rgba(251,191,36,0.55)",
                              fontSize: "0.6rem",
                            }}
                          >
                            ⟿ Skip Tile Puzzle
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── Mark complete — only visible on stage-7 or if already completed ── */}
                  {info?.registered && (info.data?.currentStage === "stage-7" || info.data?.isCompleted) && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(74,222,128,0.2)",
                        paddingTop: "0.6rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {info.data?.isCompleted ? (
                          <motion.p
                            key="completed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-cinzel text-xs text-center tracking-wider"
                            style={{ color: "#4ade80", fontSize: "0.6rem" }}
                          >
                            ✓ Hunt Complete
                          </motion.p>
                        ) : markingComplete === house.id ? (
                          <motion.p
                            key="marking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-cinzel text-xs opacity-40 text-center tracking-wider"
                            style={{ fontSize: "0.6rem" }}
                          >
                            Marking complete…
                          </motion.p>
                        ) : confirmMarkComplete === house.id ? (
                          <motion.div
                            key="confirm-complete"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                          >
                            <p
                              className="font-cinzel text-xs text-center tracking-wider"
                              style={{ color: "#4ade80", fontSize: "0.6rem" }}
                            >
                              Mark {house.name} as finished?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleMarkComplete(house.id)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: "rgba(74,222,128,0.12)",
                                  border: "1px solid rgba(74,222,128,0.45)",
                                  color: "#4ade80",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Yes, Complete
                              </button>
                              <button
                                onClick={() => setConfirmMarkComplete(null)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm"
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="complete-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmMarkComplete(house.id)}
                            className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                            style={{
                              background: "rgba(74,222,128,0.08)",
                              border: "1px solid rgba(74,222,128,0.3)",
                              color: "rgba(74,222,128,0.7)",
                              fontSize: "0.6rem",
                            }}
                          >
                            ✦ Mark Hunt Complete
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── Reset controls ── */}
                  {info?.registered && (
                    <div
                      style={{
                        borderTop: `1px solid ${house.colors.primary}20`,
                        paddingTop: "0.6rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {resetting === house.id ? (
                          <motion.p
                            key="resetting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-cinzel text-xs opacity-40 text-center tracking-wider"
                            style={{ fontSize: "0.6rem" }}
                          >
                            Resetting…
                          </motion.p>
                        ) : confirmReset === house.id ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                          >
                            <p
                              className="font-cinzel text-xs text-center tracking-wider"
                              style={{ color: "#f87171", fontSize: "0.6rem" }}
                            >
                              Reset all progress?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleReset(house.id)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm transition-colors"
                                style={{
                                  background: "rgba(248,113,113,0.15)",
                                  border: "1px solid rgba(248,113,113,0.4)",
                                  color: "#f87171",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Yes, Reset
                              </button>
                              <button
                                onClick={() => setConfirmReset(null)}
                                className="flex-1 font-cinzel text-xs py-1 rounded-sm transition-colors"
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="reset-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmReset(house.id)}
                            className="w-full font-cinzel text-xs py-1 rounded-sm transition-all"
                            style={{
                              background: "rgba(248,113,113,0.06)",
                              border: "1px solid rgba(248,113,113,0.2)",
                              color: "rgba(248,113,113,0.5)",
                              fontSize: "0.6rem",
                            }}
                          >
                            ↺ Reset to Start
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <div className="divider-magic" />

        {/* ─── Activity Log ─── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-cinzel text-xs tracking-[0.3em] opacity-50">
              ACTIVITY LOG
            </h2>
            <span className="font-crimson italic text-xs opacity-30">
              {allEvents.length} event{allEvents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {allEvents.length === 0 ? (
            <p className="font-crimson italic text-sm opacity-30 text-center py-10">
              No activity yet. The Hunt awaits…
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {allEvents.map((event) => {
                const house = getHouse(event.houseId as HouseId);
                const stage = getStage(event.stageId);
                const time = new Date(event.timestamp);
                const timeStr = time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                const isFailedAttempt = event.type === "code_attempt" && event.success === false;

                return (
                  <motion.div
                    key={`${event.houseId}-${event.id}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 p-3 rounded-sm"
                    style={
                      isFailedAttempt
                        ? {
                            background: "rgba(251,191,36,0.04)",
                            border: "1px solid rgba(251,191,36,0.18)",
                          }
                        : {
                            background: house
                              ? `${house.colors.secondary}12`
                              : "rgba(255,255,255,0.02)",
                            border: `1px solid ${
                              house
                                ? house.colors.primary + "22"
                                : "rgba(255,255,255,0.06)"
                            }`,
                          }
                    }
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {isFailedAttempt ? "⚠" : (stage?.horcruxEmoji ?? "✦")}
                    </span>

                    <div className="flex-1 min-w-0">
                      {isFailedAttempt ? (
                        <p className="font-crimson text-sm leading-snug">
                          <span
                            className="font-bold"
                            style={{ color: house?.colors.primary ?? "#c9a96e" }}
                          >
                            {event.solvedBy}
                          </span>{" "}
                          from{" "}
                          <span style={{ color: house?.colors.primary ?? "#c9a96e" }}>
                            {house?.name ?? event.houseId}
                          </span>{" "}
                          <span className="text-yellow-400/80">tried wrong code</span>{" "}
                          <span
                            className="font-mono font-bold text-yellow-400"
                            style={{ letterSpacing: "0.1em" }}
                          >
                            {event.attemptedCode}
                          </span>
                          {stage && (
                            <span className="opacity-40"> · {stage.title}</span>
                          )}
                        </p>
                      ) : (
                        <p className="font-crimson text-sm leading-snug">
                          <span
                            className="font-bold"
                            style={{ color: house?.colors.primary ?? "#c9a96e" }}
                          >
                            {event.solvedBy}
                          </span>{" "}
                          from{" "}
                          <span
                            style={{ color: house?.colors.primary ?? "#c9a96e" }}
                          >
                            {house?.name ?? event.houseId}
                          </span>{" "}
                          destroyed{" "}
                          <span className="italic opacity-75">
                            {event.horcrux}
                          </span>
                          {stage && (
                            <span className="opacity-40"> · {stage.title}</span>
                          )}
                        </p>
                      )}
                    </div>

                    <span
                      className="font-cinzel opacity-30 flex-shrink-0 text-right tabular-nums"
                      style={{ fontSize: "0.58rem" }}
                    >
                      {timeStr}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        <div className="pb-8" />
      </main>
    </>
  );
}

// ─── ControlButton ─────────────────────────────────────────────────────────────

function ControlButton({
  label,
  icon,
  color,
  active,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  icon: string;
  color: string;
  active: boolean;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.05 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.95 } : undefined}
      className="flex items-center gap-1.5 px-3 py-2 font-cinzel text-xs tracking-wider transition-colors rounded-sm"
      style={{
        background: active ? `${color}22` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? color + "80" : "rgba(255,255,255,0.12)"}`,
        color: active ? color : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
        boxShadow: active ? `0 0 14px ${color}30` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span>{loading ? "…" : icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}
