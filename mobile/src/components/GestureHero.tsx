import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors, Spacing, FontSize } from "../constants/theme";

const RING_SIZE = 120;
const STROKE = 8;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  learned: number;
  total: number;
  streak: number;
  practiced: number;
  accuracy: number;
}

export default function GestureHero({
  learned,
  total,
  streak,
  practiced,
  accuracy,
}: Props) {
  const pct = total > 0 ? learned / total : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={Colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={Colors.accent}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringTextWrap}>
            <Text style={styles.ringCount}>{learned}</Text>
            <Text style={styles.ringTotal}>/ {total}</Text>
            <Text style={styles.ringLabel}>изучено</Text>
          </View>
        </View>

        <View style={styles.streakWrap}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{streak}</Text>
          <Text style={styles.streakLabel}>дней подряд</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{learned}</Text>
          <Text style={styles.metricLabel}>Изучено</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{practiced}</Text>
          <Text style={styles.metricLabel}>Практик</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{accuracy}%</Text>
          <Text style={styles.metricLabel}>Точность</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringTextWrap: {
    position: "absolute",
    alignItems: "center",
  },
  ringCount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.heading,
  },
  ringTotal: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  ringLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  streakWrap: {
    alignItems: "center",
  },
  streakIcon: {
    fontSize: 40,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.heading,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  metricItem: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: Colors.heading,
  },
  metricLabel: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
