"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HOUSE_LIST, House, HouseId } from "@/lib/houses";

interface HouseSelectorProps {
  value: HouseId | "";
  onChange: (id: HouseId) => void;
  disabled?: boolean;
}

type SortingState = "idle" | "sorting" | "revealed";

export default function HouseSelector({
  value,
  onChange,
  disabled = false,
}: HouseSelectorProps) {
  const [sortingState, setSortingState] = useState<SortingState>("idle");
  const [sortingHouse, setSortingHouse] = useState<House | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelect = (house: House) => {
    if (disabled) return;
    onChange(house.id);
    setSortingHouse(house);
    setSortingState("sorting");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSortingState("revealed"), 1200);
  };

  useEffect(() => {
    if (!value) {
      setSortingState("idle");
      setSortingHouse(null);
    }
  }, [value]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="space-y-4">
      <label className="label-parchment">Choose Your House</label>

      {/* 2×2 house grid */}
      <div className="grid grid-cols-2 gap-2">
        {HOUSE_LIST.map((house) => (
          <HouseCard
            key={house.id}
            house={house}
            selected={value === house.id}
            disabled={disabled}
            onClick={() => handleSelect(house)}
          />
        ))}
      </div>

      {/* Sorting hat + reveal area */}
      <AnimatePresence mode="wait">
        {sortingState === "sorting" && (
          <motion.div
            key="sorting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-2 py-4"
          >
            <motion.span
              className="text-5xl select-none"
              animate={{
                rotate: [-12, 12, -10, 10, -6, 6, -2, 2, 0],
                scale: [1, 1.15, 1, 1.1, 1, 1.05, 1],
              }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
            >
              🎩
            </motion.span>
            <motion.p
              className="font-crimson italic text-sm opacity-50"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              The Sorting Hat deliberates…
            </motion.p>
          </motion.div>
        )}

        {sortingState === "revealed" && sortingHouse && (
          <HouseRevealCard key={`reveal-${sortingHouse.id}`} house={sortingHouse} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── House grid card ──────────────────────────────────────────────
function HouseCard({ house, selected, disabled, onClick }: {
  house: House;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.04, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      className="relative p-3 text-left transition-all duration-300 rounded-sm cursor-pointer"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${house.colors.secondary}90, ${house.colors.secondary}50)`
          : "rgba(5,5,15,0.6)",
        border: `1px solid ${selected ? house.colors.primary : "rgba(201,169,110,0.2)"}`,
        boxShadow: selected
          ? `0 0 20px ${house.colors.glow}, inset 0 0 20px ${house.colors.glow}`
          : "none",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl">{house.emoji}</span>
        <span
          className="font-cinzel text-xs font-bold tracking-wider uppercase"
          style={{ color: selected ? house.colors.text : "rgba(201,169,110,0.8)" }}
        >
          {house.name}
        </span>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: house.colors.primary }}
          />
        )}
      </div>
    </motion.button>
  );
}

// ── House reveal card ────────────────────────────────────────────
function HouseRevealCard({ house }: { house: House }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="rounded-sm overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${house.colors.secondary}60 0%, rgba(10,8,2,0.95) 50%, ${house.colors.secondary}30 100%)`,
        border: `1px solid ${house.colors.primary}`,
        boxShadow: `0 0 40px ${house.colors.glow}, 0 0 80px ${house.colors.glow}40`,
      }}
    >
      {/* Top glow bar */}
      <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${house.colors.primary}, transparent)` }} />

      <div className="px-5 py-5 text-center space-y-3">
        {/* Emoji */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className="text-5xl"
          style={{ filter: `drop-shadow(0 0 16px ${house.colors.primary})` }}
        >
          {house.emoji}
        </motion.div>

        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-cinzel text-xl font-bold tracking-[0.15em]"
            style={{ color: house.colors.primary }}>
            {house.name.toUpperCase()}
          </p>
        </motion.div>

        {/* Divider */}
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${house.colors.primary}60, transparent)` }} />

        {/* Traits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-3 flex-wrap"
        >
          {house.traits.split(" · ").map((trait) => (
            <span
              key={trait}
              className="font-cinzel text-xs tracking-wider px-2 py-0.5"
              style={{
                color: house.colors.text,
                border: `1px solid ${house.colors.primary}40`,
                borderRadius: "2px",
                background: `${house.colors.primary}10`,
              }}
            >
              {trait.toUpperCase()}
            </span>
          ))}
        </motion.div>

        {/* Meta: element + animal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4 text-xs font-crimson italic"
          style={{ color: house.colors.text, opacity: 0.6 }}
        >
          <span>{house.element}</span>
          <span>·</span>
          <span>{house.animal}</span>
        </motion.div>

        {/* Founder */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-crimson text-xs italic"
          style={{ color: house.colors.primary, opacity: 0.5 }}
        >
          Founded by {house.founder}
        </motion.p>
      </div>

      <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${house.colors.primary}, transparent)` }} />
    </motion.div>
  );
}
