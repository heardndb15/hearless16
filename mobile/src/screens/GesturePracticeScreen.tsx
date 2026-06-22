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
  components: {
    hand_shape: number;
    position: number;
    movement: number;
  };
};

const COUNTDOWN_STEPS = ["3", "2", "1", "Начинаем!"];

export default function GesturePracticeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "GesturePractice">>();
  const { gestureId, gestureName } = route.params;
  const [permission] = useCameraPermissions();

  const [phase, setPhase] = useState<"countdown" | "practice" | "result">("countdown");
  const [countdownIdx, setCountdownIdx] = useState(0);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const isMatch = result ? result.confidence >= 80 : false;

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdownIdx(0);
    setResult(null);
    setTotalFrames(0);

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
      if (!cameraRef.current) return;
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

        setResult(response.data);
        const currentFrames = totalFrames + 1;
        setTotalFrames(currentFrames);

        if (response.data.confidence >= 80) {
          handleSuccess(response.data.confidence, currentFrames);
        }
      } catch {}
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, gestureName, totalFrames]);

  async function handleSuccess(confidence: number, frames: number) {
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
          best_accuracy: confidence,
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
    setPhase("countdown");
    setCountdownIdx(0);
    setResult(null);
    setTotalFrames(0);
    startCountdown();
  }

  function handleGoBack() {
    navigation.goBack();
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionTitle}>Нет доступа к камере</Text>
          <Text style={styles.permissionText}>
            Разрешите доступ к камере в настройках для практики жестов
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const borderColor = phase === "result"
    ? isMatch ? "#22c55e" : Colors.sos
    : "transparent";
  const borderWidth = phase === "result" ? 4 : 0;

  return (
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
            <View style={styles.practiceOverlay}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetLabel}>Цель:</Text>
                <Text style={styles.targetGesture}>{gestureName}</Text>
              </View>
              <Text style={styles.framesText}>Кадров: {totalFrames}</Text>
            </View>
          )}
        </View>
      </View>

      {phase === "result" && result && (
        <View style={styles.resultSection}>
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
    backgroundColor: Colors.border,
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
    backgroundColor: Colors.background,
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
    color: Colors.heading,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    color: Colors.heading,
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
    backgroundColor: Colors.accent,
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
    backgroundColor: Colors.card,
    alignItems: "center",
  },
  backBtnText: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
  },
  practiceHint: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  hintText: {
    fontSize: FontSize.subtitle,
    color: Colors.textSecondary,
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
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
