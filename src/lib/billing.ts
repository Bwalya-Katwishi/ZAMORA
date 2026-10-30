export const FX_ZMW_PER_USD = 27;

export const FX_NOTE = "Planning figure at ZMW 27 per USD. Not a quote. Recheck the Bank of Zambia before a proposal.";

export interface Plan {
  id: string;
  name: string;
  audience: string;
  priceZmw: number | null;
  usdAt27: number | null;
  seatCap: number | null;
  note: string;
}

function usd(zmw: number): number {
  return Math.round((zmw / FX_ZMW_PER_USD) * 100) / 100;
}

export const plans: Plan[] = [
  {
    id: "public",
    name: "Public catalogue",
    audience: "Anyone",
    priceZmw: 0,
    usdAt27: 0,
    seatCap: 0,
    note: "Catalogue, search, district profiles, the method page, and the open evidence desk stay free.",
  },
  {
    id: "student",
    name: "Student",
    audience: "Student",
    priceZmw: 1200,
    usdAt27: usd(1200),
    seatCap: 1,
    note: "Planning figure for one student seat a year.",
  },
  {
    id: "newsroom",
    name: "Newsroom",
    audience: "Newsroom",
    priceZmw: 54000,
    usdAt27: usd(54000),
    seatCap: 15,
    note: "Planning figure for a newsroom year.",
  },
  {
    id: "mining",
    name: "Mining seat",
    audience: "Mining company",
    priceZmw: 540000,
    usdAt27: usd(540000),
    seatCap: 5,
    note: "Planning figure for a mining seat year.",
  },
  {
    id: "university",
    name: "University",
    audience: "University",
    priceZmw: null,
    usdAt27: null,
    seatCap: null,
    note: "Separately defined. Not a quote.",
  },
  {
    id: "ngo",
    name: "NGO",
    audience: "NGO",
    priceZmw: null,
    usdAt27: null,
    seatCap: null,
    note: "Separately defined. Not a quote.",
  },
  {
    id: "cooperative",
    name: "Cooperative",
    audience: "Agricultural cooperative",
    priceZmw: null,
    usdAt27: null,
    seatCap: null,
    note: "Separately defined. Not a quote.",
  },
  {
    id: "government",
    name: "Government",
    audience: "Public institution",
    priceZmw: null,
    usdAt27: null,
    seatCap: null,
    note: "Separately defined. Not a quote.",
  },
];

export type Feature = "catalogue" | "search" | "district" | "method" | "desk" | "export" | "forecast" | "workspace" | "alert";

const OPEN: Feature[] = ["catalogue", "search", "district", "method", "desk"];

export function findPlan(id: string): Plan | undefined {
  return plans.find((plan) => plan.id === id);
}

export function gate(planId: string, feature: Feature): { allowed: boolean; prompt: string | null } {
  const plan = findPlan(planId);
  const open = OPEN.includes(feature);
  if (!plan || plan.priceZmw == null || plan.priceZmw === 0) {
    return open
      ? { allowed: true, prompt: null }
      : { allowed: false, prompt: "This stays on a paid desk. The public catalogue remains open." };
  }
  return { allowed: true, prompt: null };
}

export function effectivePlan(
  sub: { planId: string; status: "trial" | "active" | "cancelled"; trialEnds: string | null },
  today: string,
): string {
  if (sub.status === "cancelled") return "public";
  if (sub.status === "trial" && sub.trialEnds && sub.trialEnds < today) return "public";
  return sub.planId;
}

export function seatsAllowed(planId: string, requested: number): { ok: boolean; reason: string } {
  const plan = findPlan(planId);
  if (!plan || plan.seatCap == null) return { ok: false, reason: "This audience has no seat cap because it is not priced." };
  if (requested < 1) return { ok: false, reason: "A subscription needs at least one seat." };
  if (requested > plan.seatCap) return { ok: false, reason: `The planning cap is ${plan.seatCap} seats.` };
  return { ok: true, reason: "Within the planning cap." };
}

export function draftInvoice(planId: string, seats: number):
  | { amountZmw: number; currency: "ZMW"; planning: true; provider: "manual"; note: string }
  | { error: string } {
  const plan = findPlan(planId);
  if (!plan || plan.priceZmw == null || plan.priceZmw === 0) return { error: "No invoice. This plan is free or not priced." };
  const seatsCheck = seatsAllowed(planId, seats);
  if (!seatsCheck.ok) return { error: seatsCheck.reason };
  return {
    amountZmw: plan.priceZmw,
    currency: "ZMW",
    planning: true,
    provider: "manual",
    note: "Planning figure. Not a quote. No payment was taken.",
  };
}

export function acceptWebhook(seen: string[], id: string): { accept: boolean; seen: string[] } {
  if (!id || seen.includes(id)) return { accept: false, seen };
  return { accept: true, seen: [...seen, id] };
}

export function manualTransfer(invoiceId: string, amountZmw: number): {
  provider: "manual";
  mode: "bank-transfer";
  charged: false;
  invoiceId: string;
  amountZmw: number;
} {
  return { provider: "manual", mode: "bank-transfer", charged: false, invoiceId, amountZmw };
}
