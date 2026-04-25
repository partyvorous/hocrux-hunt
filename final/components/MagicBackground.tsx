"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface Candle {
  x: number;
  y: number;
  duration: number;
  delay: number;
  scale: number;
}

export default function MagicBackground() {
  const starsRef = useRef<Star[]>([]);
  const candlesRef = useRef<Candle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate stars
    starsRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 5,
    }));

    // Generate floating candles
    candlesRef.current = Array.from({ length: 8 }, (_, i) => ({
      x: 5 + (i / 8) * 90 + Math.random() * 10,
      y: Math.random() * 60 + 5,
      duration: Math.random() * 4 + 5,
      delay: Math.random() * 4,
      scale: Math.random() * 0.4 + 0.7,
    }));

    if (!containerRef.current) return;
    const container = containerRef.current;

    // Render stars
    starsRef.current.forEach((star) => {
      const el = document.createElement("div");
      el.className = "star";
      el.style.cssText = `
        left: ${star.x}%;
        top: ${star.y}%;
        width: ${star.size}px;
        height: ${star.size}px;
        --duration: ${star.duration}s;
        --delay: ${star.delay}s;
        opacity: ${Math.random() * 0.7 + 0.3};
      `;
      container.appendChild(el);
    });

    // Render candles
    candlesRef.current.forEach((candle) => {
      const wrap = document.createElement("div");
      wrap.className = "candle-wrap";
      wrap.style.cssText = `
        left: ${candle.x}%;
        top: ${candle.y}%;
        transform: scale(${candle.scale});
      `;

      wrap.innerHTML = `
        <div class="candle" style="--duration: ${candle.duration}s; --delay: ${candle.delay}s;">
          <div class="candle-glow"></div>
          <div class="candle-flame"></div>
          <div class="candle-body"></div>
        </div>
      `;

      container.appendChild(wrap);
    });

    return () => {
      // Cleanup on unmount
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return <div ref={containerRef} className="starfield" aria-hidden="true" />;
}
