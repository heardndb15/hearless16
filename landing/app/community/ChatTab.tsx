"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

interface Props {
  userId: string | null;
  userName: string;
}

export function ChatTab({ userId, userName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("public-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("chat_messages").insert({
      user_id: userId,
      user_name: userName || "Пользователь",
      text,
    });
    setSending(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--textSecondary)" }}>
        Загрузка чата...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: 400 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--textMuted)", fontSize: 14, marginTop: 40 }}>
            Будьте первым — напишите что-нибудь 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.user_id === userId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", paddingLeft: 4, paddingRight: 4 }}>
              {!isMine && (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#E0F2FE",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#0369A1", flexShrink: 0, marginRight: 8, alignSelf: "flex-end",
                }}>
                  {msg.user_name[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div style={{ maxWidth: "68%" }}>
                {!isMine && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 3, paddingLeft: 2 }}>
                    {msg.user_name}
                  </div>
                )}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMine ? "#0EA5E9" : "#FFFFFF",
                  border: isMine ? "none" : "1px solid var(--border)",
                  color: isMine ? "#FFFFFF" : "var(--text)",
                  fontSize: 14, lineHeight: 1.5,
                  boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 3, textAlign: isMine ? "right" : "left", paddingLeft: 2 }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {userId ? (
        <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Написать сообщение..."
            maxLength={500}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 14,
              border: "1px solid var(--border)", background: "#F0F9FF",
              fontSize: 14, color: "var(--text)", outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              padding: "12px 20px", borderRadius: 14, border: "none",
              background: input.trim() ? "#0EA5E9" : "#BAE6FD",
              color: "white", fontWeight: 700, fontSize: 14, cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            ↑
          </button>
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "14px", background: "#F0F9FF",
          borderRadius: 12, border: "1px dashed #BAE6FD", marginTop: 8, fontSize: 13, color: "var(--textSecondary)",
        }}>
          Войдите чтобы написать в чат
        </div>
      )}
    </div>
  );
}
