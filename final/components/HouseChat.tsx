"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { House } from "@/lib/houses";

interface Message {
  id: string;
  playerName: string;
  text: string;
  timestamp: number;
}

interface HouseChatProps {
  houseId: string;
  playerName: string;
  house: House;
}

const MAX_CHARS = 200;

// ── Audio ────────────────────────────────────────────────────────
function playMessageSound(primary: string) {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two soft notes — a gentle "received" chime
    [[660, 0], [880, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    void primary; // used for house theming if extended later
  } catch {
    // silent fail
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Group consecutive messages from the same sender
function groupMessages(messages: Message[]) {
  const groups: { sender: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.sender === msg.playerName) {
      last.messages.push(msg);
    } else {
      groups.push({ sender: msg.playerName, messages: [msg] });
    }
  }
  return groups;
}

// ── Component ────────────────────────────────────────────────────
export default function HouseChat({ houseId, playerName, house }: HouseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [, setTick] = useState(0); // forces re-render for relative timestamps

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Refresh relative timestamps every 30s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Firestore listener
  useEffect(() => {
    const q = query(
      collection(db, "registrations", houseId, "messages"),
      orderBy("timestamp", "asc"),
      limit(150)
    );

    const unsub = onSnapshot(q, (snap) => {
      const incoming: Message[] = [];
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const d = change.doc.data();
        incoming.push({
          id: change.doc.id,
          playerName: d.playerName,
          text: d.text,
          timestamp: d.timestamp?.toMillis?.() ?? Date.now(),
        });
      });
      if (!incoming.length) return;

      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !ids.has(m.id))];
      });

      const fromOthers = incoming.filter((m) => m.playerName !== playerName);
      if (fromOthers.length > 0) {
        if (!openRef.current) setUnread((n) => n + fromOthers.length);
        playMessageSound(house.colors.primary);
      }
    });

    return () => unsub();
  }, [houseId, playerName, house.colors.primary]);

  // Auto-scroll when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (open && atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, atBottom]);

  // On open: clear unread, focus, scroll to bottom
  useEffect(() => {
    if (open) {
      setUnread(0);
      setAtBottom(true);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
        inputRef.current?.focus();
      }, 80);
    }
  }, [open]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAtBottom(near);
    if (near) setUnread(0);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setAtBottom(true);
    setUnread(0);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await addDoc(collection(db, "registrations", houseId, "messages"), {
        playerName,
        text,
        timestamp: serverTimestamp(),
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("[chat] send failed:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const groups = groupMessages(messages);

  return (
    <>
      {/* ── Toggle button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5"
        style={{
          background: open
            ? `linear-gradient(135deg, ${house.colors.secondary}cc, #0e0c07)`
            : "linear-gradient(135deg, #12100a, #1a1608)",
          border: `1px solid ${house.colors.primary}`,
          boxShadow: `0 0 ${open ? 28 : 14}px ${house.colors.glow}`,
          borderRadius: "3px",
          color: house.colors.primary,
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
      >
        <span className="text-base">{house.emoji}</span>
        <span className="font-cinzel text-xs tracking-widest">
          {open ? "CLOSE CHAT" : "HOUSE CHAT"}
        </span>
        <AnimatePresence>
          {!open && unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="font-bold rounded-full flex items-center justify-center"
              style={{
                background: house.colors.primary,
                color: "#0a0a1a",
                fontSize: "0.6rem",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-20 right-4 z-40 flex flex-col"
            style={{
              width: "min(400px, calc(100vw - 2rem))",
              height: "min(520px, calc(100vh - 140px))",
              background: "linear-gradient(170deg, #0d0b06 0%, #181408 60%, #0d0b06 100%)",
              border: `1px solid ${house.colors.primary}50`,
              boxShadow: `0 0 50px ${house.colors.glow}, 0 0 100px ${house.colors.glow}40, 0 16px 48px rgba(0,0,0,0.95)`,
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 px-4 py-3 flex items-center gap-3"
              style={{
                background: `linear-gradient(90deg, ${house.colors.secondary}40, transparent)`,
                borderBottom: `1px solid ${house.colors.primary}30`,
              }}
            >
              <span
                className="text-2xl"
                style={{ filter: `drop-shadow(0 0 8px ${house.colors.primary})` }}
              >
                {house.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-cinzel text-xs tracking-[0.2em] font-bold"
                  style={{ color: house.colors.primary }}
                >
                  {house.name.toUpperCase()}
                </p>
                <p className="font-crimson text-xs opacity-40 italic"
                  style={{ color: house.colors.text }}>
                  House communications — classified
                </p>
              </div>
              {/* Live dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: house.colors.primary,
                  boxShadow: `0 0 6px ${house.colors.primary}`,
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              style={{ overscrollBehavior: "contain" }}
            >
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                  <span className="text-4xl">{house.emoji}</span>
                  <p className="font-crimson italic text-sm text-center"
                    style={{ color: house.colors.text }}>
                    No messages yet.
                    <br />Speak to your house.
                  </p>
                </div>
              ) : (
                groups.map((group, gi) => {
                  const isOwn = group.sender === playerName;
                  const lastMsg = group.messages[group.messages.length - 1];
                  return (
                    <div
                      key={`group-${gi}`}
                      className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
                    >
                      {/* Sender name (others only, once per group) */}
                      {!isOwn && (
                        <span
                          className="font-cinzel text-[0.6rem] tracking-widest px-1"
                          style={{ color: house.colors.primary, opacity: 0.65 }}
                        >
                          {group.sender}
                        </span>
                      )}

                      {/* Bubble(s) */}
                      {group.messages.map((msg, mi) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, scale: 0.92, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-crimson text-sm leading-relaxed px-3 py-2"
                          style={{
                            maxWidth: "82%",
                            background: isOwn
                              ? `linear-gradient(135deg, ${house.colors.primary}28, ${house.colors.primary}18)`
                              : "rgba(255,255,255,0.06)",
                            border: `1px solid ${
                              isOwn
                                ? house.colors.primary + "55"
                                : "rgba(255,255,255,0.1)"
                            }`,
                            borderRadius: mi === 0 && !isOwn
                              ? "2px 12px 12px 12px"
                              : mi === 0 && isOwn
                              ? "12px 2px 12px 12px"
                              : "10px",
                            color: house.colors.text,
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.text}
                        </motion.div>
                      ))}

                      {/* Timestamp after last bubble in group */}
                      <span
                        className="font-crimson italic px-1"
                        style={{
                          fontSize: "0.65rem",
                          color: house.colors.text,
                          opacity: 0.3,
                        }}
                      >
                        {formatTime(lastMsg.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Scroll-to-bottom nudge */}
            <AnimatePresence>
              {!atBottom && unread > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-[72px] left-1/2 -translate-x-1/2 font-cinzel text-[0.6rem] tracking-widest px-3 py-1"
                  style={{
                    background: house.colors.primary,
                    color: "#0a0a1a",
                    borderRadius: "20px",
                    boxShadow: `0 4px 12px rgba(0,0,0,0.6)`,
                  }}
                >
                  ↓ {unread} new message{unread > 1 ? "s" : ""}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div
              className="shrink-0 px-3 py-3 space-y-2"
              style={{ borderTop: `1px solid ${house.colors.primary}25` }}
            >
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
                    placeholder="Send a message to your house…"
                    className="w-full bg-transparent font-crimson text-sm outline-none px-3 py-2 pr-10"
                    style={{
                      border: `1px solid ${house.colors.primary}35`,
                      borderRadius: "4px",
                      color: house.colors.text,
                      caretColor: house.colors.primary,
                      background: "rgba(255,255,255,0.03)",
                      lineHeight: 1.5,
                    }}
                  />
                  {input.length > MAX_CHARS * 0.8 && (
                    <span
                      className="absolute right-2 bottom-2 font-cinzel"
                      style={{
                        fontSize: "0.55rem",
                        color: input.length >= MAX_CHARS ? "#e57373" : house.colors.primary,
                        opacity: 0.6,
                      }}
                    >
                      {MAX_CHARS - input.length}
                    </span>
                  )}
                </div>
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  whileTap={{ scale: 0.93 }}
                  className="shrink-0 font-cinzel text-sm px-3 py-2 transition-all disabled:opacity-25"
                  style={{
                    border: `1px solid ${house.colors.primary}`,
                    color: house.colors.primary,
                    borderRadius: "4px",
                    background: `${house.colors.primary}18`,
                    boxShadow: !input.trim() ? "none" : `0 0 10px ${house.colors.glow}`,
                  }}
                >
                  {sending ? "…" : "✦"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
