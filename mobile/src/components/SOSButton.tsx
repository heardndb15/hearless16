import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "../constants/theme";
import * as Location from "expo-location";
import axios from "axios";
import { supabase } from "../services/supabase";

const SOS_COLOR = "#ef4444";
const HOLD_DURATION = 2000;
const AUTO_SEND_DURATION = 5000;
const RING_SIZE = 140;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SOSButton() {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoTimer, setAutoTimer] = useState(AUTO_SEND_DURATION / 1000);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearHapticTimers() {
    hapticTimersRef.current.forEach(clearTimeout);
    hapticTimersRef.current = [];
  }

  function startHaptics() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    hapticTimersRef.current.push(
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 1000)
    );

    hapticTimersRef.current.push(
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, HOLD_DURATION)
    );
  }

  const animateProgress = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const p = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(p);

    if (p < 1) {
      rafRef.current = requestAnimationFrame(animateProgress);
    }
  }, []);

  const handlePressIn = useCallback(() => {
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    startHaptics();

    rafRef.current = requestAnimationFrame(animateProgress);

    holdTimerRef.current = setTimeout(() => {
      handleHoldComplete();
    }, HOLD_DURATION);
  }, [animateProgress]);

  const handlePressOut = useCallback(() => {
    setIsHolding(false);
    clearHapticTimers();
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setProgress(0);
  }, []);

  function handleHoldComplete() {
    setIsHolding(false);
    clearHapticTimers();
    setProgress(1);
    setShowConfirm(true);
    setAutoTimer(AUTO_SEND_DURATION / 1000);

    autoTimerRef.current = setInterval(() => {
      setAutoTimer((prev) => {
        if (prev <= 1) {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current);
          handleSendSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendSOS() {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    setShowConfirm(false);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert("Пожалуйста, войдите в профиль для отправки SOS сигнала!");
        return;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 0;
      let lng = 0;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
      await axios.post(`${API_URL}/sos/alert`, {
        user_id: session.user.id,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      alert("SOS сигнал бедствия успешно отправлен!");
    } catch (err) {
      console.log("Error sending SOS:", err);
      alert("Не удалось отправить SOS сигнал.");
    }
  }

  function handleCancel() {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    setShowConfirm(false);
    setProgress(0);
  }

  useEffect(() => {
    return () => {
      clearHapticTimers();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={SOS_COLOR}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
        </View>

        <TouchableOpacity
          style={[styles.button, isHolding && styles.buttonHolding]}
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.buttonText}>SOS</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Отправить SOS?</Text>
            <Text style={styles.modalSubtitle}>
              Сигнал бедствия будет отправлен вашим контактам
            </Text>
            <Text style={styles.modalTimer}>Автоотправка через {autoTimer}с</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleSendSOS}>
                <Text style={styles.sendText}>Да</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    marginBottom: 16,
  },
  ringContainer: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSvg: {
    transform: [{ rotate: "-90deg" }],
  },
  button: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: SOS_COLOR,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: SOS_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonHolding: {
    backgroundColor: "#dc2626",
    transform: [{ scale: 1.05 }],
  },
  buttonText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 32,
    alignItems: "center",
    width: 320,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.heading,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  modalTimer: {
    fontSize: 28,
    fontWeight: "bold",
    color: SOS_COLOR,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SOS_COLOR,
    alignItems: "center",
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});
