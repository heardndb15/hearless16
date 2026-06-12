import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { RootStackParamList } from "../../../shared/types";
import GestureHero from "../components/GestureHero";
import GestureCard from "../components/GestureCard";
import LearningPath from "../components/LearningPath";

type Status = "locked" | "not_learned" | "in_progress" | "learned";

interface GestureData {
  id: string;
  name: string;
  category: string;
  status: Status;
  progress: number;
}

const CATEGORIES = [
  "Все",
  "Алфавит",
  "Цифры",
  "Приветствия",
  "Экстренные",
  "Общие",
  "Цвета",
];

const MOCK_GESTURES: GestureData[] = [
  { id: "1", name: "А", category: "Алфавит", status: "learned", progress: 1 },
  { id: "2", name: "Б", category: "Алфавит", status: "learned", progress: 1 },
  { id: "3", name: "В", category: "Алфавит", status: "in_progress", progress: 0.6 },
  { id: "4", name: "Г", category: "Алфавит", status: "not_learned", progress: 0 },
  { id: "5", name: "Д", category: "Алфавит", status: "locked", progress: 0 },
  { id: "6", name: "0", category: "Цифры", status: "learned", progress: 1 },
  { id: "7", name: "1", category: "Цифры", status: "learned", progress: 1 },
  { id: "8", name: "2", category: "Цифры", status: "in_progress", progress: 0.4 },
  { id: "9", name: "3", category: "Цифры", status: "not_learned", progress: 0 },
  { id: "10", name: "Здравствуйте", category: "Приветствия", status: "learned", progress: 1 },
  { id: "11", name: "Спасибо", category: "Приветствия", status: "learned", progress: 1 },
  { id: "12", name: "До свидания", category: "Приветствия", status: "in_progress", progress: 0.5 },
  { id: "13", name: "Помогите", category: "Экстренные", status: "not_learned", progress: 0 },
  { id: "14", name: "Опасно", category: "Экстренные", status: "locked", progress: 0 },
  { id: "15", name: "Вода", category: "Общие", status: "learned", progress: 1 },
  { id: "16", name: "Еда", category: "Общие", status: "in_progress", progress: 0.3 },
  { id: "17", name: "Красный", category: "Цвета", status: "locked", progress: 0 },
  { id: "18", name: "Синий", category: "Цвета", status: "locked", progress: 0 },
  { id: "19", name: "Да", category: "Общие", status: "learned", progress: 1 },
  { id: "20", name: "Нет", category: "Общие", status: "learned", progress: 1 },
  { id: "21", name: "Пожалуйста", category: "Приветствия", status: "learned", progress: 1 },
  { id: "22", name: "Извините", category: "Приветствия", status: "not_learned", progress: 0 },
  { id: "23", name: "Врач", category: "Экстренные", status: "not_learned", progress: 0 },
  { id: "24", name: "Полиция", category: "Экстренные", status: "locked", progress: 0 },
  { id: "25", name: "Радость", category: "Общие", status: "in_progress", progress: 0.7 },
  { id: "26", name: "Грусть", category: "Общие", status: "not_learned", progress: 0 },
  { id: "27", name: "Сто", category: "Цифры", status: "locked", progress: 0 },
  { id: "28", name: "Тысяча", category: "Цифры", status: "locked", progress: 0 },
  { id: "29", name: "Белый", category: "Цвета", status: "locked", progress: 0 },
  { id: "30", name: "Чёрный", category: "Цвета", status: "locked", progress: 0 },
];

const TOTAL = 78;
const LEARNED = MOCK_GESTURES.filter((g) => g.status === "learned").length;
const PRACTICED = MOCK_GESTURES.filter(
  (g) => g.status === "learned" || g.status === "in_progress"
).length;
const ACCURACY = 87;

const DAILY_GOAL = 5;
const DAILY_DONE = 3;

const LEARNING_STEPS = [
  { id: "s1", label: "Алфавит", done: true, current: false },
  { id: "s2", label: "Цифры", done: true, current: false },
  { id: "s3", label: "Приветствия", done: false, current: true },
  { id: "s4", label: "Экстренные", done: false, current: false },
  { id: "s5", label: "Общие", done: false, current: false },
  { id: "s6", label: "Цвета", done: false, current: false },
];

export default function GesturesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [gestures, setGestures] = useState(MOCK_GESTURES);

  const filteredGestures =
    selectedCategory === "Все"
      ? gestures
      : gestures.filter((g) => g.category === selectedCategory);

  const handleGesturePress = useCallback(
    (id: string) => {
      const g = gestures.find((x) => x.id === id);
      if (!g || g.status === "locked") return;
      if (g.status === "learned") return;
      navigation.navigate("GesturePractice", {
        gestureId: id,
        gestureName: g.name,
      });
    },
    [gestures, navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Жестовый язык</Text>
          <Text style={styles.subtitle}>Казахский жестовый язык (КЖЯ)</Text>
        </View>

        <GestureHero
          learned={LEARNED}
          total={TOTAL}
          streak={7}
          practiced={PRACTICED}
          accuracy={ACCURACY}
        />

        <View style={styles.dailyGoal}>
          <Text style={styles.dailyGoalTitle}>Цель дня: {DAILY_GOAL} жестов</Text>
          <View style={styles.dailyProgressBg}>
            <View
              style={[
                styles.dailyProgressFill,
                { width: `${(DAILY_DONE / DAILY_GOAL) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.dailyGoalCount}>
            {DAILY_DONE} / {DAILY_GOAL}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          style={styles.categoriesList}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                cat === selectedCategory && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  cat === selectedCategory && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {filteredGestures.map((gesture) => (
            <GestureCard
              key={gesture.id}
              name={gesture.name}
              category={gesture.category}
              status={gesture.status}
              progress={gesture.progress}
              onPress={() => handleGesturePress(gesture.id)}
            />
          ))}
        </View>

        <View style={styles.pathSection}>
          <Text style={styles.pathTitle}>Путь обучения</Text>
          <LearningPath steps={LEARNING_STEPS} />
        </View>
      </ScrollView>
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
  dailyGoal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dailyGoalTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
    marginRight: Spacing.md,
  },
  dailyProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  dailyProgressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  dailyGoalCount: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
    marginLeft: Spacing.sm,
  },
  categoriesList: {
    maxHeight: 40,
    marginBottom: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryPillText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  categoryPillTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  pathSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  pathTitle: {
    fontSize: FontSize.title,
    fontWeight: "600",
    color: Colors.heading,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
