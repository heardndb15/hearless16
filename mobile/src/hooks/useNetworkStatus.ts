import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const HEALTH_URL = "https://hearless16-1.onrender.com/health";
const POLL_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 5000;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function check() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(HEALTH_URL, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") check();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);

  return isOnline;
}
