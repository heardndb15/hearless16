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

const GlassCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
} as const;
import { StatusBar } from "expo-status-bar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSubscription } from "../hooks/useSubscription";
import { useSubtitleTimer } from "../hooks/useSubtitleTimer";
import type { RootStackParamList } from "../../../shared/types";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { plan } = useSubscription();
  const { remainingSeconds, recordUsage, isLimitReached } = useSubtitleTimer(plan);

  // Track recording duration
  const recordingStartRef = React.useRef<number | null>(null);

  const {
    isRecording,
    isConnecting,
    streamText,
    streamSegments,
    chunks,
    error,
    startStreaming,
    stopStreaming,
    warmup,
  } = useStreamingRecording();

  // Pre-warm WS connection when screen comes into focus so the server
  // is already awake by the time the user presses record.
  useFocusEffect(
    React.useCallback(() => {
      warmup();
    }, [warmup])
  );

  React.useEffect(() => {
    if (isRecording) {
      recordingStartRef.current = Date.now();
    } else if (recordingStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      recordUsage(elapsed);
      recordingStartRef.current = null;
    }
  }, [isRecording]);

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
    if (!isRecording && isLimitReached) {
      navigation.navigate("Paywall", { requiredPlan: plan === "free" ? "basic" : "pro" });
      return;
    }
    if (isRecording) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }

  const getBgStyle = (opacity: number) => {
    if (opacity === 0) {
      return { backgroundColor: 'transparent', borderWidth: 0 };
    }
    const alpha = opacity < 0.5 ? 0.5 : opacity;
    return {
      backgroundColor: `rgba(255, 255, 255, ${alpha})`,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
    };
  };

  return (
    <View style={{flex:1, backgroundColor:'#FFFFFF'}}>
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
          <Text style={{ fontSize: 18, color: Colors.white }}>⚙️</Text>
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
                          const fadedColor = "rgba(13,71,161,0.35)";
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
                <View style={styles.placeholderIconWrap}>
                  <Text style={{ fontSize: 28 }}>{error ? "⚠️" : "🎙️"}</Text>
                </View>
                <Text style={[styles.placeholderText, error ? { color: Colors.sos } : null]}>
                  {error
                    ? error
                    : isConnecting
                    ? "Подключение к серверу..."
                    : isRecording
                    ? "Слушаю вашу речь..."
                    : "Нажмите кнопку микрофона ниже и говорите"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.controlsContainer}>
            {plan !== "pro" && remainingSeconds !== Infinity && (
              <Text style={styles.timerText}>
                {isLimitReached
                  ? "Дневной лимит исчерпан"
                  : `Осталось: ${Math.floor(remainingSeconds / 60)} мин`}
              </Text>
            )}
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
                  isConnecting && { opacity: 0.6 },
                ]}
                onPress={handleRecord}
                disabled={isConnecting}
              >
                <Text style={styles.recordButtonIcon}>
                  {isConnecting ? "⏳" : isRecording ? "⏹" : "🎤"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.recordLabel}>
              {isConnecting
                ? "Подключение..."
                : isRecording
                ? "Идет прослушивание..."
                : "Нажмите, чтобы говорить"}
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
              <View style={styles.placeholderIconWrap}>
                <Text style={{ fontSize: 28 }}>📋</Text>
              </View>
              <Text style={styles.placeholderText}>История пуста. Запишите первый разговор!</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <View style={styles.historyDateBadge}>
                    <Text style={styles.historyDate}>
                      {new Date(item.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                  </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  settingsToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#0277BD",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  settingsPanel: {
    ...GlassCard,
    borderRadius: 24,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
    backgroundColor: "rgba(13,71,161,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionBtnActive: {
    backgroundColor: Colors.accent,
  },
  optionText: {
    fontSize: 11,
    color: Colors.heading,
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
    ...GlassCard,
    borderRadius: 24,
    padding: Spacing.xl,
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    width: width - Spacing.md * 2,
  },
  placeholderIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(2,136,209,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.heading,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 240,
  },
  controlsContainer: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  timerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.sos,
  },
  recordButton: {
    backgroundColor: "#0277BD",
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0277BD",
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
    color: "rgba(255,255,255,0.85)",
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  historyCard: {
    ...GlassCard,
    borderRadius: 16,
    padding: Spacing.md,
  },
  historyDateBadge: {
    backgroundColor: "rgba(2,136,209,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  historyDate: {
    fontSize: 11,
    color: "#0277BD",
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
