import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { Colors, Spacing, FontSize, GRADIENT_COLORS, GRADIENT_LOCATIONS, GlassCard } from "../constants/theme";
import type { Gesture, RootStackParamList } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

const CATEGORIES = ["Все", "Базовые", "Семья", "Еда", "Эмоции", "Числа"];

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
};
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#4ade80",
  medium: "#fdeb47",
  hard: "#f87171",
};

export default function GestureDictionaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Gesture | null>(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/gestures`)
      .then((res) => setGestures(res.data || []))
      .catch(() => setGestures([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = gestures.filter((g) => {
    const matchCat = category === "Все" || g.category === category;
    const matchQ = query.trim() === "" || g.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const handlePractice = useCallback((g: Gesture) => {
    setSelected(null);
    navigation.navigate("GesturePractice", { gestureId: g.id, gestureName: g.name });
  }, [navigation]);

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{flex:1}} start={{x:0,y:0}} end={{x:0,y:1}}>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Словарь жестов</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Поиск жеста..."
        placeholderTextColor={Colors.textSecondary}
        value={query}
        onChangeText={setQuery}
      />

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.chip, cat === category && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, cat === category && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(g) => g.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item: g }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(g)}>
              {g.gif_url ? (
                <Image
                  source={{ uri: g.gif_url }}
                  style={styles.cardGif}
                  contentFit="contain"
                  autoplay
                />
              ) : (
                <View style={[styles.cardGif, styles.cardGifPlaceholder]}>
                  <Text style={styles.cardGifPlaceholderText}>🤟</Text>
                </View>
              )}
              <Text style={styles.cardName}>{g.name}</Text>
              <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLOR[g.difficulty] + "33" }]}>
                <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[g.difficulty] }]}>
                  {DIFFICULTY_LABEL[g.difficulty] ?? g.difficulty}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selected && (
              <>
                {selected.gif_url ? (
                  <Image
                    source={{ uri: selected.gif_url }}
                    style={styles.modalGif}
                    contentFit="contain"
                    autoplay
                  />
                ) : (
                  <View style={[styles.modalGif, styles.cardGifPlaceholder]}>
                    <Text style={{ fontSize: 64 }}>🤟</Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selected.name}</Text>
                <Text style={styles.modalCategory}>{selected.category}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.practiceBtn} onPress={() => handlePractice(selected)}>
                    <Text style={styles.practiceBtnText}>Практиковать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: FontSize.body, color: "#ffffff", fontWeight: "600" },
  title: { fontSize: FontSize.title, fontWeight: "bold", color: "#ffffff" },
  search: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.body,
    color: Colors.heading,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  chipsRow: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  chipActive: { backgroundColor: "#0277BD", borderColor: "#0277BD" },
  chipText: { fontSize: 12, color: "#ffffff", fontWeight: "600" },
  chipTextActive: { color: Colors.white },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 32, gap: 12 },
  card: {
    flex: 1,
    ...GlassCard,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
    margin: 4,
  },
  cardGif: { width: 100, height: 100, borderRadius: 10, marginBottom: 8 },
  cardGifPlaceholder: {
    backgroundColor: "rgba(2,136,209,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardGifPlaceholderText: { fontSize: 40 },
  cardName: { fontSize: FontSize.subtitle, fontWeight: "700", color: Colors.heading, textAlign: "center" },
  diffBadge: { marginTop: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  diffText: { fontSize: 11, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    ...GlassCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 28,
    alignItems: "center",
    paddingBottom: 48,
  },
  modalGif: { width: 200, height: 200, borderRadius: 16, marginBottom: 16 },
  modalName: { fontSize: 28, fontWeight: "bold", color: Colors.heading, marginBottom: 4 },
  modalCategory: { fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  practiceBtn: {
    flex: 1,
    backgroundColor: "#0277BD",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  practiceBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.subtitle },
  closeBtn: {
    flex: 1,
    backgroundColor: "rgba(13,71,161,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { color: Colors.heading, fontWeight: "600", fontSize: FontSize.subtitle },
});
