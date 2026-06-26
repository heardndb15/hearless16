import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: (process.env.POLAR_ENV as "sandbox" | "production") ?? "sandbox",
});

// Product IDs from Polar dashboard (Products tab)
export const PLAN_PRODUCT_IDS: Record<string, string> = {
  basic: process.env.POLAR_BASIC_PRODUCT_ID ?? "",
  pro: process.env.POLAR_PRO_PRODUCT_ID ?? "",
};
