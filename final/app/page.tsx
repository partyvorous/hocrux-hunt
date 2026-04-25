"use client";

import { motion, AnimatePresence } from "framer-motion";
import MagicBackground from "@/components/MagicBackground";
import MinistrySeal from "@/components/MinistrySeal";
import ParchmentCard from "@/components/ParchmentCard";
import RegistrationForm from "@/components/RegistrationForm";
import ClueReveal from "@/components/ClueReveal";
import SyncNotificationBanner from "@/components/SyncNotification";
import HouseChat from "@/components/HouseChat";
import GamePausedOverlay from "@/components/GamePausedOverlay";
import { HouseId } from "@/lib/houses";
import { getStage } from "@/lib/stages";
import { useHouseSession } from "@/hooks/useHouseSession";
import { useGameState } from "@/hooks/useGameState";

export default function HomePage() {
  const {
    session,
    house,
    isLoaded,
    isRegistered,
    isHousePaused,
    advanceToStage,
    resetSession,
    notification,
    dismissNotification,
  } = useHouseSession();
  const gameStatus = useGameState();

  const handleRegistrationSuccess = (_id: HouseId) => {
    // session is already saved by RegistrationForm; hook picks it up via re-render
    window.location.reload();
  };

  if (!isLoaded) {
    return (
      <>
        <MagicBackground />
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="text-4xl"
          >
            ✦
          </motion.div>
        </div>
      </>
    );
  }

  const currentStage = getStage(session?.currentStage ?? "stage-1")!;

  return (
    <>
      <MagicBackground />

      <main className="min-h-screen relative z-10 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ─── Header ─── */}
          <motion.header
            className="text-center mb-8 space-y-4"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Ministry Seal */}
            <div className="flex justify-center mb-6">
              <MinistrySeal size={110} animate={true} />
            </div>

            <div className="space-y-1">
              <p className="subheading-cinzel text-xs tracking-[0.3em] opacity-60">
                MINISTRY OF MAGIC PRESENTS
              </p>
              <h1 className="heading-cinzel text-3xl sm:text-4xl font-black shimmer-gold">
                Hocrux Hunt
              </h1>
              <p className="subheading-cinzel text-sm tracking-widest opacity-70">
                ✦ MMXXVI ✦
              </p>
            </div>

            <p className="font-crimson italic text-base opacity-60 leading-relaxed px-4">
              Seven Horcruxes. Four Houses. One Victor.
              <br />
              The Dark Lord&apos;s soul must be destroyed.
            </p>
          </motion.header>

          {/* ─── Envelope / Content ─── */}
          <AnimatePresence mode="wait">
            {!isRegistered && (
              <motion.div
                key="register"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <ParchmentCard animateIn={true} delay={0.2}>
                  {/* Card Header */}
                  <div className="text-center mb-6 space-y-2">
                    <p className="text-3xl">🎩</p>
                    <h2 className="heading-cinzel text-xl font-bold">
                      Hello, Wizard
                    </h2>
                    <p className="text-xs font-cinzel tracking-widest opacity-50">
                      — HOUSE REGISTRATION —
                    </p>
                    <div className="divider-magic" />
                    <p className="font-crimson italic text-sm opacity-70">
                      The Sorting Hat awaits. Identify your house and present
                      your secret access code to begin the Hunt.
                    </p>
                  </div>

                  <RegistrationForm onSuccess={handleRegistrationSuccess} />
                </ParchmentCard>
              </motion.div>
            )}

            {isRegistered && house && session && (
              <motion.div
                key="revealed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={house.cssClass}
              >
                <ParchmentCard animateIn={false}>
                  <ClueReveal
                    house={house}
                    stage={currentStage}
                    onAdvance={advanceToStage}
                  />
                </ParchmentCard>

                {/* Reset link */}
                <motion.div
                  className="text-center mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  <button
                    onClick={() => {
                      resetSession();
                      if (typeof window !== "undefined") window.location.reload();
                    }}
                    className="text-xs opacity-20 hover:opacity-50 transition-opacity font-cinzel tracking-wider"
                  >
                    ↩ Reset Registration
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Footer ─── */}
          <motion.footer
            className="text-center mt-8 space-y-1 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="divider-magic" />
            <p className="text-xs font-cinzel tracking-widest opacity-20">
              MINISTRY OF MAGIC · CLASSIFIED
            </p>
            <p className="text-xs font-crimson italic opacity-15">
              Unauthorized use of this portal is punishable under Section 14 of the Misuse of Magic Act.
            </p>
          </motion.footer>
        </div>
      </main>

      {/* House chat — only visible when registered */}
      {isRegistered && house && session && (
        <HouseChat
          houseId={session.houseId}
          playerName={session.playerName}
          house={house}
        />
      )}

      {/* Real-time sync notification — outside main so it overlays everything */}
      <SyncNotificationBanner
        notification={notification}
        house={house}
        onDismiss={dismissNotification}
      />

      {/* Game pause overlay — global or per-house */}
      <GamePausedOverlay
        paused={gameStatus === "paused" || isHousePaused}
        houseSpecific={isHousePaused && gameStatus !== "paused"}
        houseName={house?.name}
      />
    </>
  );
}
