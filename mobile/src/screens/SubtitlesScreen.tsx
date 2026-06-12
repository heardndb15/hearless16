import React, { useEffect, useRef } from "react";
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

function AnimatedLine({ text, index }: { text: string; index: number }) {
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
        { opacity, transform: [{ translateY }] },
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

  const recentChunks = chunks.slice(-3);
  const hasContent = recentChunks.length > 0 || streamText.length > 0;

  async function handleRecord() {
    if (isRecording) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Субтитры</Text>
        <Text style={styles.subtitle}>Речь преобразуется в текст в реальном времени</Text>
      </View>

      <View style={styles.subtitleArea}>
        {hasContent ? (
          <View style={styles.subtitleCard}>
            {recentChunks.map((chunk, i) => (
              <AnimatedLine
                key={`${chunk.text}-${i}`}
                text={chunk.text}
                index={recentChunks.length - 1 - i}
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
  subtitleArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  subtitleCard: {
    backgroundColor: "rgba(33, 69, 89, 0.85)",
    borderRadius: 16,
    padding: Spacing.lg,
    minHeight: 200,
    justifyContent: "center",
    width: width - Spacing.md * 2,
  },
  line: {
    color: "#f3f8fc",
    fontSize: 22,
    textAlign: "center",
    lineHeight: 32,
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
