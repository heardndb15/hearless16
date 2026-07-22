import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import axios from "axios";
import { supabase } from "../services/supabase";
import Confetti from "../components/Confetti";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { RootStackParamList } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

type RecognitionResult = {
  gesture: string;
  confidence: number;
  error?: "no_hand_detected" | "invalid_image" | "rate_limited";
  components: {
    hand_shape: number;
    position: number;
    movement: number;
  };
};

// Backend caps /gestures/recognize at 120/minute (2/sec) — polling faster
// than that just means most frames silently get a 429 that this screen used
// to swallow as an indistinguishable "no hand detected", so the feature
// looked broken far more often than it actually was. 600ms keeps a margin
// under the 500ms theoretical minimum.
const RECOGNIZE_POLL_INTERVAL_MS = 600;

const COUNTDOWN_STEPS = ["3", "2", "1", "Начинаем!"];

export default function GesturePracticeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "GesturePractice">>();
  const { gestureId, gestureName } = route.params;
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<"countdown" | "practice" | "result">("countdown");
  const [countdownIdx, setCountdownIdx] = useState(0);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const frameCountRef = useRef(0);
  const [displayFrames, setDisplayFrames] = useState(0);
  const maxConfidenceRef = useRef(0);
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognizeInFlightRef = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const isMatch = result ? result.confidence >= 80 : false;

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdownIdx(0);
    setResult(null);
    frameCountRef.current = 0;
    setDisplayFrames(0);
    maxConfidenceRef.current = 0;

    const timer = setInterval(() => {
      setCountdownIdx((prev) => {
        const next = prev + 1;
        if (next >= COUNTDOWN_STEPS.length) {
          clearInterval(timer);
          setPhase("practice");
          return 0;
        }
        return next;
      });
    }, 800);
    // Store in intervalRef too so the mount effect's cleanup can clear this
    // if the screen unmounts mid-countdown, before the practice-phase effect
    // (the only other place that populates intervalRef) ever runs.
    intervalRef.current = timer;
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startCountdown]);

  useEffect(() => {
    if (phase !== "practice") return;

    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current || recognizeInFlightRef.current) return;
      recognizeInFlightRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.4,
        });
        if (!photo?.base64) return;

        const response = await axios.post(`${API_URL}/gestures/recognize`, {
          image: photo.base64,
          target_gesture: gestureName,
        });

        frameCountRef.current += 1;
        // Update display counter every 5 frames to avoid re-render churn
        if (frameCountRef.current % 5 === 0) {
          setDisplayFrames(frameCountRef.current);
        }

        if (response.data.error === "no_hand_detected") {
          // Show feedback without stopping practice
          setResult({ ...response.data, confidence: 0 });
          return;
        }

        setResult(response.data);
        maxConfidenceRef.current = Math.max(maxConfidenceRef.current, response.data.confidence ?? 0);

        if (response.data.confidence >= 80) {
          handleSuccess(response.data.confidence, frameCountRef.current);
        }
      } catch (err: any) {
        // Tag throttling distinctly instead of leaving the UI on its last
        // (or no) result with no indication anything went wrong.
        if (err?.response?.status === 429) {
          setResult((prev) => ({
            gesture: prev?.gesture ?? "",
            confidence: 0,
            components: prev?.components ?? { hand_shape: 0, position: 0, movement: 0 },
            error: "rate_limited",
          }));
        }
      } finally {
        recognizeInFlightRef.current = false;
      }
    }, RECOGNIZE_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, gestureName]); // totalFrames removed from deps

  async function handleSuccess(confidence: number, frames: number) {
    const bestAccuracy = Math.max(confidence, maxConfidenceRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("result");
    setShowConfetti(true);

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await axios.post(`${API_URL}/gestures/progress`, {
          user_id: session.user.id,
          gesture_id: gestureId,
          learned: true,
          accuracy: confidence,
          attempts: frames,
          best_accuracy: bestAccuracy,   // now tracks actual best across all frames
        }, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (err) {
      console.log("Error saving gesture progress:", err);
    }

    setTimeout(() => setShowConfetti(false), 2500);
  }

  function handleTryAgain() {
    startCountdown();
  }

  function handleGoBack() {
    navigation.goBack();
  }

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionTitle}>Нет доступа к камере</Text>
            <Text style={styles.permissionText}>
              Разрешите доступ к камере, чтобы практиковать жесты
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Разрешить доступ к камере</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const borderColor = phase === "result"
    ? isMatch ? "#22c55e" : Colors.sos
    : "transparent";
  const borderWidth = phase === "result" ? 4 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <SafeAreaView style={styles.container}>
      <Confetti visible={showConfetti} />

      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnim,
          },
        ]}
      />

      <View style={styles.cameraWrap}>
        <View style={[styles.cameraBorder, { borderColor, borderWidth }]}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />

          {phase === "countdown" && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>
                {COUNTDOWN_STEPS[countdownIdx]}
              </Text>
              <Text style={styles.countdownGesture}>
                {gestureName}
              </Text>
            </View>
          )}

          {phase === "practice" && (
            <>
              <View style={styles.practiceOverlay}>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetLabel}>Цель:</Text>
                  <Text style={styles.targetGesture}>{gestureName}</Text>
                </View>
                <Text style={styles.framesText}>Кадров: {displayFrames}</Text>
              </View>
              {result?.error === "no_hand_detected" && (
                <View style={styles.noHandHint}>
                  <Text style={styles.noHandHintText}>Рука не обнаружена</Text>
                </View>
              )}
              {result?.error === "rate_limited" && (
                <View style={styles.noHandHint}>
                  <Text style={styles.noHandHintText}>Сервер перегружен, подождите секунду</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {phase === "result" && result && (
        <View style={styles.resultSection}>
          {result.error === "no_hand_detected" ? (
            <>
              <Text style={[styles.resultTitle, { color: "#1A1A2E" }]}>
                Рука не обнаружена
              </Text>
              <View style={styles.resultCard}>
                <Text style={{ textAlign: "center", color: Colors.textSecondary, fontSize: 14 }}>
                  Убедитесь, что рука видна в кадре и освещение достаточное
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultTitle}>
                {isMatch ? "Жест распознан!" : "Попробуйте ещё раз"}
              </Text>

              <View style={styles.resultCard}>
                <View style={styles.mainResult}>
                  <Text style={styles.resultGesture}>{result.gesture}</Text>
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: isMatch ? "#22c55e" : Colors.sos },
                    ]}
                  >
                    <Text style={styles.confidenceText}>
                      {result.confidence}%
                    </Text>
                  </View>
                </View>

                <Text style={styles.componentsTitle}>Разбивка по компонентам</Text>
                <View style={styles.componentsRow}>
                  <ComponentBar label="Форма руки" value={result.components.hand_shape} />
                  <ComponentBar label="Позиция" value={result.components.position} />
                  <ComponentBar label="Движение" value={result.components.movement} />
                </View>
              </View>
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
              <Text style={styles.tryAgainText}>Попробовать снова</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
              <Text style={styles.backBtnText}>К списку жестов</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase !== "result" && (
        <View style={styles.practiceHint}>
          <Text style={styles.hintText}>
            Покажите жест "{gestureName}" перед камерой
          </Text>
        </View>
      )}
    </SafeAreaView>
    </View>
  );
}

function ComponentBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 50 ? Colors.accent : Colors.sos;
  return (
    <View style={compStyles.wrapper}>
      <Text style={compStyles.label}>{label}</Text>
      <View style={compStyles.bg}>
        <View style={[compStyles.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[compStyles.value, { color }]}>{value}%</Text>
    </View>
  );
}

const compStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    width: 90,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8EDF5',
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  value: {
    width: 44,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraWrap: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.md,
  },
  cameraBorder: {
    borderRadius: 20,
    overflow: "hidden",
  },
  camera: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 16,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "bold",
    color: Colors.white,
  },
  countdownGesture: {
    fontSize: FontSize.title,
    color: Colors.white,
    marginTop: Spacing.md,
    opacity: 0.9,
  },
  practiceOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  targetBadge: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    marginRight: 6,
  },
  targetGesture: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.white,
  },
  framesText: {
    fontSize: 12,
    color: Colors.white,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  noHandHint: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(239,68,68,0.75)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  noHandHintText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#22c55e",
    zIndex: 10,
    pointerEvents: "none",
  },
  resultSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  resultTitle: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  mainResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  resultGesture: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  confidenceBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  confidenceText: {
    fontSize: FontSize.subtitle,
    fontWeight: "bold",
    color: Colors.white,
  },
  componentsTitle: {
    fontSize: FontSize.body,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  componentsRow: {},
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  tryAgainBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1565C0",
    alignItems: "center",
  },
  tryAgainText: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.white,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F4F7FB',
    alignItems: "center",
  },
  backBtnText: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  practiceHint: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  hintText: {
    fontSize: FontSize.subtitle,
    color: "#9CA3AF",
    textAlign: "center",
  },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSize.body,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: FontSize.body,
  },
});
