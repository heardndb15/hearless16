"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

interface DM {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  text: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Props {
  userId: string | null;
  userName: string;
  openDmWith?: { id: string; name: string } | null;
  onClearDmWith?: () => void;
}

export function DmsTab({ userId, userName, openDmWith, onClearDmWith }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<{ id: string; name: string } | null>(null);
  const activeConvRef = useRef<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    if (openDmWith) {
      setActiveConv(openDmWith);
      onClearDmWith?.();
    }
  }, [openDmWith, onClearDmWith]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadConversations();

    const channel = supabase
      .channel(`dm-inbox-${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `receiver_id=eq.${userId}`,
      }, () => { loadConversations(); if (activeConvRef.current) loadMessages(activeConvRef.current.id); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!activeConv || !userId) return;
    loadMessages(activeConv.id);
    markRead(activeConv.id);

    const channel = supabase
      .channel(`dm-thread-${userId}-${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
      }, (payload) => {
        const msg = payload.new as DM;
        if (
          (msg.sender_id === userId && msg.receiver_id === activeConv.id) ||
          (msg.sender_id === activeConv.id && msg.receiver_id === userId)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    if (!userId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    const convMap = new Map<string, Conversation>();
    for (const msg of data ?? []) {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const partnerName = msg.sender_id === userId ? msg.receiver_name : msg.sender_name;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId, partnerName,
          lastMessage: msg.text,
          lastAt: msg.created_at,
          unread: (!msg.read_at && msg.receiver_id === userId) ? 1 : 0,
        });
      } else if (!msg.read_at && msg.receiver_id === userId) {
        convMap.get(partnerId)!.unread++;
      }
    }
    setConversations(Array.from(convMap.values()));
    setLoading(false);
  }

  async function loadMessages(partnerId: string) {
    if (!userId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  async function markRead(partnerId: string) {
    if (!userId) return;
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("receiver_id", userId)
      .eq("sender_id", partnerId)
      .is("read_at", null);
    loadConversations();
  }

  async function send() {
    const text = input.trim();
    if (!text || !userId || !activeConv || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("direct_messages").insert({
      sender_id: userId,
      sender_name: userName || "Пользователь",
      receiver_id: activeConv.id,
      receiver_name: activeConv.name,
      text,
    });
    setSending(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (!userId) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--textSecondary)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
        <p style={{ fontSize: 14 }}>Войдите чтобы отправлять личные сообщения</p>
      </div>
    );
  }

  // Thread view
  if (activeConv) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          <button onClick={() => { setActiveConv(null); setMessages([]); loadConversations(); }}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 18, padding: 0 }}>
            ←
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0369A1" }}>
            {activeConv.name[0]?.toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{activeConv.name}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--textMuted)", fontSize: 14, marginTop: 40 }}>
              Начните разговор 👋
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "68%" }}>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMine ? "#0EA5E9" : "#FFFFFF",
                    border: isMine ? "none" : "1px solid var(--border)",
                    color: isMine ? "#FFFFFF" : "var(--text)",
                    fontSize: 14, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 3, textAlign: isMine ? "right" : "left" }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Написать личное сообщение..."
            maxLength={1000}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "#F0F9FF", fontSize: 14, color: "var(--text)", outline: "none" }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: input.trim() ? "#0EA5E9" : "#BAE6FD", color: "white", fontWeight: 700, fontSize: 14, cursor: input.trim() ? "pointer" : "not-allowed" }}>
            ↑
          </button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--textSecondary)", fontSize: 14 }}>Загрузка...</div>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.6 }}>
            Нет сообщений. Нажмите на имя пользователя в ленте<br />чтобы написать ему лично.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {conversations.map((conv) => (
            <button key={conv.partnerId}
              onClick={() => setActiveConv({ id: conv.partnerId, name: conv.partnerName })}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                borderRadius: 14, border: "1px solid var(--border)", background: "#FFFFFF",
                cursor: "pointer", textAlign: "left", transition: "all 0.2s", width: "100%",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#0369A1", flexShrink: 0 }}>
                {conv.partnerName[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 14 }}>{conv.partnerName}</span>
                  <span style={{ fontSize: 11, color: "var(--textMuted)" }}>
                    {new Date(conv.lastAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--textSecondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.lastMessage}
                </div>
              </div>
              {conv.unread > 0 && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#0EA5E9", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {conv.unread > 9 ? "9+" : conv.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
