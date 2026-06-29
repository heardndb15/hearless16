import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { supabase } from "../services/supabase";
import { Colors } from "../constants/theme";
import type { RootStackParamList, PostResponse } from "../../../shared/types";

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
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

interface PostCardProps {
  post: PostResponse;
  currentUserId: string | null;
  onLike: (postId: string) => void;
  onPress: (post: PostResponse) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, currentUserId, onLike, onPress, onDelete }: PostCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(post)}>
      <View style={styles.card}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(post.author.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
          </View>
          {currentUserId === post.author.id && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Удалить пост?", "Это действие нельзя отменить.", [
                  { text: "Отмена", style: "cancel" },
                  { text: "Удалить", style: "destructive", onPress: () => onDelete(post.id) },
                ])
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.moreText}>···</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.postText}>{post.text}</Text>

        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => onLike(post.id)}>
            <Text style={[styles.footerIcon, { color: post.liked_by_me ? "#ef4444" : "#9CA3AF" }]}>♥</Text>
            <Text style={styles.footerCount}>{post.likes_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => onPress(post)}>
            <Text style={[styles.footerIcon, { color: "#1565C0" }]}>💬</Text>
            <Text style={styles.footerCount}>{post.comments_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const loadingRef = useRef(false);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        tokenRef.current = "";
        setCurrentUserId(null);
        setToken("");
      } else if (session?.user) {
        const t = session.access_token ?? "";
        tokenRef.current = t;
        setCurrentUserId(session.user.id);
        setToken(t);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async (
    newSort: "new" | "popular",
    newOffset: number,
    append: boolean,
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const currentToken = tokenRef.current;
      const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      const res = await axios.get<PostResponse[]>(`${API_URL}/community/posts`, {
        params: { sort: newSort, limit: 20, offset: newOffset },
        headers,
        timeout: 15000,
      });
      const data = res.data;
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === 20);
      setOffset(newOffset + data.length);
    } catch {
      if (!append) setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Refetch when the screen comes into focus (e.g. after creating a post)
  useFocusEffect(
    useCallback(() => {
      setPosts([]);
      setOffset(0);
      fetchPosts(sort, 0, false);
    }, [sort, fetchPosts])
  );

  // Re-fetch when sort changes (skip the very first render — useFocusEffect handles that)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPosts([]);
    setOffset(0);
    fetchPosts(sort, 0, false);
  }, [sort, fetchPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(sort, 0, false);
    setRefreshing(false);
  }, [sort, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) {
      fetchPosts(sort, offset, true);
    }
  }, [sort, offset, hasMore, fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) {
      Alert.alert("Войдите в аккаунт", "Чтобы ставить лайки, нужно войти.");
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await axios.post(`${API_URL}/community/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // revert optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      );
    }
  }, [token]);

  const handleDelete = useCallback(async (postId: string) => {
    try {
      await axios.delete(`${API_URL}/community/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      Alert.alert("Ошибка", "Не удалось удалить пост");
    }
  }, [token]);

  const openDetail = useCallback((post: PostResponse) => {
    navigation.navigate("PostDetail", { post });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Комьюнити</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (!token) {
                Alert.alert("Войдите в аккаунт", "Чтобы публиковать посты, нужно войти.");
                return;
              }
              navigation.navigate("CreatePost");
            }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          {(["new", "popular"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
              onPress={() => setSort(s)}
            >
              <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
                {s === "new" ? "Новые" : "Популярные"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onPress={openDetail}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1565C0" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color="#1565C0" size="large" style={{ marginTop: 40 }} />
            ) : error ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>⏳</Text>
                <Text style={styles.emptyText}>
                  Сервер не отвечает. Возможно, он на паузе — подождите 30 сек и нажмите «Повторить».
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => { setPosts([]); setOffset(0); fetchPosts(sort, 0, false); }}
                >
                  <Text style={styles.retryBtnText}>Повторить</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>👋</Text>
                <Text style={styles.emptyText}>Будьте первым — опубликуйте пост!</Text>
              </View>
            )
          }
          ListFooterComponent={
            loading && posts.length > 0 ? (
              <ActivityIndicator color="#1565C0" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "white", fontSize: 24, lineHeight: 28, fontWeight: "600" },
  sortRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginVertical: 10 },
  sortBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F4F7FB" },
  sortBtnActive: { backgroundColor: "#1565C0" },
  sortBtnText: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  sortBtnTextActive: { color: "white" },
  card: {
    marginHorizontal: 16,
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1565C0", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "white", fontSize: 14, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  timeText: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  moreText: { fontSize: 18, color: "#1A1A2E", letterSpacing: 1, paddingHorizontal: 4 },
  postText: { fontSize: 15, color: "#1A1A2E", lineHeight: 22, marginBottom: 8 },
  postImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 10 },
  footer: { flexDirection: "row", gap: 16, marginTop: 4 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 18 },
  footerCount: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 40,
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyText: { fontSize: 16, color: "#1A1A2E", textAlign: "center", fontWeight: "500" },
  retryBtn: { marginTop: 8, backgroundColor: "#1565C0", paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
