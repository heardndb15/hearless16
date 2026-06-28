import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, GRADIENT_COLORS, GRADIENT_LOCATIONS, GlassCard } from "../constants/theme";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Profile fields
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [message, setMessage] = useState("");

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen to changes — only react to explicit SIGNED_OUT to avoid spurious logouts
    // during token refresh (Supabase can fire transient null-session events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setName("");
        setLoading(false);
      } else if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name, language")
        .eq("id", userId)
        .single();

      if (data) {
        setName(data.name || "");
        setLanguage((data.language as "kk" | "ru") || "ru");
      }
    } catch {}
    setLoading(false);
  }

  async function handleAuth() {
    if (!email || !password) {
      setMessage("Заполните email и пароль");
      return;
    }

    setMessage("");
    setAuthLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split("@")[0],
              language,
            },
          },
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Регистрация успешна!");
          setIsRegistering(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage(error.message);
        }
      }
    } catch (err: any) {
      setMessage(err.message || "Ошибка авторизации");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;
    setMessage("");
    setAuthLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({ name, language })
        .eq("id", user.id);

      if (error) {
        setMessage("Ошибка: " + error.message);
      } else {
        setMessage("Настройки сохранены!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err: any) {
      setMessage(err.message || "Ошибка сохранения");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {}
    setAuthLoading(false);
  }

  if (loading) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{flex:1}} start={{x:0,y:0}} end={{x:0,y:1}}>
        <SafeAreaView style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.loadingText}>Загрузка профиля...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{flex:1}} start={{x:0,y:0}} end={{x:0,y:1}}>
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? (name ? name[0].toUpperCase() : user.email?.[0].toUpperCase()) : "?"}
            </Text>
          </View>
          <Text style={styles.title}>
            {user ? "Профиль" : "Авторизация"}
          </Text>
        </View>

        {user ? (
          // Logged in UI
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Личные данные</Text>
              <Text style={styles.emailLabel}>{user.email}</Text>
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

            {message ? (
              <Text style={[styles.message, message.includes("Ошибка") && { color: Colors.sos }]}>
                {message}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Сохранить настройки</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={authLoading}
            >
              <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Login / Register Form
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isRegistering ? "Регистрация" : "Вход в систему"}
            </Text>

            {isRegistering && (
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="Имя"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            )}

            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Пароль"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />

            {message ? (
              <Text style={[styles.message, { color: Colors.sos, marginBottom: 12 }]}>
                {message}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAuth}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isRegistering ? "Зарегистрироваться" : "Войти"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAuth}
              onPress={() => {
                setIsRegistering(!isRegistering);
                setMessage("");
              }}
            >
              <Text style={styles.switchAuthText}>
                {isRegistering
                  ? "Уже есть аккаунт? Войти"
                  : "Нет аккаунта? Зарегистрироваться"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>
          <Text style={styles.infoRow}>Версия: 1.0.0</Text>
          <Text style={styles.infoRow}>Политика конфиденциальности</Text>
          <Text style={styles.infoRow}>Условия использования</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: FontSize.body,
    color: Colors.white,
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
    backgroundColor: "#0277BD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarText: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: Colors.white,
  },
  title: {
    fontSize: FontSize.heading,
    fontWeight: "bold",
    color: "#ffffff",
  },
  section: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: Spacing.sm,
  },
  emailLabel: {
    fontSize: FontSize.caption,
    color: Colors.heading,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.heading,
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
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#0277BD",
  },
  toggleText: {
    fontSize: FontSize.body,
    color: Colors.heading,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },
  infoRow: {
    fontSize: FontSize.body,
    color: Colors.heading,
    paddingVertical: Spacing.xs,
  },
  message: {
    fontSize: FontSize.body,
    color: Colors.accent,
    textAlign: "center",
    marginVertical: Spacing.xs,
  },
  saveButton: {
    backgroundColor: "#0277BD",
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
  logoutButton: {
    borderColor: Colors.sos,
    borderWidth: 2,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  logoutButtonText: {
    color: Colors.sos,
    fontSize: FontSize.subtitle,
    fontWeight: "600",
  },
  switchAuth: {
    alignItems: "center",
    marginTop: 16,
  },
  switchAuthText: {
    color: Colors.accent,
    fontSize: FontSize.body,
    textDecorationLine: "underline",
  },
});
