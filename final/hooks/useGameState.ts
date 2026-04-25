"use client";

import { useState, useEffect } from "react";

export type GameStatus = "idle" | "started" | "paused" | "stopped";

export function useGameState(): GameStatus {
  const [status, setStatus] = useState<GameStatus>("started");

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/admin/gamestate");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStatus(data.status ?? "started");
        }
      } catch {
        // network error — keep current status, don't block the game
      }
    };

    poll(); // fire immediately on mount
    const interval = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
