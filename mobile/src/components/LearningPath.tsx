import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Colors, Spacing } from "../constants/theme";

interface Step {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
}

interface Props {
  steps: Step[];
}

export default function LearningPath({ steps }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {steps.map((step, i) => (
        <View key={step.id} style={styles.stepCol}>
          {i > 0 && (
            <View
              style={[
                styles.connector,
                step.done && styles.connectorDone,
              ]}
            />
          )}
          <View
            style={[
              styles.circle,
              step.done && styles.circleDone,
              step.current && styles.circleCurrent,
            ]}
          >
            {step.done ? (
              <Text style={styles.circleIcon}>✓</Text>
            ) : step.current ? (
              <Text style={styles.circleIcon}>
                {steps.indexOf(step) + 1}
              </Text>
            ) : (
              <Text style={styles.circleIcon}>
                {steps.indexOf(step) + 1}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.label,
              step.done && styles.labelDone,
              step.current && styles.labelCurrent,
            ]}
            numberOfLines={1}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  stepCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  connector: {
    width: 32,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: -2,
  },
  connectorDone: {
    backgroundColor: Colors.accent,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: "#22c55e",
  },
  circleCurrent: {
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.button,
  },
  circleIcon: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.white,
  },
  label: {
    position: "absolute",
    top: 44,
    fontSize: 10,
    color: Colors.textSecondary,
    width: 60,
    textAlign: "center",
  },
  labelDone: {
    color: "#22c55e",
    fontWeight: "600",
  },
  labelCurrent: {
    color: Colors.accent,
    fontWeight: "600",
  },
});
