import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { getSubscription, refreshSubscription, invalidateSubscriptionCache } from "../services/subscription";
import type { Plan } from "../../../shared/types";

export function useSubscription(): {
  plan: Plan;
  loading: boolean;
  token: string;
  refresh: () => void;
} {
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  const load = useCallback(async (tok: string) => {
    if (!tok) {
      setPlan("free");
      setLoading(false);
      return;
    }
    const sub = await getSubscription(tok);
    setPlan(sub.plan);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const tok = session?.access_token ?? "";
    invalidateSubscriptionCache();
    const sub = await refreshSubscription(tok);
    setPlan(sub.plan);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? "";
      setToken(tok);
      load(tok);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        invalidateSubscriptionCache();
        setToken("");
        setPlan("free");
        setLoading(false);
      } else if (session?.access_token) {
        setToken(session.access_token);
        load(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return { plan, loading, token, refresh };
}
