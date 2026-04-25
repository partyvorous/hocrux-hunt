"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import HouseSelector from "./HouseSelector";
import AccessCodeInput from "./AccessCodeInput";
import WaxSealButton from "./WaxSealButton";
import { HouseId, getHouse } from "@/lib/houses";
import { saveSession } from "@/lib/session";

interface RegistrationFormProps {
  onSuccess: (houseId: HouseId) => void;
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [houseId, setHouseId] = useState<HouseId | "">("");
  const [playerName, setPlayerName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!houseId) {
      setError("Please select your house first.");
      return;
    }
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!code.trim()) {
      setError("The access code field cannot be empty.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "The Ministry rejected your registration. Try again.");
        setLoading(false);
        return;
      }

      const house = getHouse(houseId)!;
      saveSession({
        houseId,
        houseName: house.name,
        playerName: playerName.trim(),
        registeredAt: Date.now(),
        currentStage: "stage-1",
        completedStages: [],
      });

      onSuccess(houseId);
    } catch {
      setError("Could not reach the Ministry. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section: House Selection */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <HouseSelector
          value={houseId}
          onChange={(id) => {
            setHouseId(id);
            setError(null);
          }}
          disabled={loading}
        />
      </motion.div>

      <div className="divider-magic" />

      {/* Section: Player Name */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.375, duration: 0.5 }}
      >
        <label className="label-parchment">Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            setError(null);
          }}
          disabled={loading}
          placeholder="e.g. Hermione"
          maxLength={30}
          className="code-input"
          style={{ letterSpacing: "0.05em", fontSize: "1rem", textTransform: "none" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </motion.div>

      <div className="divider-magic" />

      {/* Section: Access Code */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="space-y-2"
      >
        <AccessCodeInput
          value={code}
          onChange={(val) => {
            setCode(val);
            setError(null);
          }}
          error={error}
          disabled={loading}
          onSubmit={handleSubmit}
        />
        <p className="font-crimson italic text-xs text-center opacity-40 leading-relaxed px-2">
          The secret code was given to your house by the hosts.
          <br />
          Not received it? Contact your Hunt Master.
        </p>
      </motion.div>

      <div className="divider-magic" />

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <WaxSealButton
          variant="parchment"
          loading={loading}
          disabled={!houseId || !playerName.trim() || !code.trim()}
          onClick={handleSubmit}
        >
          ✦ Enter the Hunt ✦
        </WaxSealButton>
      </motion.div>

      <p className="text-center text-xs opacity-30 font-crimson italic">
        By entering, your house accepts the Ministry&apos;s terms. May fortune favour the brave.
      </p>
    </div>
  );
}
