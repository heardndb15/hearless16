import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Alert,
} from "react-native";
import { useStreamingRecording } from "../hooks/useStreamingRecording";
import { Colors, Spacing, FontSize } from "../constants/theme";
import { supabase } from "../services/supabase";
import axios from "axios";
import type { StudyLecture } from "../../../shared/types";
import { useSubscription } from "../hooks/useSubscription";
import { PremiumGate } from "../components/PremiumGate";

const { width } = Dimensions.get("window");

const DEFAULT_API_URL = "https://hearless16-1.onrender.com";
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const BACKEND_WS = process.env.EXPO_PUBLIC_WS_URL || API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/transcribe";

export default function StudyScreen() {
  const { plan, loading: subscriptionLoading } = useSubscription();
  const canViewHistory = plan === "basic" || plan === "pro";

  const [userId, setUserId] = useState<string | null>(null);
  const [lectures, setLectures] = useState<StudyLecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<StudyLecture | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "record" | "details">("list");
  const [loading, setLoading] = useState(true);

  // Recording & Analysis states
  const {
    isRecording,
    streamText,
    startStreaming,
    stopStreaming,
  } = useStreamingRecording({ skipAutoSave: true });

  const [aiStatus, setAiStatus] = useState<"ready" | "analyzing">("ready");
  const [lectureTitle, setLectureTitle] = useState("");
  const [analysisResult, setAnalysisResult] = useState<StudyLecture["highlights"] | null>(null);

  // Tab selection inside details view
  const [detailTab, setDetailTab] = useState<"summary" | "highlights" | "terms" | "transcript" | "chat">("summary");

  // Chat states
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollViewRef = React.useRef<ScrollView | null>(null);

  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
  }, [selectedLecture]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        fetchLectures(data.user.id);
      }
    });
  }, []);

  // Redirect free users to record mode once subscription is known
  useEffect(() => {
    if (!subscriptionLoading && !canViewHistory) {
      setViewMode("record");
      setLoading(false);
    }
  }, [subscriptionLoading, canViewHistory]);

  async function fetchLectures(uid: string) {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await axios.get(`${API_URL}/study/lectures/${uid}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      setLectures(res.data);
    } catch (e) {
      console.log("Error loading lectures:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordToggle() {
    if (isRecording) {
      stopStreaming();
    } else {
      setAnalysisResult(null);
      setLectureTitle("");
      startStreaming();
    }
  }

  async function handleAnalyze() {
    if (isRecording) {
      stopStreaming();
    }

    if (!streamText.trim()) {
      Alert.alert("Внимание", "Текст лекции пуст. Запишите что-нибудь перед анализом.");
      return;
    }

    setAiStatus("analyzing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.post(`${API_URL}/study/analyze`, {
        transcript: streamText,
      }, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      setAnalysisResult(response.data);
      const dateStr = new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      setLectureTitle(`Лекция от ${dateStr}`);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось проанализировать лекцию.");
      console.log(e);
    } finally {
      setAiStatus("ready");
    }
  }

  async function handleSave() {
    if (!userId || !analysisResult || !streamText.trim()) return;

    try {
      const payload = {
        user_id: userId,
        title: lectureTitle || "Без названия",
        transcript: streamText,
        summary: analysisResult.summary,
        highlights: analysisResult,
      };

      const { data: { session } } = await supabase.auth.getSession();
      await axios.post(`${API_URL}/study/lectures`, payload, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      fetchLectures(userId);
      setViewMode("list");
      setAnalysisResult(null);
      setLectureTitle("");
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось сохранить лекцию.");
    }
  }

  async function handleSendChatMessage() {
    if (!chatInput.trim() || !selectedLecture || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const historyToSend = chatMessages.slice(-10);

      const response = await axios.post(`${API_URL}/study/chat`, {
        transcript: selectedLecture.transcript,
        message: userMsg,
        history: historyToSend,
      }, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      setChatMessages((prev) => [...prev, { role: "assistant", content: response.data.response }]);
    } catch (e) {
      console.log("Error in mobile chat assistant:", e);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Ошибка соединения с ИИ-помощником." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      "Удаление конспекта",
      "Вы действительно хотите удалить эту лекцию?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              await axios.delete(`${API_URL}/study/lectures/${id}`, {
                headers: {
                  Authorization: `Bearer ${session?.access_token || ""}`,
                },
              });
              if (userId) fetchLectures(userId);
              setViewMode("list");
              setSelectedLecture(null);
            } catch (e) {
              Alert.alert("Ошибка", "Не удалось удалить лекцию.");
            }
          },
        },
      ]
    );
  }

  if (loading && viewMode === "list" && !lectures.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Загрузка лекций...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <SafeAreaView style={styles.container}>
      {/* Blue header */}
      <View style={styles.header}>
        <Text style={styles.title}>Учёба</Text>
        <Text style={styles.subtitle}>Запись и ИИ-анализ лекций</Text>
      </View>

      {/* Main switch views */}
      {viewMode === "list" && (
        <PremiumGate requiredPlan="basic" currentPlan={plan}>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#1565C0" />
              <Text style={styles.loadingText}>Загрузка лекций...</Text>
            </View>
          ) : lectures.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderText}>🎓 У вас пока нет сохраненных лекций</Text>
              <Text style={styles.placeholderSubtitle}>
                Нажмите кнопку ниже, чтобы записать аудио лекции. ИИ выделит главное, термины и сделает выжимку.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setViewMode("record")}
              >
                <Text style={styles.actionButtonText}>Записать лекцию</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: Spacing.md }}>
              <TouchableOpacity
                style={[styles.actionButton, { marginVertical: Spacing.md }]}
                onPress={() => setViewMode("record")}
              >
                <Text style={styles.actionButtonText}>+ Записать новую лекцию</Text>
              </TouchableOpacity>

              {lectures.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.lectureCard}
                  onPress={() => {
                    setSelectedLecture(item);
                    setViewMode("details");
                    setDetailTab("summary");
                  }}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardDate}>
                      {new Date(item.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSummary} numberOfLines={3}>
                    {item.summary || item.transcript}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>
                      📖 {item.highlights?.key_terms?.length || 0} терминов
                    </Text>
                    <Text style={styles.cardLink}>Открыть →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        </PremiumGate>
      )}

      {viewMode === "record" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: Spacing.md }}>
          <View style={styles.recordBox}>
            <Text style={styles.recordBoxStatus}>
              {isRecording ? "🔴 Идет запись..." : "⚪ Готов к записи"}
            </Text>

            <View style={styles.transcriptContainer}>
              {streamText.trim() ? (
                <Text style={styles.transcriptText}>{streamText}</Text>
              ) : (
                <Text style={styles.transcriptPlaceholder}>
                  {isRecording
                    ? "Слушаю речь преподавателя и транскрибирую в реальном времени..."
                    : "Нажмите кнопку микрофона ниже для начала"}
                </Text>
              )}
            </View>

            <View style={styles.recordRow}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonActive]}
                onPress={handleRecordToggle}
              >
                <Text style={styles.micButtonText}>
                  {isRecording ? "⏹ Стоп" : "🎤 Старт"}
                </Text>
              </TouchableOpacity>

              {streamText.trim() !== "" && (
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleAnalyze}
                >
                  <Text style={styles.analyzeButtonText}>Анализ ИИ ✨</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {aiStatus === "analyzing" && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingBoxText}>ИИ структурирует конспект лекции...</Text>
            </View>
          )}

          {analysisResult && aiStatus !== "analyzing" && (
            <View style={styles.analysisResultBox}>
              <Text style={styles.sectionHeader}>Конспект готов!</Text>

              <Text style={styles.inputLabel}>Название лекции:</Text>
              <TextInput
                style={styles.titleInput}
                value={lectureTitle}
                onChangeText={setLectureTitle}
                placeholder="Например: Лекция по Биологии №1"
              />

              <Text style={styles.inputLabel}>Сводка лекции:</Text>
              <Text style={styles.summaryResultText}>{analysisResult.summary}</Text>

              <View style={styles.metaBadgeRow}>
                <Text style={styles.metaBadge}>
                  ✓ {analysisResult.highlights?.length || 0} тезисов
                </Text>
                <Text style={[styles.metaBadge, { backgroundColor: "#f3e8ff", color: "#a855f7" }]}>
                  🔑 {analysisResult.key_terms?.length || 0} терминов
                </Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Сохранить в конспекты</Text>
              </TouchableOpacity>
            </View>
          )}

          {canViewHistory && (
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => {
                stopStreaming();
                setViewMode("list");
              }}
            >
              <Text style={styles.backLinkText}>← Отмена и возврат</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {viewMode === "details" && selectedLecture && (
        <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backHeader}
            onPress={() => {
              setSelectedLecture(null);
              setViewMode("list");
            }}
          >
            <Text style={styles.backHeaderText}>← Назад к списку</Text>
          </TouchableOpacity>

          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>
              {new Date(selectedLecture.created_at).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.detailTitle}>{selectedLecture.title}</Text>

            {/* Custom Tab Switcher */}
            <View style={styles.tabsContainer}>
              {[
                { key: "summary", label: "Сводка" },
                { key: "highlights", label: "Тезисы" },
                { key: "terms", label: "Термины" },
                { key: "transcript", label: "Текст" },
                { key: "chat", label: "Чат" },
              ].map((tb) => (
                <TouchableOpacity
                  key={tb.key}
                  style={[styles.tabBtn, detailTab === tb.key && styles.tabBtnActive]}
                  onPress={() => setDetailTab(tb.key as any)}
                >
                  <Text style={[styles.tabBtnText, detailTab === tb.key && styles.tabBtnTextActive]}>
                    {tb.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Details Content Scroll */}
            {detailTab === "chat" ? (
              <View style={{ flex: 1, marginTop: Spacing.sm }}>
                <ScrollView
                  ref={chatScrollViewRef}
                  style={{ flex: 1, marginBottom: 8 }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                  onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  <View style={styles.chatWelcomeBubble}>
                    <Text style={styles.chatWelcomeText}>
                      💬 Привет! Спросите меня о содержании этой лекции.
                    </Text>
                  </View>
                  {chatMessages.map((msg, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.chatBubble,
                        msg.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatBubbleText,
                          msg.role === "user" ? styles.chatBubbleTextUser : styles.chatBubbleTextAssistant,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  ))}
                  {chatLoading && (
                    <View style={[styles.chatBubble, styles.chatBubbleAssistant, { flexDirection: "row", gap: 6, alignItems: "center" }]}>
                      <ActivityIndicator size="small" color={Colors.accent} />
                      <Text style={[styles.chatBubbleText, styles.chatBubbleTextAssistant]}>Думаю...</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatTextInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Вопрос ИИ..."
                    placeholderTextColor={Colors.textSecondary}
                    editable={!chatLoading}
                  />
                  <TouchableOpacity
                    style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnDisabled]}
                    onPress={handleSendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    <Text style={styles.chatSendBtnText}>Отправить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView style={styles.tabContentContainer}>
                {detailTab === "summary" && (
                  <View style={styles.summaryTabBox}>
                    <Text style={styles.tabHeader}>ИИ-Резюме лекции</Text>
                    <Text style={styles.tabBodyText}>
                      {selectedLecture.summary || selectedLecture.highlights?.summary}
                    </Text>
                  </View>
                )}

                {detailTab === "highlights" && (
                  <View style={styles.listTabBox}>
                    <Text style={styles.tabHeader}>Ключевые моменты</Text>
                    {selectedLecture.highlights?.highlights?.map((hl, index) => (
                      <View key={index} style={styles.highlightBulletRow}>
                        <Text style={styles.bulletCheck}>✓</Text>
                        <Text style={styles.bulletText}>{hl}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {detailTab === "terms" && (
                  <View style={styles.listTabBox}>
                    <Text style={styles.tabHeader}>Новые понятия и определения</Text>
                    {selectedLecture.highlights?.key_terms?.map((term, index) => (
                      <View key={index} style={styles.termItemCard}>
                        <Text style={styles.termTitle}>🔑 {term.term}</Text>
                        <Text style={styles.termDefinition}>{term.definition}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {detailTab === "transcript" && (
                  <View style={styles.summaryTabBox}>
                    <Text style={styles.tabHeader}>Полный расшифрованный текст</Text>
                    <Text style={[styles.tabBodyText, styles.rawTranscriptText]}>
                      {selectedLecture.transcript}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.deleteLectureBtn}
              onPress={() => handleDelete(selectedLecture.id)}
            >
              <Text style={styles.deleteLectureBtnText}>Удалить конспект лекции</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 14,
    color: '#1565C0',
    marginTop: Spacing.sm,
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1565C0',
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    fontWeight: "600",
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    marginVertical: Spacing.xl,
    marginHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  placeholderSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: Spacing.lg,
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: "#1565C0",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  lectureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  cardDate: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.accent,
    backgroundColor: "rgba(21,101,192,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    paddingTop: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFooterText: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.textSecondary,
  },
  cardLink: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.accent,
  },
  recordBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  recordBoxStatus: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: '#F4F7FB',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  transcriptContainer: {
    minHeight: 150,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: Spacing.sm,
  },
  transcriptText: {
    color: "#1A1A2E",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 24,
  },
  transcriptPlaceholder: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  recordRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.lg,
  },
  micButton: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  micButtonActive: {
    backgroundColor: Colors.sos,
  },
  micButtonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 13,
  },
  analyzeButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  analyzeButtonText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 13,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: "center",
    marginVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingBoxText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#9CA3AF",
    marginTop: Spacing.sm,
  },
  analysisResultBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E8EDF5',
    backgroundColor: '#F4F7FB',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: Spacing.md,
  },
  summaryResultText: {
    fontSize: 12,
    color: "#1A1A2E",
    fontWeight: "600",
    lineHeight: 18,
    backgroundColor: '#F4F7FB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: Spacing.md,
  },
  metaBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  metaBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.accent,
    backgroundColor: "rgba(21,101,192,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: "#10b981",
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 13,
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: Spacing.md,
  },
  backLinkText: {
    fontSize: 12,
    color: "#1565C0",
    fontWeight: "bold",
  },
  backHeader: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.sm,
  },
  backHeaderText: {
    fontSize: 12,
    color: "#1565C0",
    fontWeight: "bold",
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  detailDate: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.accent,
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: Spacing.md,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: '#F4F7FB',
    padding: 3,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#1565C0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabBtnTextActive: {
    color: Colors.white,
    fontWeight: "700",
  },
  tabContentContainer: {
    flex: 1,
  },
  summaryTabBox: {
    padding: 4,
  },
  listTabBox: {
    padding: 4,
  },
  tabHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: Spacing.sm,
  },
  tabBodyText: {
    fontSize: 13,
    color: "#1A1A2E",
    lineHeight: 20,
    fontWeight: "600",
  },
  rawTranscriptText: {
    backgroundColor: '#F4F7FB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  highlightBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  bulletCheck: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "bold",
    marginRight: Spacing.sm,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: "#1A1A2E",
    lineHeight: 18,
    fontWeight: "600",
  },
  termItemCard: {
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 12,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  termTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  termDefinition: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    fontWeight: "600",
  },
  deleteLectureBtn: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  deleteLectureBtnText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },
  chatWelcomeBubble: {
    backgroundColor: "rgba(21,101,192,0.08)",
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 4,
  },
  chatWelcomeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A2E",
    lineHeight: 18,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "85%",
  },
  chatBubbleUser: {
    backgroundColor: "#1565C0",
    alignSelf: "flex-end",
  },
  chatBubbleAssistant: {
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    alignSelf: "flex-start",
  },
  chatBubbleText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  chatBubbleTextUser: {
    color: Colors.white,
  },
  chatBubbleTextAssistant: {
    color: "#1A1A2E",
  },
  chatInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  chatTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    backgroundColor: '#F4F7FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  chatSendBtn: {
    backgroundColor: "#1565C0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  chatSendBtnDisabled: {
    backgroundColor: "rgba(21,101,192,0.4)",
  },
  chatSendBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "bold",
  },
});
