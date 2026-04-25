"use client";

import { motion } from "framer-motion";
import { ButtonHTMLAttributes } from "react";

interface WaxSealButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: string;
  variant?: "seal" | "parchment";
  loading?: boolean;
}

export default function WaxSealButton({
  label,
  icon = "⚡",
  variant = "parchment",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: WaxSealButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "seal") {
    return (
      <motion.button
        className={`wax-seal-btn ${className}`}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.05 } : undefined}
        whileTap={!isDisabled ? { scale: 0.97 } : undefined}
        {...(props as object)}
      >
        {loading ? (
          <span className="text-2xl animate-spin inline-block">✦</span>
        ) : (
          <span>{icon}</span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      className={`parchment-btn w-full ${className}`}
      disabled={isDisabled}
      whileHover={!isDisabled ? { y: -1 } : undefined}
      whileTap={!isDisabled ? { y: 1, scale: 0.99 } : undefined}
      {...(props as object)}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-spin inline-block">✦</span>
          <span>Consulting the Ministry...</span>
        </span>
      ) : (
        children ?? label
      )}
    </motion.button>
  );
}
