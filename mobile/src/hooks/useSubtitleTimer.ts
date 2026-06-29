import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUBTITLE_LIMITS } from "../services/subscription";
import type { Plan } from "../../../shared/types";

function todayKey(): string {
  return `hearless:subtitle_usage:${new Date().toISOString().slice(0, 10)}`;
}

export function useSubtitleTimer(plan: Plan): {
  remainingSeconds: number;
  recordUsage: (seconds: number) => Promise<void>;
  isLimitReached: boolean;
} {
  const limit = SUBTITLE_LIMITS[plan];
  const [usedSeconds, setUsedSeconds] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(todayKey()).then((val) => {
      setUsedSeconds(val ? parseInt(val, 10) : 0);
    });
  }, []);

  const recordUsage = async (seconds: number) => {
    const next = usedSeconds + seconds;
    setUsedSeconds(next);
    await AsyncStorage.setItem(todayKey(), String(next));
  };

  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usedSeconds);
  const isLimitReached = limit !== Infinity && usedSeconds >= limit;

  return {
    remainingSeconds: remaining,
    recordUsage,
    isLimitReached,
  };
}
