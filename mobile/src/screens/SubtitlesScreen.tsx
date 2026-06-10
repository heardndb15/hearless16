import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRecording } from "../hooks/useRecording";
import { transcribeAudio } from "../services/whisper";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { SubtitleEntry } from "../../../shared/types";

export default function SubtitlesScreen() {
  const { isRecording, startRecording, stopRecording } = useRecording();
  const [transcribedText, setTranscribedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<SubtitleEntry[]>([]);

  async function handleRecord() {
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        setIsProcessing(true);
        try {
          const text = await transcribeAudio(uri);
          setTranscribedText(text);
          setHistory((prev) => [
            { id: Date.now().toString(), user_id: "", text, created_at: new Date().toISOString() },
            ...prev,
          ]);
        } catch (err) {
          setTranscribedText("Ошибка распознавания. Попробуйте снова.");
        } finally {
          setIsProcessing(false);
        }
      }
    } else {
      await startRecording();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Субтитры</Text>
        <Text style={styles.subtitle}>Речь преобразуется в текст</Text>
      </View>

      <View style={styles.subtitleCard}>
        <Text style={styles.subtitleText}>
          {transcribedText || "Нажмите кнопку микрофона и говорите..."}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingActive]}
        onPress={handleRecord}
      >
        <Text style={styles.recordButtonText}>
          {isProcessing ? "⏳ Обработка..." : isRecording ? "⏹ Остановить" : "🎤 Запись"}
        </Text>
      </TouchableOpacity>

      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>История разговоров</Text>
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text style={styles.historyText}>{item.text}</Text>
              </View>
            )}
          />
        </View>
      )}
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
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: Colors.heading,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  subtitleCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    minHeight: 160,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  subtitleText: {
    fontSize: FontSize.subtitleLarge,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 48,
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
    fontSize: FontSize.subtitle,
    fontWeight: "600",
  },
  historySection: {
    flex: 1,
    marginTop: Spacing.lg,
  },
  historyTitle: {
    fontSize: FontSize.title,
    fontWeight: "600",
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  historyItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
});
