import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name ? name[0].toUpperCase() : "?"}
            </Text>
          </View>
          <Text style={styles.title}>Профиль</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Личные данные</Text>
          <TextInput
            style={styles.input}
            placeholder="Ваше имя"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Язык</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                language === "kk" && styles.toggleActive,
              ]}
              onPress={() => setLanguage("kk")}
            >
              <Text
                style={[
                  styles.toggleText,
                  language === "kk" && styles.toggleTextActive,
                ]}
              >
                Қазақша
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                language === "ru" && styles.toggleActive,
              ]}
              onPress={() => setLanguage("ru")}
            >
              <Text
                style={[
                  styles.toggleText,
                  language === "ru" && styles.toggleTextActive,
                ]}
              >
                Русский
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тема</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                theme === "light" && styles.toggleActive,
              ]}
              onPress={() => setTheme("light")}
            >
              <Text
                style={[
                  styles.toggleText,
                  theme === "light" && styles.toggleTextActive,
                ]}
              >
                ☀️ Светлая
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                theme === "dark" && styles.toggleActive,
              ]}
              onPress={() => setTheme("dark")}
            >
              <Text
                style={[
                  styles.toggleText,
                  theme === "dark" && styles.toggleTextActive,
                ]}
              >
                🌙 Тёмная
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>
          <Text style={styles.infoRow}>Версия: 1.0.0</Text>
          <Text style={styles.infoRow}>Политика конфиденциальности</Text>
          <Text style={styles.infoRow}>Условия использования</Text>
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Сохранить настройки</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: Colors.white,
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: Colors.heading,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: Colors.accent,
  },
  toggleText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  infoRow: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
  },
  saveButton: {
    backgroundColor: Colors.button,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.subtitle,
    fontWeight: "600",
  },
});
