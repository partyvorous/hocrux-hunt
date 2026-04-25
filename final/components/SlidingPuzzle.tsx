"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SIZE = 3;
const FILLER = "✦";

// Start from the solved state and make N random valid moves — guarantees solvability.
function shuffleByMoves(goal: (string | null)[], moves = 120): (string | null)[] {
  const g = [...goal];
  let prev = -1;
  for (let i = 0; i < moves; i++) {
    const ei = g.indexOf(null);
    const r = Math.floor(ei / SIZE);
    const c = ei % SIZE;
    const adj: number[] = [];
    if (r > 0) adj.push(ei - SIZE);
    if (r < SIZE - 1) adj.push(ei + SIZE);
    if (c > 0) adj.push(ei - 1);
    if (c < SIZE - 1) adj.push(ei + 1);
    const pool = prev >= 0 ? adj.filter((n) => n !== prev) : adj;
    const pick = (pool.length ? pool : adj)[
      Math.floor(Math.random() * (pool.length || adj.length))
    ];
    prev = ei;
    [g[ei], g[pick]] = [g[pick], g[ei]];
  }
  return g;
}

interface SlidingPuzzleProps {
  /** Letters of the stage code, e.g. ["G","E","M","I","N","O"] */
  codeTiles: string[];
  houseColor: string;
  houseGlow: string;
  onSolved: (code: string) => void;
}

export default function SlidingPuzzle({
  codeTiles,
  houseColor,
  houseGlow,
  onSolved,
}: SlidingPuzzleProps) {
  const fillerCount = SIZE * SIZE - 1 - codeTiles.length;
  const goal: (string | null)[] = [
    ...codeTiles,
    ...Array(fillerCount).fill(FILLER),
    null,
  ];

  const [grid, setGrid] = useState<(string | null)[]>(() =>
    shuffleByMoves([...goal])
  );
  const [solved, setSolved] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const handleTap = (idx: number) => {
    if (solved) return;
    const ei = grid.indexOf(null);
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    const er = Math.floor(ei / SIZE);
    const ec = ei % SIZE;
    if (Math.abs(r - er) + Math.abs(c - ec) !== 1) return;

    const next = [...grid];
    [next[idx], next[ei]] = [next[ei], next[idx]];
    setGrid(next);
    setMoveCount((m) => m + 1);

    if (goal.every((v, i) => next[i] === v)) {
      setSolved(true);
      onSolved(codeTiles.join(""));
    }
  };

  const isCode = (tile: string | null) => tile !== null && tile !== FILLER;

  return (
    <div className="space-y-3">
      {/* Hint */}
      {!solved && (
        <p
          className="text-center font-crimson italic text-xs leading-relaxed"
          style={{ color: "rgba(240,217,160,0.4)" }}
        >
          Arrange the golden tiles to spell the curse placed upon the Gringotts vaults — the one that multiplies everything you touch.
        </p>
      )}

      {/* Grid */}
      <div
        className="grid gap-2 mx-auto"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, maxWidth: 270 }}
      >
        {grid.map((tile, i) =>
          tile === null ? (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.45)",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            />
          ) : (
            <motion.button
              key={i}
              onClick={() => handleTap(i)}
              whileTap={!solved ? { scale: 0.88 } : undefined}
              className="font-cinzel font-bold flex items-center justify-center select-none"
              style={{
                aspectRatio: "1",
                borderRadius: "4px",
                fontSize: isCode(tile) ? "1.3rem" : "0.9rem",
                background: isCode(tile)
                  ? solved
                    ? `${houseColor}22`
                    : "rgba(201,169,110,0.10)"
                  : "rgba(255,255,255,0.04)",
                border: isCode(tile)
                  ? solved
                    ? `1px solid ${houseColor}65`
                    : "1px solid rgba(201,169,110,0.30)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: isCode(tile)
                  ? solved
                    ? houseColor
                    : "rgba(240,217,160,0.85)"
                  : "rgba(255,255,255,0.15)",
                boxShadow:
                  solved && isCode(tile) ? `0 0 16px ${houseGlow}` : "none",
                cursor: solved ? "default" : "pointer",
                transition: "background 0.2s, border 0.2s, color 0.2s, box-shadow 0.2s",
              }}
            >
              {tile}
            </motion.button>
          )
        )}
      </div>

      {/* Move counter */}
      <p
        className="text-center font-crimson italic text-xs"
        style={{ opacity: 0.25 }}
      >
        {solved ? `✦ Solved in ${moveCount} moves ✦` : `Moves: ${moveCount}`}
      </p>

      {/* Hint */}
      <AnimatePresence>
        {!solved && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center font-cinzel tracking-widest"
            style={{ opacity: 0.18, fontSize: "0.55rem" }}
          >
            TAP A TILE NEXT TO THE EMPTY SPACE TO MOVE IT
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
