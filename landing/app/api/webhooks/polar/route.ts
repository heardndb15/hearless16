import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(
      rawBody,
      Object.fromEntries(req.headers.entries()),
      process.env.POLAR_WEBHOOK_SECRET
    );
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    return NextResponse.json({ error: "Webhook parse error" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === "subscription.created" || event.type === "subscription.active" || event.type === "subscription.updated") {
    const sub = event.data;
    const userId = sub.customer.externalId;
    const plan = sub.metadata?.plan as string | undefined;
    const isActive = sub.status === "active" || sub.status === "trialing";

    if (userId && plan && isActive) {
      await supabase
        .from("users")
        .update({
          plan,
          plan_expires_at: sub.currentPeriodEnd?.toISOString() ?? null,
        })
        .eq("id", userId);
    }
  }

  if (event.type === "subscription.revoked" || event.type === "subscription.canceled") {
    const sub = event.data;
    const userId = sub.customer.externalId;
    if (userId) {
      await supabase
        .from("users")
        .update({ plan: "free", plan_expires_at: null })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
