import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { RootStackParamList, Gesture, UserProgress } from "../../../shared/types";
import GestureHero from "../components/GestureHero";
import GestureCard from "../components/GestureCard";
import LearningPath from "../components/LearningPath";
import { supabase } from "../services/supabase";
import axios from "axios";
import { useSubscription } from "../hooks/useSubscription";

type Status = "locked" | "not_learned" | "in_progress" | "learned";

interface GestureData {
  id: string;
  name: string;
  category: string;
  status: Status;
  progress: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

const CATEGORIES = [
  "Все",
  "Базовые",
  "Семья",
  "Еда",
  "Эмоции",
  "Числа",
];

const MOCK_GESTURES: GestureData[] = [
  { id: "1", name: "Здравствуйте", category: "Базовые", status: "learned", progress: 1 },
  { id: "2", name: "Спасибо", category: "Базовые", status: "learned", progress: 1 },
  { id: "3", name: "До свидания", category: "Базовые", status: "in_progress", progress: 0.5 },
  { id: "4", name: "Пожалуйста", category: "Базовые", status: "not_learned", progress: 0 },
  { id: "5", name: "Да", category: "Базовые", status: "not_learned", progress: 0 },
  { id: "6", name: "Нет", category: "Базовые", status: "not_learned", progress: 0 },
  { id: "7", name: "Мама", category: "Семья", status: "not_learned", progress: 0 },
  { id: "8", name: "Папа", category: "Семья", status: "not_learned", progress: 0 },
  { id: "9", name: "Еда", category: "Еда", status: "not_learned", progress: 0 },
  { id: "10", name: "Вода", category: "Еда", status: "not_learned", progress: 0 },
];

const DAILY_GOAL = 5;

const LEARNING_STEPS = [
  { id: "s1", label: "Базовые", done: true, current: false },
  { id: "s2", label: "Семья", done: false, current: true },
  { id: "s3", label: "Еда", done: false, current: false },
  { id: "s4", label: "Эмоции", done: false, current: false },
  { id: "s5", label: "Числа", done: false, current: false },
];

export default function GesturesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { plan } = useSubscription();

  const FREE_CATEGORIES = ["Базовые"];
  const BASIC_CATEGORIES = ["Базовые", "Семья", "Еда", "Числа"];
  // Pro gets all categories

  const isCategoryLocked = (category: string): boolean => {
    if (plan === "pro") return false;
    if (plan === "basic") return !BASIC_CATEGORIES.includes(category);
    return !FREE_CATEGORIES.includes(category);
  };

  const requiredPlanForCategory = (category: string): "basic" | "pro" => {
    if (BASIC_CATEGORIES.includes(category)) return "basic";
    return "pro";
  };

  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [gestures, setGestures] = useState<GestureData[]>(MOCK_GESTURES);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadData() {
        if (isMounted) setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          setIsLoggedIn(!!session?.user);

          // Fetch all gestures from backend database
          const gesturesRes = await axios.get<Gesture[]>(`${API_URL}/gestures`);
          const dbGestures = gesturesRes.data;

          let progressMap: Record<string, UserProgress> = {};
          if (session?.user) {
            // Fetch learning progress from backend database
            const progressRes = await axios.get<UserProgress[]>(`${API_URL}/gestures/progress/${session.user.id}`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            const dbProgress = progressRes.data;
            dbProgress.forEach((p) => {
              progressMap[p.gesture_id] = p;
            });
          }

          const mapped: GestureData[] = dbGestures.map((g) => {
            const prog = progressMap[g.id];
            let status: Status = "not_learned";
            let progVal = 0;
            if (prog) {
              status = prog.learned ? "learned" : "in_progress";
              progVal = prog.accuracy / 100.0;
            }
            return {
              id: g.id,
              name: g.name,
              category: g.category,
              status: status,
              progress: progVal,
            };
          });

          if (isMounted) {
            setGestures(mapped);
          }
        } catch (err) {
          console.log("Error loading gestures from API, using mocks", err);
          // Fallback to local mock data on error, but check auth session anyway
          const { data: { session } } = await supabase.auth.getSession();
          if (isMounted) {
            setIsLoggedIn(!!session?.user);
            setGestures(MOCK_GESTURES);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      loadData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const filteredGestures =
    selectedCategory === "Все"
      ? gestures
      : gestures.filter((g) => g.category === selectedCategory);

  const handleGesturePress = useCallback(
    (id: string) => {
      const g = gestures.find((x) => x.id === id);
      if (!g || g.status === "locked") return;
      if (isCategoryLocked(g.category)) {
        navigation.navigate("Paywall", { requiredPlan: requiredPlanForCategory(g.category) });
        return;
      }
      navigation.navigate("GesturePractice", {
        gestureId: id,
        gestureName: g.name,
      });
    },
    [gestures, navigation, plan]
  );

  const total = gestures.length;
  const learned = gestures.filter((g) => g.status === "learned").length;
  const practiced = gestures.filter((g) => g.status === "learned" || g.status === "in_progress").length;
  const accuracy = 87; // default or average
  const dailyDone = Math.min(DAILY_GOAL, learned);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={styles.container}>
        {/* Blue header bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Жестовый язык</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("GestureDictionary")}
            style={gestDictStyles.dictBtn}
          >
            <Text style={gestDictStyles.dictBtnText}>📖 Словарь</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Казахский жестовый язык (КЖЯ)</Text>

          {!isLoggedIn && (
            <View style={styles.loginBanner}>
              <Text style={styles.loginBannerText}>
                🔑 Войдите в профиль, чтобы сохранять свой прогресс обучения!
              </Text>
            </View>
          )}

          <GestureHero
            learned={learned}
            total={total}
            streak={learned > 0 ? 3 : 0}
            practiced={practiced}
            accuracy={accuracy}
          />

          <View style={styles.dailyGoal}>
            <Text style={styles.dailyGoalTitle}>Цель дня: {DAILY_GOAL} жестов</Text>
            <View style={styles.dailyProgressBg}>
              <View
                style={[
                  styles.dailyProgressFill,
                  { width: `${(dailyDone / DAILY_GOAL) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.dailyGoalCount}>
              {dailyDone} / {DAILY_GOAL}
            </Text>
          </View>

          {loading && (
            <ActivityIndicator size="small" color={Colors.accent} style={{ marginBottom: 12 }} />
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
            style={styles.categoriesList}
          >
            {CATEGORIES.map((cat) => {
              const locked = cat !== "Все" && isCategoryLocked(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    cat === selectedCategory && styles.categoryPillActive,
                  ]}
                  onPress={() => {
                    if (locked) {
                      navigation.navigate("Paywall", { requiredPlan: requiredPlanForCategory(cat) });
                      return;
                    }
                    setSelectedCategory(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      cat === selectedCategory && styles.categoryPillTextActive,
                    ]}
                  >
                    {locked ? "🔒 " : ""}{cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1565C0',
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: FontSize.body,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  loginBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  loginBannerText: {
    color: Colors.accent,
    fontSize: FontSize.body,
    fontWeight: "500",
    textAlign: "center",
  },
  dailyGoal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  dailyGoalTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: "#1A1A2E",
    marginRight: Spacing.md,
  },
  dailyProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8EDF5',
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
    color: "#1A1A2E",
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
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  categoryPillActive: {
    backgroundColor: "#1565C0",
  },
  categoryPillText: {
    fontSize: FontSize.body,
    color: "#1A1A2E",
  },
  categoryPillTextActive: {
    color: "#ffffff",
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
    color: "#1A1A2E",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
});

const gestDictStyles = StyleSheet.create({
  dictBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dictBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
});
