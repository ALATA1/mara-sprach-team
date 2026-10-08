export const coursePlans = {
  discovery: { name: "Découverte", amountCents: 2500, priceEnv: "STRIPE_PRICE_DISCOVERY_MONTHLY_ID" },
  standard: { name: "Standard", amountCents: 4000, priceEnv: "STRIPE_PRICE_STANDARD_MONTHLY_ID" },
  premium: { name: "Premium", amountCents: 5000, priceEnv: "STRIPE_PRICE_PREMIUM_MONTHLY_ID" },
} as const;

export type CoursePlanId = keyof typeof coursePlans;

export function isCoursePlanId(value: unknown): value is CoursePlanId {
  return typeof value === "string" && Object.hasOwn(coursePlans, value);
}
