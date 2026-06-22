import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useStreamingRecording } from "../hooks/useStreamingRecording";
import { Colors, Spacing } from "../constants/theme";

const { width } = Dimensions.get("window");

function AnimatedLine({
  text,
  index,
  fontSize,
  textColor,
  alignment,
}: {
  text: string;
  index: number;
  fontSize: number;
  textColor: string;
  alignment: "center" | "left";
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (index > 0) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20 * index,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [index]);

  return (
    <Animated.Text
      style={[
        styles.line,
        {
          opacity,
          transform: [{ translateY }],
          fontSize,
          color: textColor,
          textAlign: alignment,
          lineHeight: fontSize * 1.4,
        },
      ]}
      numberOfLines={2}
    >
      {text}
    </Animated.Text>
  );
}

export default function SubtitlesScreen() {
  const {
    isRecording,
    streamText,
    chunks,
    startStreaming,
    stopStreaming,
  } = useStreamingRecording();

  const [fontSize, setFontSize] = useState(22); // 18, 22, 28, 36
  const [textColor, setTextColor] = useState("#f3f8fc"); // White, Yellow, Cyan, Green
  const [bgOpacity, setBgOpacity] = useState(0.85); // 0.85, 0.5, 0
  const [alignment, setAlignment] = useState<"center" | "left">("center");
  const [settingsVisible, setSettingsVisible] = useState(false);

  const recentChunks = chunks.slice(-3);
  const hasContent = recentChunks.length > 0 || streamText.length > 0;

  async function handleRecord() {
    if (isRecording) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }

  const getBgColor = (opacity: number) => {
    if (opacity === 0) return "transparent";
    return `rgba(33, 69, 89, ${opacity})`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Субтитры</Text>
        <Text style={styles.subtitle}>Речь преобразуется в текст в реальном времени</Text>
        <TouchableOpacity
          style={styles.settingsToggle}
          onPress={() => setSettingsVisible(!settingsVisible)}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {settingsVisible && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsPanelTitle}>Настройки отображения</Text>
          
          {/* Font Size */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Размер:</Text>
            <View style={styles.settingOptions}>
              {[18, 22, 28, 36].map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[styles.optionBtn, fontSize === sz && styles.optionBtnActive]}
                  onPress={() => setFontSize(sz)}
                >
                  <Text style={[styles.optionText, fontSize === sz && styles.optionTextActive]}>{sz}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Color */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Цвет текста:</Text>
            <View style={styles.settingOptions}>
              {[
                { code: "#ffffff", name: "Бел" },
                { code: "#fdeb47", name: "Желт" },
                { code: "#22d3ee", name: "Циан" },
                { code: "#4ade80", name: "Зел" }
              ].map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.optionBtn, textColor === c.code && styles.optionBtnActive]}
                  onPress={() => setTextColor(c.code)}
                >
                  <Text style={[styles.optionText, textColor === c.code && styles.optionTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Background Opacity */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Задний фон:</Text>
            <View style={styles.settingOptions}>
              {[
                { opacity: 0.85, label: "Темн" },
                { opacity: 0.5, label: "Полупр" },
                { opacity: 0, label: "Без фона" }
              ].map((bg) => (
                <TouchableOpacity
                  key={bg.opacity}
                  style={[styles.optionBtn, bgOpacity === bg.opacity && styles.optionBtnActive]}
                  onPress={() => setBgOpacity(bg.opacity)}
                >
                  <Text style={[styles.optionText, bgOpacity === bg.opacity && styles.optionTextActive]}>{bg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Alignment */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Выравнивание:</Text>
            <View style={styles.settingOptions}>
              {[
                { key: "center", label: "Центр" },
                { key: "left", label: "Лево" }
              ].map((align) => (
                <TouchableOpacity
                  key={align.key}
                  style={[styles.optionBtn, alignment === align.key && styles.optionBtnActive]}
                  onPress={() => setAlignment(align.key as any)}
                >
                  <Text style={[styles.optionText, alignment === align.key && styles.optionTextActive]}>{align.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.subtitleArea}>
        {hasContent ? (
          <View style={[styles.subtitleCard, { backgroundColor: getBgColor(bgOpacity) }]}>
            {recentChunks.map((chunk, i) => (
              <AnimatedLine
                key={`${chunk.text}-${i}`}
                text={chunk.text}
                index={recentChunks.length - 1 - i}
                fontSize={fontSize}
                textColor={textColor}
                alignment={alignment}
              />
            ))}
          </View>
        ) : (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              {isRecording
                ? "Слушаю..."
                : "Нажмите кнопку микрофона и говорите..."}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordingActive,
        ]}
        onPress={handleRecord}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? "⏹ Остановить" : "🎤 Запись"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  header: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.heading,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  settingsToggle: {
    position: "absolute",
    right: 8,
    top: 22,
    backgroundColor: "rgba(33, 69, 89, 0.08)",
    padding: 8,
    borderRadius: 20,
  },
  settingsPanel: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingsPanelTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  settingLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    flex: 1,
  },
  settingOptions: {
    flexDirection: "row",
    gap: 6,
  },
  optionBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionBtnActive: {
    backgroundColor: Colors.accent,
  },
  optionText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  optionTextActive: {
    color: Colors.white,
  },
  subtitleArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  subtitleCard: {
    borderRadius: 16,
    padding: Spacing.lg,
    minHeight: 200,
    justifyContent: "center",
    width: width - Spacing.md * 2,
  },
  line: {
    marginVertical: 4,
  },
  placeholderCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    width: width - Spacing.md * 2,
  },
  placeholderText: {
    fontSize: 22,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  recordButton: {
    backgroundColor: Colors.button,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 32,
    alignSelf: "center",
    marginVertical: Spacing.md,
  },
  recordingActive: {
    backgroundColor: Colors.sos,
  },
  recordButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
