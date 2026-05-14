export function unitPriceForBoardCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 4) return 1000;
  if (count <= 20) return 800;
  return 700;
}

export function monthlyTotalCents(count: number): number {
  return count * unitPriceForBoardCount(count);
}

export function stripePriceIdForBoardCount(count: number): string {
  if (count <= 0) throw new Error("Board count must be > 0");
  if (count <= 4) return process.env.STRIPE_PRICE_1_TO_4!;
  if (count <= 20) return process.env.STRIPE_PRICE_5_TO_20!;
  return process.env.STRIPE_PRICE_20_PLUS!;
}
