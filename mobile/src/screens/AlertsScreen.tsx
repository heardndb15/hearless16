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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Алерты</Text>
        <Text style={styles.subtitle}>Звуковые оповещения</Text>
      </View>

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
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={alert.enabled ? Colors.button : Colors.textSecondary}
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
          {loading && <ActivityIndicator size="small" color={Colors.accent} />}
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
  loginBanner: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginBannerText: {
    color: Colors.accent,
    fontSize: FontSize.body,
    fontWeight: "500",
    textAlign: "center",
  },
  alertsSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.title,
    fontWeight: "600",
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  historyType: {
    fontSize: FontSize.body,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  historyTime: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
