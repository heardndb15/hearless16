import React, { useRef, useEffect } from "react";
import { View, Text, Animated, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";

type Status = "locked" | "not_learned" | "in_progress" | "learned";

interface Props {
  name: string;
  category: string;
  status: Status;
  progress: number;
  onPress: () => void;
}

export default function GestureCard({
  name,
  category,
  status,
  progress,
  onPress,
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPress();
  }

  const barColor =
    status === "learned"
      ? "#22c55e"
      : status === "in_progress"
      ? Colors.accent
      : Colors.border;

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fade, transform: [{ translateY: translate }, { scale }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.inner}
      >
        <View style={styles.imageWrap}>
          <Text style={styles.gestureEmoji}>🤟</Text>
          {status === "locked" && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
          {status === "learned" && (
            <View style={styles.checkOverlay}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.tagWrap}>
          <Text style={styles.tagText}>{category}</Text>
        </View>

        <View style={styles.progressBg}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: barColor }]}
          />
        </View>

        <Text style={styles.statusLabel}>
          {status === "learned"
            ? "Изучен"
            : status === "in_progress"
            ? "В процессе"
            : status === "locked"
            ? "Закрыт"
            : "Не начат"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    marginBottom: Spacing.md,
  },
  inner: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  imageWrap: {
    height: 100,
    backgroundColor: "#e6f1f8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  gestureEmoji: {
    fontSize: 44,
  },
  lockOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    fontSize: 14,
  },
  checkOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  name: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
    marginBottom: 4,
  },
  tagWrap: {
    alignSelf: "flex-start",
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  statusLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
