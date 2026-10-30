import Link from "next/link";
import { deliverables, POSITIONING } from "@/data/launch";

export const metadata = { title: "Launch kit" };

export default function LaunchPage() {
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Launch kit</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>Copy for a desk <em>that can refuse.</em></h1>
      <p className="deck">{POSITIONING}</p>
      <p>These are outlines. They are not signed contracts, adopted policies, or a report from a pilot that has not happened. The reading room remains ZAMORA.</p>
      <ol>
        {deliverables.map((item) => (
          <li key={item.slug} style={{ margin: "0.45rem 0" }}>
            <Link href={`/launch/${item.slug}`}>{item.title}</Link>
            <span className="muted"> · {item.kind}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
