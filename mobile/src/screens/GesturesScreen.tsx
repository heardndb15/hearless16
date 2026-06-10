import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { Gesture } from "../../../shared/types";

const CATEGORIES = ["Базовые", "Семья", "Еда", "Эмоции", "Числа"];

const MOCK_GESTURES: Gesture[] = [
  { id: "1", name: "Здравствуйте", category: "Базовые", image_url: "", difficulty: "easy" },
  { id: "2", name: "Спасибо", category: "Базовые", image_url: "", difficulty: "easy" },
  { id: "3", name: "Мама", category: "Семья", image_url: "", difficulty: "easy" },
  { id: "4", name: "Папа", category: "Семья", image_url: "", difficulty: "easy" },
  { id: "5", name: "Вкусно", category: "Еда", image_url: "", difficulty: "medium" },
  { id: "6", name: "Вода", category: "Еда", image_url: "", difficulty: "easy" },
  { id: "7", name: "Радость", category: "Эмоции", image_url: "", difficulty: "medium" },
  { id: "8", name: "Один", category: "Числа", image_url: "", difficulty: "hard" },
];

export default function GesturesScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Базовые");

  const filteredGestures = MOCK_GESTURES.filter(
    (g) => g.category === selectedCategory
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Жестовый язык</Text>
        <Text style={styles.subtitle}>Казахский жестовый язык (КЖЯ)</Text>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              item === selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryChipText,
                item === selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredGestures}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gestureRow}
        contentContainerStyle={styles.gesturesList}
        renderItem={({ item }) => (
          <View style={styles.gestureCard}>
            <View style={styles.gestureImagePlaceholder}>
              <Text style={styles.gestureEmoji}>🤟</Text>
            </View>
            <Text style={styles.gestureName}>{item.name}</Text>
            <Text style={styles.gestureDifficulty}>
              {item.difficulty === "easy"
                ? "Легко"
                : item.difficulty === "medium"
                ? "Средне"
                : "Сложно"}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: Colors.heading,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  categoriesList: {
    maxHeight: 48,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  gesturesList: {
    padding: Spacing.md,
  },
  gestureRow: {
    justifyContent: "space-between",
  },
  gestureCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
    width: "48%",
    marginBottom: Spacing.md,
  },
  gestureImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  gestureEmoji: {
    fontSize: 36,
  },
  gestureName: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
    marginBottom: Spacing.xs,
  },
  gestureDifficulty: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
});
