"use client";

import { motion } from "framer-motion";

interface MinistrySeaProps {
  size?: number;
  animate?: boolean;
}

export default function MinistrySeal({
  size = 120,
  animate = true,
}: MinistrySeaProps) {
  const ringSize = size + 16;

  return (
    <div className="ministry-seal" style={{ width: size, height: size }}>
      {/* Rotating outer ring */}
      {animate && (
        <motion.div
          className="ministry-seal-ring"
          initial={{ rotate: 0, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 360, opacity: 1, scale: 1 }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            opacity: { duration: 0.5 },
            scale: { duration: 0.8, ease: "backOut" },
          }}
          style={{ width: ringSize, height: ringSize, top: -8, left: -8 }}
        />
      )}

      {/* Seal body */}
      <motion.div
        className="ministry-seal-inner"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        initial={animate ? { scale: 0, rotate: -180, opacity: 0 } : undefined}
        animate={animate ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
        transition={
          animate
            ? { duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }
            : undefined
        }
      >
        <span role="img" aria-label="Ministry of Magic seal">
          🦅
        </span>
      </motion.div>

      {/* Circular text */}
      <svg
        className="ministry-seal-text"
        viewBox="0 0 150 150"
        style={{ width: ringSize + 14, height: ringSize + 14, top: -15, left: -15, position: "absolute" }}
        aria-hidden="true"
      >
        <defs>
          <path
            id="circle-text"
            d={`M 75,75 m -55,0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0`}
          />
        </defs>
        <text
          fontSize="7.5"
          fill="rgba(201,169,110,0.7)"
          fontFamily="var(--font-cinzel), serif"
          letterSpacing="2"
        >
          <textPath href="#circle-text">
            ✦ MINISTRY OF MAGIC ✦ HOCRUX HUNT ✦ MMXXVI ✦
          </textPath>
        </text>
      </svg>
    </div>
  );
}
