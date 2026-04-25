"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SyncNotification } from "@/hooks/useHouseSession";
import { House } from "@/lib/houses";

const DISMISS_MS_DEFAULT = 6000;
const DISMISS_MS_WITH_CODE = 0; // no auto-dismiss when a code must be noted

type OscType = OscillatorType;

function getAudioCtx() {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  return AudioCtx ? new AudioCtx() : null;
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number,
  type: OscType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

// 🦁 Gryffindor — bold brass fanfare, G major ascending
function playGryffindor(ctx: AudioContext) {
  const notes = [392, 493.88, 587.33, 783.99, 987.77]; // G4 B4 D5 G5 B5
  // Bass hit on beat 1
  playNote(ctx, 98, ctx.currentTime, 0.6, 0.3, "sawtooth");
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.13;
    playNote(ctx, freq, t, 0.55, 0.22, "sawtooth");
    // Add octave harmonic for richness
    playNote(ctx, freq * 2, t, 0.35, 0.06, "sine");
  });
}

// 🐍 Slytherin — dark descending minor, wavering sine
function playSlytherin(ctx: AudioContext) {
  // A minor descending with sinister gaps: A4 F4 E4 C4 A3
  const notes = [880, 698.46, 659.25, 523.25, 440];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.28;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // LFO for serpentine wavering
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.5;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    lfo.start(t);
    lfo.stop(t + 0.8);
    osc.start(t);
    osc.stop(t + 0.8);
  });
}

// 🦅 Ravenclaw — crystalline bell tones, pure high sine with harmonics
function playRavenclaw(ctx: AudioContext) {
  // D major bells: D5 F#5 A5 D6 F#6
  const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.15;
    // Fundamental
    playNote(ctx, freq, t, 1.2, 0.2, "sine");
    // 2nd harmonic (softer)
    playNote(ctx, freq * 2, t, 0.6, 0.07, "sine");
    // 3rd harmonic (very soft)
    playNote(ctx, freq * 3, t, 0.3, 0.03, "sine");
  });
}

// 🦡 Hufflepuff — warm bouncy flute, F major pentatonic
function playHufflepuff(ctx: AudioContext) {
  // C4 F4 G4 A4 C5 F5 — cheerful ascending
  const notes = [261.63, 349.23, 392, 440, 523.25, 698.46];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.14;
    playNote(ctx, freq, t, 0.5, 0.2, "triangle");
    // Soft octave shimmer
    playNote(ctx, freq * 2, t + 0.02, 0.3, 0.05, "sine");
  });
}

function playHouseChime(houseId: string) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    switch (houseId) {
      case "gryffindor": playGryffindor(ctx); break;
      case "slytherin":  playSlytherin(ctx);  break;
      case "ravenclaw":  playRavenclaw(ctx);  break;
      case "hufflepuff": playHufflepuff(ctx); break;
    }
  } catch {
    // Audio not available — silent fail
  }
}

interface SyncNotificationProps {
  notification: SyncNotification | null;
  house: House | null;
  onDismiss: () => void;
}

export default function SyncNotificationBanner({
  notification,
  house,
  onDismiss,
}: SyncNotificationProps) {
  // Auto-dismiss + play house chime when a new notification arrives
  useEffect(() => {
    if (!notification || !house) return;
    playHouseChime(house.id);
    // Don't auto-dismiss when a code must be noted, or for admin skip notices
    const dismissMs =
      notification.stageCode || notification.isAdminSkip
        ? DISMISS_MS_WITH_CODE
        : DISMISS_MS_DEFAULT;
    if (!dismissMs) return;
    const t = setTimeout(onDismiss, dismissMs);
    return () => clearTimeout(t);
  }, [notification, onDismiss, house]);

  return (
    <AnimatePresence>
      {notification && house && (
        <>
          {/* Backdrop */}
          <motion.div
            key={`backdrop-${notification.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
          />

          {/* Card */}
          <motion.div
            key={notification.id}
            initial={{ scale: 0.7, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none"
          >
            <div
              className="w-full max-w-sm pointer-events-auto"
              style={{
                background: `linear-gradient(160deg, #12100a 0%, #1e1a0e 50%, #12100a 100%)`,
                border: `1px solid ${house.colors.primary}`,
                boxShadow: `0 0 60px ${house.colors.glow}, 0 0 120px ${house.colors.glow}, 0 20px 60px rgba(0,0,0,0.9)`,
                borderRadius: "4px",
              }}
            >
              {/* Top border */}
              {notification.isAdminSkip || notification.stageCode ? (
                <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)" }} />
              ) : (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: DISMISS_MS_DEFAULT / 1000, ease: "linear" }}
                  style={{
                    height: "2px",
                    background: house.colors.primary,
                    transformOrigin: "left",
                    borderRadius: "4px 4px 0 0",
                  }}
                />
              )}

              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="text-center space-y-1">
                  <p
                    className="font-cinzel text-xs tracking-[0.3em]"
                    style={{ color: notification.isAdminSkip ? "#fbbf24" : house.colors.primary, opacity: 0.7 }}
                  >
                    {notification.isAdminSkip ? "HUNT MASTER" : "MINISTRY DISPATCH"}
                  </p>
                  <div
                    className="text-4xl"
                    style={{ filter: `drop-shadow(0 0 12px ${house.colors.primary})` }}
                  >
                    {notification.isAdminSkip ? "🔮" : house.emoji}
                  </div>
                  <p
                    className="font-cinzel text-sm tracking-widest font-bold"
                    style={{ color: notification.isAdminSkip ? "#fbbf24" : house.colors.primary }}
                  >
                    {notification.isAdminSkip ? "PUZZLE SKIPPED" : house.name.toUpperCase()}
                  </p>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: `linear-gradient(90deg, transparent, ${notification.isAdminSkip ? "rgba(251,191,36,0.5)" : house.colors.primary + "60"}, transparent)`,
                  }}
                />

                {/* Message */}
                {notification.isAdminSkip ? (
                  <div className="text-center space-y-2 px-2">
                    <p
                      className="font-crimson text-base leading-snug"
                      style={{ color: "rgba(240,217,160,0.8)" }}
                    >
                      The Hunt Master has skipped the tile puzzle for{" "}
                      <span className="italic font-bold" style={{ color: "#fbbf24" }}>
                        {notification.horcrux}
                      </span>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2 px-2">
                    <p
                      className="font-cinzel text-xs tracking-widest"
                      style={{ color: house.colors.primary, opacity: 0.5 }}
                    >
                      ✦ HORCRUX DESTROYED ✦
                    </p>
                    <p
                      className="font-crimson text-xl leading-snug"
                      style={{ color: house.colors.text }}
                    >
                      <span className="font-bold">{notification.solvedBy}</span>
                      <span className="opacity-70"> has destroyed </span>
                    </p>
                    <p
                      className="font-crimson italic text-2xl font-bold"
                      style={{ color: house.colors.primary }}
                    >
                      {notification.horcrux}
                    </p>
                    <p
                      className="font-crimson text-sm opacity-50 italic"
                      style={{ color: house.colors.text }}
                    >
                      for your house
                    </p>
                  </div>
                )}

                {/* Answer + penalty — shown for admin skips */}
                {notification.isAdminSkip && notification.stageCode && (
                  <div
                    className="rounded-sm overflow-hidden"
                    style={{
                      background: "rgba(251,191,36,0.04)",
                      border: "1px solid rgba(251,191,36,0.35)",
                    }}
                  >
                    <div className="px-4 py-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔑</span>
                        <p className="font-cinzel text-xs tracking-[0.2em] text-yellow-400 font-bold">
                          THE ANSWER WAS
                        </p>
                      </div>
                      <div
                        className="rounded-sm py-3 px-4 text-center"
                        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(251,191,36,0.25)" }}
                      >
                        <p
                          className="font-mono font-bold text-yellow-400"
                          style={{
                            fontSize: "1.75rem",
                            letterSpacing: "0.45em",
                            textShadow: "0 0 16px rgba(251,191,36,0.4)",
                          }}
                        >
                          {notification.stageCode}
                        </p>
                      </div>
                      {notification.penaltyMinutes && (
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-sm"
                          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}
                        >
                          <span className="text-sm">⏱</span>
                          <p className="font-cinzel text-xs text-red-400 tracking-wider font-bold">
                            {notification.penaltyMinutes}-MINUTE PENALTY added to your house time
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stage code — shown to teammates who didn't scan the QR (non-skip) */}
                {!notification.isAdminSkip && notification.stageCode && (
                  <>
                    <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)` }} />
                    <div
                      className="rounded-sm overflow-hidden"
                      style={{
                        background: "rgba(251,191,36,0.04)",
                        border: "1px solid rgba(251,191,36,0.35)",
                      }}
                    >
                      <div className="px-4 py-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚠️</span>
                          <p className="font-cinzel text-xs tracking-[0.2em] text-yellow-400 font-bold">
                            REMEMBER THIS CODE
                          </p>
                        </div>
                        <div
                          className="rounded-sm py-3 px-4 text-center"
                          style={{
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(251,191,36,0.25)",
                          }}
                        >
                          <p className="font-cinzel text-yellow-400/40 mb-1" style={{ fontSize: "0.55rem", letterSpacing: "0.2em" }}>
                            STAGE CODE
                          </p>
                          <p
                            className="font-mono font-bold text-yellow-400"
                            style={{
                              fontSize: "1.75rem",
                              letterSpacing: "0.45em",
                              textShadow: "0 0 16px rgba(251,191,36,0.4)",
                            }}
                          >
                            {notification.stageCode}
                          </p>
                        </div>
                        <p className="font-crimson text-xs leading-relaxed text-yellow-100/60">
                          You will need this code at a future checkpoint.{" "}
                          <span className="text-yellow-400 font-bold not-italic">Write it down</span> before continuing.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Dismiss */}
                <button
                  onClick={onDismiss}
                  className="w-full parchment-btn text-xs"
                  style={{
                    borderColor: notification.isAdminSkip
                      ? "rgba(248,113,113,0.5)"
                      : notification.stageCode
                      ? "rgba(251,191,36,0.5)"
                      : `${house.colors.primary}60`,
                  }}
                >
                  {notification.isAdminSkip ? "✦ Understood ✦" : notification.stageCode ? "✦ I've noted my code ✦" : "✦ Onward ✦"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
