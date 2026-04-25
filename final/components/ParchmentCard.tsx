"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ParchmentCardProps {
  children: ReactNode;
  className?: string;
  animateIn?: boolean;
  delay?: number;
}

export default function ParchmentCard({
  children,
  className = "",
  animateIn = true,
  delay = 0,
}: ParchmentCardProps) {
  if (!animateIn) {
    return (
      <div className={`parchment-card p-6 ${className}`}>{children}</div>
    );
  }

  return (
    <motion.div
      className={`parchment-card p-6 ${className}`}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}
