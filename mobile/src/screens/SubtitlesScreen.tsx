import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import axios from "axios";
import { useStreamingRecording } from "../hooks/useStreamingRecording";
import { Colors, Spacing } from "../constants/theme";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const SETTINGS_KEY = "hearless:subtitle_settings";
const SPEAKER_COLORS = ["#22d3ee", "#fdeb47", "#4ade80", "#f472b6"] as const;

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
          textShadowColor: "rgba(0, 0, 0, 0.4)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
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
    streamSegments,
    chunks,
    error,
    startStreaming,
    stopStreaming,
  } = useStreamingRecording();

  // Display settings — loaded from AsyncStorage
  const [fontSize, setFontSize] = useState(28);
  const [textColor, setTextColor] = useState("#22d3ee");
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [alignment, setAlignment] = useState<"center" | "left">("center");
  const [speakerMode, setSpeakerMode] = useState(false);
  const settingsLoadedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.textColor) setTextColor(s.textColor);
        if (typeof s.bgOpacity === "number") setBgOpacity(s.bgOpacity);
        if (s.alignment) setAlignment(s.alignment);
        if (s.speakerMode !== undefined) setSpeakerMode(s.speakerMode);
      } catch {}
      settingsLoadedRef.current = true;
    });
  }, []);

  // Save settings whenever they change (after initial load)
  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ fontSize, textColor, bgOpacity, alignment, speakerMode })
    ).catch(() => {});
  }, [fontSize, textColor, bgOpacity, alignment, speakerMode]);

  const [fullScreen, setFullScreen] = useState(false);

  const [settingsVisible, setSettingsVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [history, setHistory] = useState<Array<{ id: string; text: string; created_at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "history") return;
    setHistoryLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setHistoryLoading(false);
        return;
      }
      axios
        .get(`${API_URL}/subtitles/${session.user.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        .then((res) => {
          setHistory(res.data || []);
        })
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    });
  }, [activeTab]);

  const [showPanel, setShowPanel] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settingsVisible) {
      setShowPanel(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowPanel(false));
    }
  }, [settingsVisible]);

  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      ringScale.setValue(1);
      ringOpacity.setValue(0.5);
      Animated.loop(
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
    }
  }, [isRecording]);

  const getRollingLines = () => {
    if (!streamText.trim()) return [];
    const sentences = streamText.match(/[^.!?\n]+[.!?\n]*/g) || [streamText];
    return sentences.map(s => s.trim()).filter(Boolean).slice(-6);
  };
  const rollingLines = getRollingLines();
  const hasContent = rollingLines.length > 0;

  async function handleRecord() {
    if (isRecording) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }

  const getBgStyle = (opacity: number) => {
    if (opacity === 0) {
      return {
        backgroundColor: "transparent",
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
      };
    }
    return {
      backgroundColor: `rgba(15, 23, 42, ${opacity})`, // Slate dark display
      borderColor: "rgba(255, 255, 255, 0.08)",
      borderWidth: 1,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Субтитры</Text>
          <Text style={styles.subtitle}>Речь преобразуется в текст в реальном времени</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsToggle, settingsVisible && styles.settingsToggleActive]}
          onPress={() => setSettingsVisible(!settingsVisible)}
        >
          <Text style={{ fontSize: 18, color: settingsVisible ? Colors.white : Colors.heading }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(["live", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "live" ? "В реальном времени" : "История"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "live" && (
        <>
          {showPanel && (
            <Animated.View style={[styles.settingsPanel, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
              <Text style={styles.settingsPanelTitle}>Настройки отображения</Text>

              {/* Font Size */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Размер текста</Text>
                <View style={styles.settingOptions}>
                  {[18, 22, 28, 36].map((sz) => (
                    <TouchableOpacity
                      key={sz}
                      style={[styles.optionBtn, fontSize === sz && styles.optionBtnActive]}
                      onPress={() => setFontSize(sz)}
                    >
                      <Text style={[styles.optionText, fontSize === sz && styles.optionTextActive]}>{sz}px</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Text Color */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Цвет текста</Text>
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
                <Text style={styles.settingLabel}>Задний фон</Text>
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
                <Text style={styles.settingLabel}>Выравнивание</Text>
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

              {/* Speaker colors toggle */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Разные говорящие</Text>
                <View style={styles.settingOptions}>
                  {[
                    { key: "off", label: "Выкл" },
                    { key: "on",  label: "Вкл"  },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionBtn, (speakerMode ? "on" : "off") === opt.key && styles.optionBtnActive]}
                      onPress={() => setSpeakerMode(opt.key === "on")}
                    >
                      <Text style={[styles.optionText, (speakerMode ? "on" : "off") === opt.key && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          <View style={styles.subtitleArea}>
            {hasContent ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setFullScreen(true)}
                style={{ width: "100%" }}
              >
                <View style={[styles.subtitleCard, getBgStyle(bgOpacity)]}>
                  <Text style={{ textAlign: alignment, lineHeight: fontSize * 1.5 }}>
                    {speakerMode && streamSegments.length > 0
                      ? streamSegments.map((seg, i) => (
                          <Text
                            key={`seg-${i}`}
                            style={{
                              fontSize,
                              color: SPEAKER_COLORS[seg.speaker % 4],
                              fontWeight: "bold",
                            }}
                          >
                            {seg.text}{" "}
                          </Text>
                        ))
                      : rollingLines.map((line, i) => {
                          const isLast = i === rollingLines.length - 1;
                          const fadedColor = bgOpacity === 0
                            ? "rgba(33, 69, 89, 0.25)"
                            : "rgba(255, 255, 255, 0.25)";
                          return (
                            <Text
                              key={`${line}-${i}`}
                              style={{
                                fontSize,
                                color: isLast ? textColor : fadedColor,
                                fontWeight: isLast ? "bold" : "500",
                              }}
                            >
                              {line}{" "}
                            </Text>
                          );
                        })}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderIcon}>{error ? "⚠️" : "🎙️"}</Text>
                <Text style={[styles.placeholderText, error ? { color: Colors.sos } : null]}>
                  {error
                    ? error
                    : isRecording
                    ? "Слушаю вашу речь..."
                    : "Нажмите кнопку микрофона ниже и говорите"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.controlsContainer}>
            <View style={styles.buttonContainer}>
              {isRecording && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: ringScale }],
                      opacity: ringOpacity,
                    },
                  ]}
                />
              )}
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingActive,
                ]}
                onPress={handleRecord}
              >
                <Text style={styles.recordButtonIcon}>
                  {isRecording ? "⏹" : "🎤"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.recordLabel}>
              {isRecording ? "Идет прослушивание..." : "Нажмите, чтобы говорить"}
            </Text>
          </View>
        </>
      )}

      {activeTab === "history" && (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
          ) : history.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📋</Text>
              <Text style={styles.placeholderText}>История пуста. Запишите первый разговор!</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>
                  <Text style={styles.historyText} numberOfLines={4}>{item.text}</Text>
                </View>
              )}
            />
          )}
        </View>
      )}

      {fullScreen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFullScreen(false)}
          style={styles.fullScreenOverlay}
        >
          <StatusBar hidden />
          <View style={styles.fullScreenContent}>
            <Text style={{ textAlign: "center", lineHeight: fontSize * 1.6 }}>
              {rollingLines.map((line, i) => {
                const isLast = i === rollingLines.length - 1;
                return (
                  <Text
                    key={`fs-${line}-${i}`}
                    style={{
                      fontSize: fontSize + 8,
                      color: isLast ? textColor : "rgba(255,255,255,0.3)",
                      fontWeight: isLast ? "bold" : "400",
                    }}
                  >
                    {line}{" "}
                  </Text>
                );
              })}
            </Text>
            <Text style={styles.fullScreenHint}>Нажмите, чтобы выйти</Text>
          </View>
        </TouchableOpacity>
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
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.heading,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingsToggle: {
    backgroundColor: "rgba(33, 69, 89, 0.06)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsToggleActive: {
    backgroundColor: Colors.accent,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(33, 69, 89, 0.06)",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  settingsPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(33, 69, 89, 0.1)",
    borderRadius: 24,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  settingsPanelTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.heading,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
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
    backgroundColor: "rgba(33, 69, 89, 0.05)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionBtnActive: {
    backgroundColor: Colors.accent,
  },
  optionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "bold",
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
    borderRadius: 24,
    padding: Spacing.xl,
    minHeight: 240,
    justifyContent: "center",
    width: width - Spacing.md * 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  line: {
    marginVertical: 4,
  },
  placeholderCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.xl,
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    width: width - Spacing.md * 2,
    borderWidth: 1,
    borderColor: "rgba(33, 69, 89, 0.08)",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 240,
  },
  controlsContainer: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  buttonContainer: {
    position: "relative",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.sos,
  },
  recordButton: {
    backgroundColor: Colors.button,
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingActive: {
    backgroundColor: Colors.sos,
    shadowColor: Colors.sos,
  },
  recordButtonIcon: {
    color: Colors.white,
    fontSize: 24,
  },
  recordLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(33, 69, 89, 0.08)",
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  historyText: {
    fontSize: 14,
    color: Colors.heading,
    lineHeight: 20,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  fullScreenContent: {
    alignItems: "center",
  },
  fullScreenHint: {
    position: "absolute",
    bottom: -60,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginTop: 24,
  },
});
