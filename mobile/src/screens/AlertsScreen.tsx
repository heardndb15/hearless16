import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, FontSize } from "../constants/theme";
import SilentSOS from "../components/SilentSOS";
import { supabase } from "../services/supabase";
import axios from "axios";
import type { SoundAlert } from "../../../shared/types";

interface AlertConfig {
  key: string;
  label: string;
  icon: string;
  enabled: boolean;
}

const SOUND_TYPES: AlertConfig[] = [
  { key: "fire", label: "Пожарная сигнализация", icon: "🔥", enabled: true },
  { key: "door", label: "Звонок в дверь", icon: "🚪", enabled: true },
  { key: "phone", label: "Телефонный звонок", icon: "📞", enabled: true },
  { key: "car", label: "Автомобильный гудок", icon: "🚗", enabled: false },
  { key: "alarm", label: "Будильник", icon: "⏰", enabled: true },
  { key: "baby", label: "Плач ребёнка", icon: "👶", enabled: true },
];

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

const MOCK_HISTORY: SoundAlert[] = [
  {
    id: "1",
    user_id: "mock",
    sound_type: "fire",
    detected_at: "2026-06-11T10:30:00Z",
  },
  {
    id: "2",
    user_id: "mock",
    sound_type: "door",
    detected_at: "2026-06-11T09:15:00Z",
  },
];

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState(SOUND_TYPES);
  const [history, setHistory] = useState<SoundAlert[]>(MOCK_HISTORY);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function checkAuthAndFetchHistory() {
        if (isMounted) setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const loggedIn = !!session?.user;
          if (isMounted) {
            setIsLoggedIn(loggedIn);
            setUserId(session?.user?.id || null);
          }

          if (session?.user) {
            const response = await axios.get(`${API_URL}/alerts/${session.user.id}`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            if (isMounted) {
              setHistory(response.data);
            }
          } else {
            if (isMounted) {
              setHistory(MOCK_HISTORY);
            }
          }
        } catch (err) {
          console.log("Error loading alerts from API, using mocks", err);
          if (isMounted) {
            setHistory(MOCK_HISTORY);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      }

      checkAuthAndFetchHistory();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  function toggleAlert(key: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.key === key ? { ...a, enabled: !a.enabled } : a))
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7FB' }}>
    <SafeAreaView style={styles.container}>
      {/* Blue header */}
      <View style={styles.header}>
        <Text style={styles.title}>Звуковые оповещения</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: Spacing.md }}>
        {!isLoggedIn && (
          <View style={styles.loginBanner}>
            <Text style={styles.loginBannerText}>
              🔑 Войдите в профиль, чтобы сохранять историю звуков!
            </Text>
          </View>
        )}

        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Типы звуков</Text>
          {alerts.map((alert) => (
            <View key={alert.key} style={styles.alertRow}>
              <Text style={styles.alertIcon}>{alert.icon}</Text>
              <Text style={styles.alertLabel}>{alert.label}</Text>
              <Switch
                value={alert.enabled}
                onValueChange={() => toggleAlert(alert.key)}
                trackColor={{ false: '#E8EDF5', true: '#1565C0' }}
                thumbColor={alert.enabled ? Colors.white : Colors.white}
              />
            </View>
          ))}
        </View>

        <View style={styles.sosRow}>
          <SilentSOS />
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>История оповещений</Text>
            {loading && <ActivityIndicator size="small" color="#1565C0" />}
          </View>
          <FlatList
            data={history}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={({ item }) => {
              const config = SOUND_TYPES.find((s) => s.key === item.sound_type);
              return (
                <View style={styles.historyItem}>
                  <Text style={styles.historyIcon}>
                    {config?.icon || "🔔"}
                  </Text>
                  <View>
                    <Text style={styles.historyType}>
                      {config?.label || item.sound_type}
                    </Text>
                    <Text style={styles.historyTime}>
                      {new Date(item.detected_at || item.id).toLocaleString("ru-RU")}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1565C0',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: "#ffffff",
  },
  loginBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  loginBannerText: {
    color: Colors.accent,
    fontSize: FontSize.body,
    fontWeight: "500",
    textAlign: "center",
  },
  alertsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FontSize.title,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: Spacing.sm,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  sosRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  alertLabel: {
    flex: 1,
    fontSize: FontSize.body,
    color: "#1A1A2E",
  },
  historySection: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  historyIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  historyType: {
    fontSize: FontSize.body,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  historyTime: {
    fontSize: FontSize.caption,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
