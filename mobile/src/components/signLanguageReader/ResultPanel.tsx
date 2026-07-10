import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";
import type { Quality } from "../../hooks/useSignLanguageReader";

const QUALITY_LABEL: Record<Quality, string> = {
  none: "Наведите камеру на руки",
  low: "Низкое качество",
  medium: "Среднее качество",
  high: "Хорошее качество",
};

const QUALITY_COLOR: Record<Quality, string> = {
  none: "#9CA3AF",
  low: "#ef4444",
  medium: "#F5A623",
  high: "#22c55e",
};

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.timing(scale, { toValue: 0.92, duration: 100, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[styles.actionBtn, disabled && styles.actionBtnDisabled, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.actionBtnInner}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
      >
        <Text style={styles.actionIcon}>{icon}</Text>
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  sentence: string;
  quality: Quality;
  onClear: () => void;
  onCopy: () => void;
  onSpeak: () => void;
}

export default function ResultPanel({ sentence, quality, onClear, onCopy, onSpeak }: Props) {
  const hasText = sentence.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.qualityRow}>
        <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLOR[quality] }]} />
        <Text style={styles.qualityLabel}>{QUALITY_LABEL[quality]}</Text>
      </View>

      <ScrollView style={styles.textBox} contentContainerStyle={styles.textBoxContent}>
        <Text style={hasText ? styles.sentenceText : styles.placeholderText}>
          {hasText ? sentence : "Распознанный текст появится здесь"}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <ActionButton icon="🗑️" label="Очистить" onPress={onClear} disabled={!hasText} />
        <ActionButton icon="📋" label="Копировать" onPress={onCopy} disabled={!hasText} />
        <ActionButton icon="🔊" label="Озвучить" onPress={onSpeak} disabled={!hasText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: Spacing.lg,
    margin: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  qualityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  qualityLabel: {
    fontSize: FontSize.body,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  textBox: {
    minHeight: 80,
    maxHeight: 160,
    marginBottom: Spacing.lg,
  },
  textBoxContent: {
    paddingVertical: Spacing.sm,
  },
  sentenceText: {
    fontSize: FontSize.heading,
    fontWeight: "700",
    color: Colors.heading,
    lineHeight: 34,
  },
  placeholderText: {
    fontSize: FontSize.subtitle,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnInner: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.listBackground,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.heading,
  },
});
