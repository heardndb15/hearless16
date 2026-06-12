import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import * as Location from "expo-location";
import axios from "axios";
import { Colors } from "../constants/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const REPEAT_INTERVAL = 5 * 60 * 1000;

export default function SilentSOS() {
  const [active, setActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendingRef = useRef(false);

  async function getLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
    } catch {
      return null;
    }
  }

  async function sendSilentSOS() {
    if (sendingRef.current) return;
    sendingRef.current = true;

    try {
      const loc = await getLocation();
      if (!loc) return;

      await axios.post(`${API_URL}/sos/silent`, {
        user_id: "unknown",
        lat: loc.lat,
        lng: loc.lng,
        timestamp: new Date().toISOString(),
      });
    } catch {
    } finally {
      sendingRef.current = false;
    }
  }

  function handleActivate() {
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setActive(true);
    await sendSilentSOS();
    intervalRef.current = setInterval(sendSilentSOS, REPEAT_INTERVAL);
  }

  function handleDeactivate() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActive(false);
    setShowStop(false);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <>
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.button}
          onPress={active ? () => setShowStop(true) : handleActivate}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>🤫</Text>
        </TouchableOpacity>
        {active && <View style={styles.indicator} />}
      </View>

      {active && (
        <View style={styles.badge}>
          <Text style={styles.badgeDot}>●</Text>
          <Text style={styles.badgeText}>Тихий SOS активен</Text>
        </View>
      )}

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalIcon}>🤫</Text>
            <Text style={styles.modalTitle}>Тихий SOS</Text>
            <Text style={styles.modalSubtitle}>
              Геолокация будет отправлена вашим контактам без звука и вибрации.
              Повтор каждые 5 минут до отмены.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleConfirm}
              >
                <Text style={styles.sendText}>Активировать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStop}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStop(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Остановить Тихий SOS?</Text>
            <Text style={styles.modalSubtitle}>
              Отправка геолокации будет прекращена
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStop(false)}
              >
                <Text style={styles.cancelText}>Нет</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: Colors.sos }]}
                onPress={handleDeactivate}
              >
                <Text style={styles.sendText}>Остановить</Text>
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
    marginLeft: 16,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  icon: {
    fontSize: 28,
  },
  indicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.sos,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  badgeDot: {
    fontSize: 10,
    color: Colors.sos,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
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
    marginBottom: 24,
    lineHeight: 20,
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
    backgroundColor: Colors.accent,
    alignItems: "center",
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});
