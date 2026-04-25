"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GamePausedOverlayProps {
  paused: boolean;
  houseSpecific?: boolean;
  houseName?: string;
}

export default function GamePausedOverlay({ paused, houseSpecific, houseName }: GamePausedOverlayProps) {
  return (
    <AnimatePresence>
      {paused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.93)",
            backdropFilter: "blur(12px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="text-center space-y-6 px-8 max-w-sm"
          >
            <motion.div
              className="text-6xl select-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              ⏸
            </motion.div>

            <h2
              className="font-cinzel text-3xl font-black tracking-wider"
              style={{
                background:
                  "linear-gradient(135deg, #c9a96e 0%, #f0d080 50%, #c9a96e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-block",
                padding: "0.05em 0.15em",
              }}
            >
              {houseSpecific ? "Game Paused" : "Hunt Paused"}
            </h2>

            <div className="divider-magic" />

            <p className="font-crimson italic text-lg opacity-70 leading-relaxed">
              {houseSpecific ? (
                <>
                  The Hunt Master has paused the game for{" "}
                  {houseName ? (
                    <span className="font-bold not-italic" style={{ color: "#c9a96e" }}>
                      {houseName}
                    </span>
                  ) : (
                    "your house"
                  )}
                  .<br />
                  Your timer is paused. Please await further instructions.
                </>
              ) : (
                <>
                  The Ministry of Magic has temporarily suspended the Hunt.
                  <br />
                  Please await further instructions from your Hunt Master.
                </>
              )}
            </p>

            <motion.p
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="font-cinzel text-xs tracking-[0.3em] opacity-30"
            >
              STANDING BY · AWAITING ORDERS
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
