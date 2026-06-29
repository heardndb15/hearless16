import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList, Plan } from "../../../shared/types";

interface PremiumGateProps {
  requiredPlan: "basic" | "pro";
  currentPlan: Plan;
  children: ReactNode;
  fallback?: ReactNode;
}

const PLAN_RANK: Record<Plan, number> = { free: 0, basic: 1, pro: 2 };

export function PremiumGate({ requiredPlan, currentPlan, children, fallback }: PremiumGateProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const hasAccess = PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan];
  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const planLabel = requiredPlan === "basic" ? "Basic (990 ₸/мес)" : "Pro (2 490 ₸/мес)";

  return (
    <View style={styles.container}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>Требуется план {planLabel}</Text>
      <Text style={styles.subtitle}>Улучшите подписку чтобы получить доступ</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("Paywall", { requiredPlan })}
      >
        <Text style={styles.btnText}>Улучшить план</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  lock: { fontSize: 48 },
  title: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  btn: { marginTop: 8, backgroundColor: "#1565C0", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
