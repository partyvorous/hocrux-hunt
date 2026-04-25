"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { House } from "@/lib/houses";
import { Stage, StageId, STAGE_ORDER } from "@/lib/stages";

interface ClueRevealProps {
  house: House;
  stage: Stage;
  // kept for compatibility — stage advance now happens via /arrive QR route
  onAdvance: (stageId: StageId) => Promise<void>;
}

export default function ClueReveal({ house, stage }: ClueRevealProps) {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage.id]);

  const currentIdx = STAGE_ORDER.indexOf(stage.id);

  const horcruxLabel = stage.isHalftime
    ? "MINISTRY CHECKPOINT"
    : stage.isFinal
    ? "HORCRUX VII · FINAL"
    : `HORCRUX ${["I", "II", "III", "IV", "V", "VI"][stage.number - 1] ?? stage.number} · STAGE ${stage.number} OF 7`;

  return (
    <motion.div
      ref={topRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >

      {/* ── House + Stage header ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xl select-none"
            style={{ filter: `drop-shadow(0 0 8px ${house.colors.primary})` }}
          >
            {house.emoji}
          </span>
          <span
            className="font-cinzel text-xs font-bold tracking-wider"
            style={{ color: house.colors.primary }}
          >
            {house.name.toUpperCase()}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 items-center">
          {STAGE_ORDER.map((sid, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isHalf = sid === "halftime";
            return (
              <div
                key={sid}
                style={{
                  width: isHalf ? 16 : 8,
                  height: 8,
                  borderRadius: 2,
                  background: isDone
                    ? house.colors.primary
                    : isCurrent
                    ? "transparent"
                    : "rgba(255,255,255,0.08)",
                  border: isCurrent
                    ? `1px solid ${house.colors.primary}`
                    : isDone
                    ? "none"
                    : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: isCurrent ? `0 0 6px ${house.colors.glow}` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isHalf && (
                  <span
                    style={{
                      fontSize: "0.4rem",
                      fontFamily: "var(--font-cinzel)",
                      color:
                        isDone || isCurrent
                          ? house.colors.primary
                          : "rgba(255,255,255,0.2)",
                    }}
                  >
                    H
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${house.colors.primary}40, transparent)`,
        }}
      />

      {/* ── Horcrux identity ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center space-y-1"
      >
        <p className="font-cinzel text-xs tracking-[0.3em] opacity-40">
          {horcruxLabel}
        </p>
        <div className="flex items-center justify-center gap-3">
          <motion.span
            className="text-4xl select-none"
            animate={{
              filter: [
                `drop-shadow(0 0 8px ${house.colors.primary}60)`,
                `drop-shadow(0 0 22px ${house.colors.primary})`,
                `drop-shadow(0 0 8px ${house.colors.primary}60)`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {stage.horcruxEmoji}
          </motion.span>
          <h2
            className="font-cinzel text-xl font-bold tracking-wide"
            style={{ color: house.colors.primary }}
          >
            {stage.horcrux}
          </h2>
        </div>
      </motion.div>

      {/* ── THE RIDDLE — star of the show ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="rounded-sm overflow-hidden"
        style={{
          background: "rgba(8,6,2,0.97)",
          border: `1px solid ${house.colors.primary}55`,
          boxShadow: `0 0 40px ${house.colors.glow}25, inset 0 0 50px rgba(0,0,0,0.6)`,
        }}
      >
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${house.colors.primary}, transparent)`,
          }}
        />
        <div className="px-6 py-7 space-y-3 text-center">
          <p
            className="font-cinzel text-xs tracking-[0.4em] mb-5"
            style={{ color: house.colors.primary, opacity: 0.6 }}
          >
            ✦ FIND THE HORCRUX ✦
          </p>

          {stage.riddleLines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.3, duration: 0.5 }}
              className="font-cinzel leading-relaxed"
              style={{
                color:
                  i % 2 === 0
                    ? house.colors.primary
                    : "rgba(240,217,160,0.7)",
                fontSize: "0.9rem",
                letterSpacing: "0.04em",
              }}
            >
              {line}
            </motion.p>
          ))}

        </div>
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${house.colors.primary}, transparent)`,
          }}
        />
      </motion.div>

      {/* ── QR scan instruction ────────────────────────────────── */}
      {!stage.isFinal && !stage.isHalftime && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          className="rounded-sm px-5 py-4 flex items-start gap-4"
          style={{
            background: `${house.colors.secondary}18`,
            border: `1px solid ${house.colors.primary}30`,
          }}
        >
          <motion.span
            className="text-2xl select-none flex-shrink-0 mt-0.5"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            📱
          </motion.span>
          <div className="space-y-1">
            <p
              className="font-cinzel text-xs tracking-wider"
              style={{ color: house.colors.primary, opacity: 0.9 }}
            >
              HOW TO PROCEED
            </p>
            <p className="font-crimson italic text-sm leading-relaxed opacity-75">
              Solve the riddle, find the location, and{" "}
              <span
                className="font-bold not-italic"
                style={{ color: house.colors.primary }}
              >
                scan the QR code
              </span>{" "}
              you find there. This will unlock the challenge and reveal the path
              to destroying this Horcrux.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Final stage ────────────────────────────────────────── */}
      {stage.isFinal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-3 py-6 rounded-sm"
          style={{
            background: `${house.colors.secondary}20`,
            border: `1px solid ${house.colors.primary}50`,
            boxShadow: `0 0 40px ${house.colors.glow}`,
          }}
        >
          <p className="text-4xl">⚡</p>
          <p
            className="font-cinzel text-sm font-bold tracking-widest"
            style={{ color: house.colors.primary }}
          >
            RACE TO THE GREAT HALL
          </p>
          <p className="font-crimson italic text-sm opacity-55 leading-relaxed px-4">
            Bring all your Horcrux tokens. The first house to present them all wins.
          </p>
        </motion.div>
      )}

      {/* Confidentiality note */}
      <p className="text-center font-crimson italic text-xs opacity-20">
        Do not share clues with other houses. The Ministry is watching.
      </p>
    </motion.div>
  );
}
