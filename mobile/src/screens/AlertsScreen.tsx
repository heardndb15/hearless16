import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";
import SOSButton from "../components/SOSButton";
import SilentSOS from "../components/SilentSOS";
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

const MOCK_HISTORY: SoundAlert[] = [
  {
    id: "1",
    user_id: "1",
    sound_type: "fire",
    detected_at: "2026-06-11T10:30:00Z",
  },
  {
    id: "2",
    user_id: "1",
    sound_type: "door",
    detected_at: "2026-06-11T09:15:00Z",
  },
  {
    id: "3",
    user_id: "1",
    sound_type: "alarm",
    detected_at: "2026-06-10T07:00:00Z",
  },
];

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState(SOUND_TYPES);

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
        <SOSButton />
        <SilentSOS />
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>История оповещений</Text>
        <FlatList
          data={MOCK_HISTORY}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyIcon}>
                {SOUND_TYPES.find((s) => s.key === item.sound_type)?.icon}
              </Text>
              <View>
                <Text style={styles.historyType}>
                  {SOUND_TYPES.find((s) => s.key === item.sound_type)?.label}
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(item.detected_at).toLocaleString("ru-RU")}
                </Text>
              </View>
            </View>
          )}
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
