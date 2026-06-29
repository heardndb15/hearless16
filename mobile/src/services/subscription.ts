import axios from "axios";
import { Linking } from "react-native";
import type { Plan, SubscriptionInfo } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const SUBTITLE_LIMITS: Record<Plan, number> = {
  free: 30 * 60,      // 1800 sec
  basic: 2 * 60 * 60, // 7200 sec
  pro: Infinity,
};

let _cache: { data: SubscriptionInfo; at: number } | null = null;

export async function getSubscription(token: string): Promise<SubscriptionInfo> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL) {
    return _cache.data;
  }
  return refreshSubscription(token);
}

export async function refreshSubscription(token: string): Promise<SubscriptionInfo> {
  try {
    const res = await axios.get<SubscriptionInfo>(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    _cache = { data: res.data, at: Date.now() };
    return res.data;
  } catch {
    const fallback: SubscriptionInfo = { plan: "free", plan_expires_at: null };
    return fallback;
  }
}

export function invalidateSubscriptionCache(): void {
  _cache = null;
}

export async function openCheckout(plan: "basic" | "pro", token: string): Promise<void> {
  const res = await axios.post<{ url: string }>(
    `${API_URL}/polar/checkout`,
    { plan },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
  );
  await Linking.openURL(res.data.url);
}
