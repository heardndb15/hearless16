"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

interface Author {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Post {
  id: string;
  text: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  author: Author;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  author: Author;
}

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
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: "linear-gradient(135deg,#0277BD,#0D47A1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 700, fontSize: size * 0.35,
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function PostCard({
  post, currentUserId, token,
  onLike, onDelete, onOpen,
}: {
  post: Post;
  currentUserId: string | null;
  token: string;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (post: Post) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1.5px solid rgba(255,255,255,0.7)",
      borderRadius: 20,
      padding: "20px 24px",
      marginBottom: 16,
      boxShadow: "0 4px 20px rgba(2,136,209,0.08)",
      transition: "box-shadow 0.2s",
    }}>
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={post.author.name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0D47A1" }}>{post.author.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{timeAgo(post.created_at)}</div>
        </div>
        {currentUserId === post.author.id && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1, padding: "0 4px" }}
            >
              ···
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10,
                background: "white", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                border: "1px solid #e2e8f0", minWidth: 140, overflow: "hidden",
              }}>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                  style={{
                    display: "block", width: "100%", padding: "12px 16px", textAlign: "left",
                    background: "none", border: "none", cursor: "pointer", fontSize: 13,
                    color: "#ef4444", fontWeight: 600,
                  }}
                >
                  🗑 Удалить пост
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      <p
        onClick={() => onOpen(post)}
        style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.65, color: "#1e293b", cursor: "pointer" }}
      >
        {post.text}
      </p>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          onClick={() => onOpen(post)}
          style={{ width: "100%", borderRadius: 12, marginBottom: 12, cursor: "pointer", maxHeight: 360, objectFit: "cover" }}
        />
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
        <button
          onClick={() => {
            if (!token) { alert("Войдите, чтобы ставить лайки"); return; }
            onLike(post.id);
          }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            color: post.liked_by_me ? "#ef4444" : "#64748b",
            fontWeight: 600, fontSize: 14, transition: "color 0.15s",
          }}
        >
          <span style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span>
          {post.likes_count}
        </button>
        <button
          onClick={() => onOpen(post)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            color: "#64748b", fontWeight: 600, fontSize: 14,
          }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          {post.comments_count}
        </button>
      </div>
    </div>
  );
}

function PostModal({
  post, token, currentUserId,
  onClose, onLike, onDelete,
}: {
  post: Post;
  token: string;
  currentUserId: string | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/community/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post.id]);

  async function sendComment() {
    if (!commentText.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/community/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentText("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 24, width: "100%", maxWidth: 600,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <Avatar name={post.author.name} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0D47A1" }}>{post.author.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{timeAgo(post.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}>✕</button>
        </div>

        {/* Post content */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", overflowY: "auto", maxHeight: 280 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#1e293b" }}>{post.text}</p>
          {post.image_url && (
            <img src={post.image_url} alt="" style={{ width: "100%", borderRadius: 12, marginTop: 12, objectFit: "cover", maxHeight: 260 }} />
          )}
          <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
            <button
              onClick={() => { if (!token) { alert("Войдите, чтобы ставить лайки"); return; } onLike(post.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: post.liked_by_me ? "#ef4444" : "#64748b", fontWeight: 600, fontSize: 14 }}
            >
              <span style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span> {post.likes_count}
            </button>
            <span style={{ color: "#64748b", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>💬</span> {comments.length}
            </span>
          </div>
        </div>

        {/* Comments */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center" }}>Загрузка...</p>
          ) : comments.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center" }}>Комментариев пока нет</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar name={c.author.name} size={32} />
                <div style={{ flex: 1, background: "#f8fafc", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#0D47A1", marginBottom: 3 }}>{c.author.name}</div>
                  <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.5 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
          {token ? (
            <>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                placeholder="Написать комментарий..."
                style={{
                  flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 12,
                  padding: "10px 14px", fontSize: 14, outline: "none",
                  fontFamily: "inherit", background: "#f8fafc",
                }}
              />
              <button
                onClick={sendComment}
                disabled={sending || !commentText.trim()}
                style={{
                  background: "#0277BD", color: "white", border: "none",
                  borderRadius: 12, padding: "0 18px", fontWeight: 700,
                  cursor: "pointer", fontSize: 14, opacity: (sending || !commentText.trim()) ? 0.5 : 1,
                }}
              >
                {sending ? "..." : "Отправить"}
              </button>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", textAlign: "center", width: "100%" }}>
              <Link href="/login" style={{ color: "#0277BD", fontWeight: 600 }}>Войдите</Link>, чтобы оставить комментарий
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
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "Ошибка при создании поста");
        return;
      }
      const post: Post = await res.json();
      onCreated(post);
      onClose();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 24, width: "100%", maxWidth: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0D47A1" }}>Новый пост</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Что у вас нового?"
            rows={5}
            style={{
              width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 14,
              padding: "14px 16px", fontSize: 15, resize: "vertical", outline: "none",
              fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box",
              background: "#f8fafc",
            }}
          />
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button
              onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#64748b" }}
            >
              Отмена
            </button>
            <button
              onClick={submit}
              disabled={loading || !text.trim()}
              style={{
                padding: "10px 24px", borderRadius: 12, border: "none",
                background: "#0277BD", color: "white", fontWeight: 700, fontSize: 14,
                cursor: "pointer", opacity: (loading || !text.trim()) ? 0.5 : 1,
              }}
            >
              {loading ? "Публикация..." : "Опубликовать"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? "");
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const fetchPosts = useCallback(async (newSort: "new" | "popular", newOffset: number, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const params = new URLSearchParams({ sort: newSort, limit: "20", offset: String(newOffset) });
      const res = await fetch(`${API_URL}/community/posts?${params}`, { headers });
      if (!res.ok) throw new Error();
      const data: Post[] = await res.json();
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 20);
      setOffset(newOffset + data.length);
    } catch {
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setPosts([]);
    setOffset(0);
    fetchPosts(sort, 0, false);
  }, [sort, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) { alert("Войдите в аккаунт, чтобы ставить лайки"); return; }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await fetch(`${API_URL}/community/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      );
    }
    if (selectedPost?.id === postId) {
      setSelectedPost((p) => p ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p);
    }
  }, [token, selectedPost]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm("Удалить пост?")) return;
    try {
      await fetch(`${API_URL}/community/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch {
      alert("Не удалось удалить пост");
    }
  }, [token, selectedPost]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#0D47A1 0%,#0277BD 40%,#0288D1 70%,#26C6DA 100%)",
      paddingTop: 80,
    }}>
      {/* Back link */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 12px" }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
          ← На главную
        </Link>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "white", fontFamily: "'Syne', sans-serif" }}>
              Community
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
              Общайтесь с сообществом Hearless
            </p>
          </div>
          {token ? (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: "white", color: "#0277BD", border: "none",
                borderRadius: 50, padding: "10px 20px", fontWeight: 700,
                fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              + Новый пост
            </button>
          ) : (
            <Link
              href="/login"
              style={{
                background: "white", color: "#0277BD", textDecoration: "none",
                borderRadius: 50, padding: "10px 20px", fontWeight: 700,
                fontSize: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
            >
              Войти
            </Link>
          )}
        </div>

        {/* Sort tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["new", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                padding: "8px 20px", borderRadius: 50, border: "1.5px solid rgba(255,255,255,0.4)",
                background: sort === s ? "white" : "rgba(255,255,255,0.15)",
                color: sort === s ? "#0277BD" : "white",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                backdropFilter: "blur(8px)", transition: "all 0.2s",
              }}
            >
              {s === "new" ? "Новые" : "Популярные"}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{
              width: 44, height: 44, border: "4px solid rgba(255,255,255,0.3)",
              borderTopColor: "white", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Загрузка постов...</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 20,
            padding: "48px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0D47A1" }}>
              Будьте первым — опубликуйте пост!
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                token={token}
                onLike={handleLike}
                onDelete={handleDelete}
                onOpen={setSelectedPost}
              />
            ))}
            {hasMore && (
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <button
                  onClick={() => fetchPosts(sort, offset, true)}
                  disabled={loading}
                  style={{
                    background: "rgba(255,255,255,0.2)", color: "white", border: "1.5px solid rgba(255,255,255,0.4)",
                    borderRadius: 50, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {loading ? "Загрузка..." : "Загрузить ещё"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          token={token}
          currentUserId={currentUserId}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onDelete={handleDelete}
        />
      )}
      {showCreate && (
        <CreatePostModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={(post) => setPosts((prev) => [post, ...prev])}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
