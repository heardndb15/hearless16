import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import axios from "axios";
import { supabase } from "../services/supabase";
import { Colors } from "../constants/theme";
import type { RootStackParamList, PostResponse, CommentResponse } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч`;
  return `${Math.floor(hours / 24)}д`;
}

function initials(name: string): string {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const [post, setPost] = useState<PostResponse>(route.params.post);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      setToken(session?.access_token ?? "");
    });
  }, []);

  useEffect(() => {
    axios
      .get<CommentResponse[]>(`${API_URL}/community/posts/${post.id}/comments`)
      .then((r) => setComments(r.data))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [post.id]);

  const handleLike = useCallback(async () => {
    if (!token) return;
    setPost((p) => ({
      ...p,
      liked_by_me: !p.liked_by_me,
      likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
    }));
    try {
      await axios.post(
        `${API_URL}/community/posts/${post.id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // revert optimistic update
      setPost((p) => ({
        ...p,
        liked_by_me: !p.liked_by_me,
        likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
      }));
    }
  }, [token, post.id]);

  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || !token || sending) return;
    setSending(true);
    try {
      const res = await axios.post<CommentResponse>(
        `${API_URL}/community/posts/${post.id}/comments`,
        { text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => [...prev, res.data]);
      setPost((p) => ({ ...p, comments_count: p.comments_count + 1 }));
      setCommentText("");
    } catch {
      Alert.alert("Ошибка", "Не удалось отправить комментарий");
    } finally {
      setSending(false);
    }
  }, [commentText, token, sending, post.id]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await axios.delete(`${API_URL}/community/comments/${commentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPost((p) => ({ ...p, comments_count: Math.max(0, p.comments_count - 1) }));
      } catch {
        Alert.alert("Ошибка", "Не удалось удалить комментарий");
      }
    },
    [token]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Blue header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Назад</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Пост</Text>
          <View style={{ width: 60 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Post card */}
            <View style={styles.card}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(post.author.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{post.author.name}</Text>
                  <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
                </View>
              </View>

              <Text style={styles.postText}>{post.text}</Text>

              {post.image_url ? (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.postImage}
                  contentFit="cover"
                />
              ) : null}

              <View style={styles.footer}>
                <TouchableOpacity style={styles.footerBtn} onPress={handleLike}>
                  <Text
                    style={[
                      styles.footerIcon,
                      { color: post.liked_by_me ? "#ef4444" : "#9CA3AF" },
                    ]}
                  >
                    ♥
                  </Text>
                  <Text style={styles.footerCount}>{post.likes_count}</Text>
                </TouchableOpacity>
                <View style={styles.footerBtn}>
                  <Text style={[styles.footerIcon, { color: "#1565C0" }]}>💬</Text>
                  <Text style={styles.footerCount}>{post.comments_count}</Text>
                </View>
              </View>
            </View>

            {/* Comments section */}
            <Text style={styles.sectionTitle}>Комментарии</Text>

            {loadingComments ? (
              <ActivityIndicator color="#1565C0" style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>Комментариев пока нет</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentCard}>
                  <View style={styles.authorRow}>
                    <View style={[styles.avatar, styles.avatarSm]}>
                      <Text style={[styles.avatarText, { fontSize: 11 }]}>
                        {initials(c.author.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.authorName}>{c.author.name}</Text>
                      <Text style={styles.timeText}>{timeAgo(c.created_at)}</Text>
                    </View>
                    {currentUserId === c.author.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(c.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "700" }}>
                          ×
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Comment input bar */}
          <View style={styles.inputRow}>
            {token ? (
              <>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Написать комментарий..."
                  placeholderTextColor="#9CA3AF"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (!commentText.trim() || sending) && { opacity: 0.5 },
                  ]}
                  onPress={handleSendComment}
                  disabled={!commentText.trim() || sending}
                >
                  <Text style={styles.sendBtnText}>→</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.loginPrompt}>Войдите, чтобы оставить комментарий</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1565C0',
  },
  backText: { color: "white", fontSize: 16, fontWeight: "600" },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "700" },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1565C0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSm: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: "white", fontSize: 13, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  timeText: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  postText: { fontSize: 15, color: "#1A1A2E", lineHeight: 22, marginBottom: 8 },
  postImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 10 },
  footer: { flexDirection: "row", gap: 16, marginTop: 4 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 18 },
  footerCount: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyComments: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  commentCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  commentText: { fontSize: 14, color: "#1A1A2E", lineHeight: 20, marginTop: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A1A2E",
    maxHeight: 80,
    backgroundColor: '#F4F7FB',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1565C0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: "white", fontSize: 20, fontWeight: "700" },
  loginPrompt: {
    flex: 1,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    paddingVertical: 12,
  },
});
