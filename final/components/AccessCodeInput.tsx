"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccessCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
  disabled?: boolean;
  onSubmit?: () => void;
}

export default function AccessCodeInput({
  value,
  onChange,
  error,
  disabled = false,
  onSubmit,
}: AccessCodeInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(0, 20);
    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <label className="label-parchment">Secret Access Code</label>

      <motion.div
        animate={error ? { x: [-8, 8, -8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            placeholder="ENTER CODE"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`code-input ${error ? "error" : ""}`}
            style={{
              borderColor: error
                ? "rgba(220, 50, 50, 0.8)"
                : focused
                ? "rgba(201, 169, 110, 0.8)"
                : undefined,
            }}
          />

          {/* Cursor blink effect when focused and empty */}
          {focused && value.length === 0 && (
            <div
              className="absolute inset-y-0 left-1/2 flex items-center pointer-events-none"
              style={{ transform: "translateX(-50%)" }}
            >
              <motion.div
                className="w-0.5 h-8 bg-amber-400"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.3 }}
            className="error-message"
          >
            <span className="mr-1">⚠</span>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-center opacity-40 font-crimson italic">
        The access code was provided to your house captain
      </p>
    </div>
  );
}
