import Link from "next/link";
import { FX_NOTE, gate, plans } from "@/lib/billing";

export const metadata = { title: "Pricing" };

const rows = [
  ["Catalogue, search, district profiles, method", "Open"],
  ["Evidence desk on the public shelf", "Open"],
  ["Export, forecast publication, private workspace, alerts", "Paid desk"],
] as const;

export default function PricingPage() {
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Planning figures</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>The room stays <em>free.</em></h1>
      <p className="deck">{FX_NOTE} Nothing on this page is a quote, and this site does not take a card payment. An invoice, when one is issued, is a record for a bank transfer.</p>
      {rows.map(([feature, access]) => (
        <p key={feature} style={{ borderTop: "1px solid var(--rule)", padding: "0.7rem 0", margin: 0 }}>
          <strong>{access}.</strong> {feature}.
        </p>
      ))}
      <p className="muted">{gate("public", "export").prompt} {gate("public", "catalogue").allowed ? "The catalogue stays open." : ""}</p>
      {plans.map((plan) => (
        <article key={plan.id} style={{ borderTop: "1px solid var(--rule)", padding: "0.9rem 0" }}>
          <p className="kicker">{plan.audience}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0.2rem 0" }}>{plan.name}</h2>
          <p>
            {plan.priceZmw == null
              ? "Price separately defined. Not a quote."
              : plan.priceZmw === 0
                ? "ZMW 0. The public catalogue."
                : `ZMW ${plan.priceZmw.toLocaleString("en-US")} a year. About USD ${plan.usdAt27?.toLocaleString("en-US")} at ZMW 27. Planning figure.`}
            {plan.seatCap == null ? "" : ` Seat cap ${plan.seatCap}.`}
          </p>
          <p className="muted">{plan.note}</p>
        </article>
      ))}
      <p>A trial lasts 30 days and then falls back to the public catalogue. <Link href="/launch/terms">Terms outline</Link>.</p>
    </div>
  );
}
