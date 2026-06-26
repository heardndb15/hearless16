import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { polar, PLAN_PRODUCT_IDS } from "../../../lib/polar";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const plan = searchParams.get("plan");

  if (!plan || !["basic", "pro"].includes(plan)) {
    return NextResponse.redirect(`${origin}/pricing?error=invalid_plan`);
  }

  const productId = PLAN_PRODUCT_IDS[plan];
  if (!productId) {
    return NextResponse.redirect(`${origin}/pricing?error=not_configured`);
  }

  // Resolve current user
  let customerEmail: string | undefined;
  let externalCustomerId: string | undefined;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      customerEmail = user.email;
      externalCustomerId = user.id;
    }
  }

  if (!customerEmail) {
    return NextResponse.redirect(`${origin}/login?redirect=/pricing`);
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${origin}/dashboard?subscription=success&plan=${plan}`,
      customerEmail,
      externalCustomerId,
      metadata: { plan, userId: externalCustomerId ?? "" },
    });

    return NextResponse.redirect(checkout.url);
  } catch (err) {
    console.error("Polar checkout error:", err);
    return NextResponse.redirect(`${origin}/pricing?error=checkout_failed`);
  }
}
