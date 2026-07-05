"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { ChatTab } from "./ChatTab";
import { DmsTab } from "./DmsTab";
import { bg, bgList, accent, text, textSecondary, border, chipBg, cardShadow, cardRadius, likeActive } from "./theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

interface Author { id: string; name: string; avatar_url: string | null; }
interface Post { id: string; text: string; image_url: string | null; likes_count: number; comments_count: number; liked_by_me: boolean; created_at: string; author: Author; }
interface Comment { id: string; text: string; created_at: string; author: Author; }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins}м назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  return `${Math.floor(hours / 24)}д назад`;
}

function initials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

function PostCard({ post, currentUserId, token, likingId, onLike, onDelete, onOpen, onDm }: {
  post: Post; currentUserId: string | null; token: string; likingId: string | null;
  onLike: (id: string) => void; onDelete: (id: string) => void; onOpen: (post: Post) => void;
  onDm: (author: Author) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = currentUserId === post.author.id;

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: cardRadius, padding: "20px 24px", marginBottom: 16, boxShadow: cardShadow, transition: "box-shadow 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={post.author.name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: text }}>{post.author.name}</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 1 }}>{timeAgo(post.created_at)}</div>
        </div>
        {!isOwn && token && (
          <button onClick={() => onDm(post.author)} style={{ background: chipBg, border: `1px solid ${border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: accent, cursor: "pointer" }}>
            ✉️ DM
          </button>
        )}
        {isOwn && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: textSecondary, lineHeight: 1, padding: "0 4px" }}>···</button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10, background: "white", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${border}`, minWidth: 140, overflow: "hidden" }}>
                <button onClick={() => { setMenuOpen(false); onDelete(post.id); }} style={{ display: "block", width: "100%", padding: "12px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: likeActive, fontWeight: 600 }}>
                  🗑 Удалить пост
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p onClick={() => onOpen(post)} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.65, color: text, cursor: "pointer" }}>{post.text}</p>
      {post.image_url && <img src={post.image_url} alt="" onClick={() => onOpen(post)} style={{ width: "100%", borderRadius: 12, marginBottom: 12, cursor: "pointer", maxHeight: 360, objectFit: "cover" }} />}
      <div style={{ display: "flex", gap: 20, alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
        <button onClick={() => { if (!token) { alert("Войдите, чтобы ставить лайки"); return; } onLike(post.id); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: post.liked_by_me ? likeActive : textSecondary, fontWeight: 600, fontSize: 14, transition: "color 0.15s" }}>
          <span className={likingId === post.id ? "community-like-pop" : undefined} style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes_count}
        </button>
        <button onClick={() => onOpen(post)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontWeight: 600, fontSize: 14 }}>
          <span style={{ fontSize: 18 }}>💬</span>{post.comments_count}
        </button>
      </div>
    </div>
  );
}

function PostModal({ post, token, currentUserId, likingId, onClose, onLike, onDelete }: { post: Post; token: string; currentUserId: string | null; likingId: string | null; onClose: () => void; onLike: (id: string) => void; onDelete: (id: string) => void; }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/community/posts/${post.id}/comments`)
      .then((r) => r.json()).then((data) => setComments(data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [post.id]);

  async function sendComment() {
    if (!commentText.trim() || !token) return;
    setSending(true);
    setCommentError("");
    try {
      const res = await fetch(`${API_URL}/community/posts/${post.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: commentText.trim() }) });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentText("");
      } else {
        const d = await res.json().catch(() => ({}));
        setCommentError(d.detail || `Ошибка (${res.status}). Попробуйте ещё раз.`);
      }
    } catch {
      setCommentError("Нет подключения. Проверьте сеть и попробуйте снова.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: `1px solid ${border}` }}>
          <Avatar name={post.author.name} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, color: text }}>{post.author.name}</div><div style={{ fontSize: 12, color: textSecondary }}>{timeAgo(post.created_at)}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: textSecondary }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, overflowY: "auto", maxHeight: 280 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: text }}>{post.text}</p>
          {post.image_url && <img src={post.image_url} alt="" style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 260 }} />}
          <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
            <button onClick={() => { if (!token) { alert("Войдите"); return; } onLike(post.id); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: post.liked_by_me ? likeActive : textSecondary, fontWeight: 600, fontSize: 14 }}>
              <span className={likingId === post.id ? "community-like-pop" : undefined} style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes_count}
            </button>
            <span style={{ color: textSecondary, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 18 }}>💬</span>{comments.length}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? <p style={{ color: textSecondary, fontSize: 14, textAlign: "center" }}>Загрузка...</p>
            : comments.length === 0 ? <p style={{ color: textSecondary, fontSize: 14, textAlign: "center" }}>Комментариев пока нет</p>
            : comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar name={c.author.name} size={32} />
                <div style={{ flex: 1, background: bgList, borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: text, marginBottom: 3 }}>{c.author.name}</div>
                  <div style={{ fontSize: 14, color: text, lineHeight: 1.5 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))}
        </div>
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {commentError && <p style={{ margin: 0, fontSize: 12, color: likeActive }}>{commentError}</p>}
          {token ? (
            <div style={{ display: "flex", gap: 10 }}>
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }} placeholder="Написать комментарий..." style={{ flex: 1, border: `1.5px solid ${border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", background: bgList }} />
              <button onClick={sendComment} disabled={sending || !commentText.trim()} style={{ background: accent, color: "white", border: "none", borderRadius: 12, padding: "0 18px", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: (sending || !commentText.trim()) ? 0.5 : 1 }}>
                {sending ? "..." : "↑"}
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: textSecondary, textAlign: "center", width: "100%" }}>
              <Link href="/login" style={{ color: accent, fontWeight: 600 }}>Войдите</Link>, чтобы оставить комментарий
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePostModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: (post: Post) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    if (!token) { setError("Войдите в аккаунт чтобы публиковать посты"); return; }
    setLoading(true); setError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_URL}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || `Ошибка сервера (${res.status}). Попробуйте ещё раз.`);
        return;
      }
      const post: Post = await res.json();
      onCreated(post); onClose();
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Сервер не отвечает. Сервер может быть на паузе — подождите 30 сек и попробуйте снова.");
      } else {
        setError("Ошибка сети. Проверьте подключение и попробуйте ещё раз.");
      }
    } finally { setLoading(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${border}` }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>Новый пост</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: textSecondary }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Что у вас нового?" rows={5} style={{ width: "100%", border: `1.5px solid ${border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", background: bgList }} />
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
              <p style={{ color: "#DC2626", fontSize: 13, margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, border: `1.5px solid ${border}`, background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14, color: textSecondary }}>Отмена</button>
            <button onClick={submit} disabled={loading || !text.trim()} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: accent, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (loading || !text.trim()) ? 0.5 : 1 }}>
              {loading ? "Публикация..." : "Опубликовать"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsernameModal({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = name.trim();
    if (!n || n.length > 32) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${API_URL}/users/me/username`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ name: n }),
        });
      }
      onSave(n);
    } catch {
      // network error — still save locally so user isn't stuck
      onSave(n);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 420, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text }}>Установите имя</h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: textSecondary }}>Под каким именем вас будут видеть в сообществе</p>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Ваше имя или никнейм"
          maxLength={32}
          autoFocus
          style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1.5px solid ${border}`, fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" }}
        />
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: name.trim() ? accent : chipBg, color: "white", fontWeight: 700, fontSize: 15, cursor: name.trim() ? "pointer" : "not-allowed" }}
        >
          {saving ? "Сохранение..." : "Сохранить и продолжить"}
        </button>
      </div>
    </div>
  );
}

type Tab = "feed" | "chat" | "dms";

function PostSkeleton() {
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${border}`, borderRadius: cardRadius, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="community-skeleton-bar" style={{ width: 40, height: 40, borderRadius: 20 }} />
        <div style={{ flex: 1 }}>
          <div className="community-skeleton-bar" style={{ width: "40%", height: 12, marginBottom: 6 }} />
          <div className="community-skeleton-bar" style={{ width: "25%", height: 10 }} />
        </div>
      </div>
      <div className="community-skeleton-bar" style={{ width: "90%", height: 14, marginTop: 14 }} />
      <div className="community-skeleton-bar" style={{ width: "60%", height: 14, marginTop: 8 }} />
    </div>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [dmWith, setDmWith] = useState<{ id: string; name: string } | null>(null);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setToken(session?.access_token ?? "");
      setCurrentUserId(session?.user?.id ?? null);
      if (session?.user?.id) {
        const { data } = await supabase.from("users").select("name").eq("id", session.user.id).single();
        const name = data?.name ?? "";
        setUserName(name);
        if (!name) setShowUsernameModal(true);
      }
    });
  }, []);

  const fetchPosts = useCallback(async (newSort: "new" | "popular", newOffset: number, append: boolean) => {
    // Superseding an in-flight request (e.g. the anonymous fetch fired before
    // the Supabase session loads, replaced once the auth token arrives) must
    // not let that older request's abort clobber this newer call's state —
    // tag the abort reason so the older call's catch can recognize and
    // silently skip itself instead of overwriting fetchError/loading.
    if (loadingRef.current) {
      abortRef.current?.abort("superseded");
      loadingRef.current = false;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 20000);
    loadingRef.current = true;
    setLoading(true);
    setFetchError("");
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const params = new URLSearchParams({ sort: newSort, limit: "20", offset: String(newOffset) });
      const res = await fetch(`${API_URL}/community/posts?${params}`, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Ошибка сервера (${res.status})`);
      const data: Post[] = await res.json();
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 20);
      setOffset(newOffset + data.length);
      loadingRef.current = false;
      setLoading(false);
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e === "superseded") return; // a newer call already took over — don't touch shared state
      if (e === "timeout" || (e instanceof DOMException && e.name === "AbortError")) {
        setFetchError("Сервер не отвечает. Возможно, он на паузе — подождите 30 сек и нажмите «Повторить».");
      } else if (e instanceof Error) {
        setFetchError(e.message || "Не удалось загрузить посты. Проверьте подключение.");
      } else {
        setFetchError("Не удалось загрузить посты. Проверьте подключение.");
      }
      loadingRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { setPosts([]); setOffset(0); fetchPosts(sort, 0, false); }, [sort, fetchPosts]);

  useEffect(() => {
    if (activeTab !== "feed" || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          fetchPosts(sort, offset, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, hasMore, sort, offset, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) { alert("Войдите в аккаунт, чтобы ставить лайки"); return; }
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p));
    if (selectedPost?.id === postId) setSelectedPost((p) => p ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p);
    try { await fetch(`${API_URL}/community/posts/${postId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
  }, [token, selectedPost]);

  function triggerLikePop(postId: string) {
    setLikingId(postId);
    setTimeout(() => setLikingId((cur) => (cur === postId ? null : cur)), 250);
  }

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm("Удалить пост?")) return;
    try {
      await fetch(`${API_URL}/community/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch { alert("Не удалось удалить пост"); }
  }, [token, selectedPost]);

  function handleDm(author: Author) {
    setDmWith({ id: author.id, name: author.name });
    setActiveTab("dms");
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "feed", label: "Лента", icon: "📋" },
    { id: "chat", label: "Общий чат", icon: "💬" },
    { id: "dms", label: "Сообщения", icon: "✉️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bgList }}>
      <nav className="community-rail">
        <div className="community-rail-top">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`community-rail-item${activeTab === tab.id ? " active" : ""}`}
            >
              <span className="community-rail-icon">{tab.icon}</span>
              <span className="community-rail-label">{tab.label}</span>
              {tab.id === "dms" && dmUnreadCount > 0 && (
                <span className="community-rail-badge">{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="community-rail-bottom">
          {token ? (
            <button onClick={() => setShowCreate(true)} className="community-rail-post-btn">+ Пост</button>
          ) : (
            <Link href="/login" className="community-rail-post-btn">Войти</Link>
          )}
          <Link href="/" className="community-rail-home-link">← На сайт</Link>
        </div>
      </nav>

      <nav className="community-bottombar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`community-rail-item${activeTab === tab.id ? " active" : ""}`}
          >
            <span className="community-rail-icon">{tab.icon}</span>
            <span className="community-rail-label">{tab.label}</span>
            {tab.id === "dms" && dmUnreadCount > 0 && (
              <span className="community-rail-badge">{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      {activeTab === "feed" && (
        <button
          className="community-fab"
          onClick={() => (token ? setShowCreate(true) : router.push("/login"))}
          aria-label="Новый пост"
        >
          +
        </button>
      )}

      <main className="community-main" style={{ paddingTop: 24 }}>
        {showUsernameModal && (
          <UsernameModal onSave={(n) => { setUserName(n); setShowUsernameModal(false); }} />
        )}

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 60px" }}>
          {userName && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={() => setShowUsernameModal(true)} style={{ background: "none", border: `1px solid ${border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: accent, cursor: "pointer" }}>
                ✏️ {userName}
              </button>
            </div>
          )}

          {/* Feed tab */}
          {activeTab === "feed" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["new", "popular"] as const).map((s) => (
                  <button key={s} onClick={() => setSort(s)} style={{ padding: "8px 20px", borderRadius: 50, border: sort === s ? `1.5px solid ${accent}` : `1.5px solid ${border}`, background: sort === s ? accent : "white", color: sort === s ? "white" : accent, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
                    {s === "new" ? "Новые" : "Популярные"}
                  </button>
                ))}
              </div>
              {fetchError ? (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
                  <p style={{ color: "#DC2626", fontSize: 14, fontWeight: 600, margin: "0 0 14px" }}>⚠️ {fetchError}</p>
                  <button onClick={() => fetchPosts(sort, 0, false)} style={{ background: accent, color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    Повторить
                  </button>
                </div>
              ) : loading && posts.length === 0 ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : posts.length === 0 ? (
                <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: cardRadius, padding: "48px 32px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: text }}>Будьте первым — опубликуйте пост!</p>
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} currentUserId={currentUserId} token={token} likingId={likingId} onLike={(id) => { triggerLikePop(id); handleLike(id); }} onDelete={handleDelete} onOpen={setSelectedPost} onDm={handleDm} />
                  ))}
                  {hasMore && (
                    <div ref={sentinelRef} style={{ textAlign: "center", padding: "20px 0" }}>
                      {loading && (
                        <div style={{ width: 28, height: 28, border: "3px solid rgba(21,101,192,0.15)", borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Chat tab */}
          {activeTab === "chat" && (
            <ChatTab userId={currentUserId} userName={userName} />
          )}

          {/* DMs tab — kept mounted always (not conditionally rendered) so its
              realtime subscription and onUnreadChange effect keep running while
              the user is on the feed or chat tab; only visibility is toggled. */}
          <div style={{ display: activeTab === "dms" ? "block" : "none" }}>
            <DmsTab userId={currentUserId} userName={userName} openDmWith={dmWith} onClearDmWith={() => setDmWith(null)} onUnreadChange={setDmUnreadCount} />
          </div>
        </div>
      </main>

      {selectedPost && (
        <PostModal post={selectedPost} token={token} currentUserId={currentUserId} likingId={likingId} onClose={() => setSelectedPost(null)} onLike={(id) => { triggerLikePop(id); handleLike(id); }} onDelete={handleDelete} />
      )}
      {showCreate && token && (
        <CreatePostModal token={token} onClose={() => setShowCreate(false)} onCreated={(post) => { setPosts((prev) => [post, ...prev]); }} />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes community-like-pop { 0% { display: inline-block; transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
        .community-like-pop { display: inline-block; animation: community-like-pop 0.25s ease; }

        @keyframes community-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
        .community-skeleton-bar {
          background: linear-gradient(90deg, ${bgList} 25%, ${border} 37%, ${bgList} 63%);
          background-size: 400% 100%;
          animation: community-shimmer 1.4s ease infinite;
          border-radius: 6px;
        }

        .community-rail {
          position: fixed; top: 0; left: 0; bottom: 0; width: 88px;
          background: #FFFFFF; border-right: 1px solid ${border};
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 24px 8px; z-index: 50;
        }
        .community-rail-top { display: flex; flex-direction: column; gap: 8px; }
        .community-rail-item {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: none; border: none; cursor: pointer; padding: 10px 4px; border-radius: 14px;
          position: relative;
        }
        .community-rail-item.active { background: ${chipBg}; }
        .community-rail-icon { font-size: 22px; }
        .community-rail-label { font-size: 11px; font-weight: 600; color: ${textSecondary}; }
        .community-rail-item.active .community-rail-label { color: ${accent}; }
        .community-rail-badge {
          position: absolute; top: 2px; right: 12px; min-width: 16px; height: 16px; border-radius: 8px;
          background: ${likeActive}; color: white; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; padding: 0 3px;
        }
        .community-rail-post-btn {
          display: block; text-align: center; background: ${accent}; color: white; text-decoration: none;
          border: none; border-radius: 12px; padding: 10px 6px; font-weight: 700; font-size: 12px;
          cursor: pointer; margin-bottom: 12px; width: 100%;
        }
        .community-rail-home-link { display: block; text-align: center; color: ${textSecondary}; text-decoration: none; font-size: 11px; }
        .community-main { margin-left: 88px; }
        .community-bottombar { display: none; }
        .community-fab { display: none; }

        @media (max-width: 768px) {
          .community-rail { display: none; }
          .community-main { margin-left: 0; padding-bottom: 76px; }
          .community-bottombar {
            display: flex; position: fixed; left: 0; right: 0; bottom: 0; height: 60px;
            background: #FFFFFF; border-top: 1px solid ${border}; z-index: 50;
          }
          .community-bottombar .community-rail-item { flex: 1; padding: 6px 4px; border-radius: 0; }
          .community-fab {
            display: flex; position: fixed; right: 20px; bottom: 76px; width: 52px; height: 52px;
            border-radius: 26px; background: ${accent}; color: white; border: none; font-size: 26px;
            align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 51; cursor: pointer;
          }
        }
      ` }} />
    </div>
  );
}
