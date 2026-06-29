import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../hooks/useSubscription";
import { openCheckout } from "../services/subscription";

const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "990 ₸/мес",
    features: [
      "Субтитры до 2 часов в день",
      "Все базовые уроки жестов",
      "Уроки среднего уровня",
      "История субтитров",
    ],
    color: "#1565C0",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "2 490 ₸/мес",
    features: [
      "Субтитры без ограничений",
      "Полный курс жестового языка",
      "Тесты и прогресс",
      "Приоритетная поддержка",
      "Ранний доступ к функциям",
    ],
    color: "#7B1FA2",
  },
];

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { token } = useSubscription();
  const [loading, setLoading] = useState<"basic" | "pro" | null>(null);

  const handleSelect = async (plan: "basic" | "pro") => {
    if (!token) {
      Alert.alert("Войдите в аккаунт", "Для оформления подписки нужно войти в аккаунт.");
      return;
    }
    setLoading(plan);
    try {
      await openCheckout(plan, token);
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть страницу оплаты. Попробуйте позже.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Улучшите план</Text>
        <Text style={styles.subtitle}>Разблокируйте все возможности Hearless</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {PLANS.map((plan) => (
          <View key={plan.id} style={[styles.card, { borderColor: plan.color }]}>
            <View style={[styles.cardHeader, { backgroundColor: plan.color }]}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </View>
            <View style={styles.cardBody}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.check, { color: plan.color }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: plan.color }]}
                onPress={() => handleSelect(plan.id)}
                disabled={loading !== null}
              >
                {loading === plan.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.selectBtnText}>Выбрать {plan.name}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.note}>
          Нажимая «Выбрать», вы перейдёте в браузер для оплаты. После успешной оплаты вернитесь в приложение.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  header: { backgroundColor: "#1565C0", padding: 20, paddingTop: 16 },
  closeBtn: { alignSelf: "flex-end", padding: 4 },
  closeBtnText: { color: "white", fontSize: 18, fontWeight: "600" },
  title: { color: "white", fontSize: 24, fontWeight: "700", marginTop: 8 },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 2, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  cardHeader: { padding: 16 },
  planName: { color: "white", fontSize: 20, fontWeight: "700" },
  planPrice: { color: "rgba(255,255,255,0.9)", fontSize: 16, marginTop: 2 },
  cardBody: { padding: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  check: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  featureText: { fontSize: 14, color: "#1A1A2E", flex: 1, lineHeight: 22 },
  selectBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  selectBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  note: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 18, marginTop: 4 },
});
