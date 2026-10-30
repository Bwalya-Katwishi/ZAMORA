import Link from "next/link";
import { notFound } from "next/navigation";
import { deliverables, POSITIONING } from "@/data/launch";

export function generateStaticParams() {
  return deliverables.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = deliverables.find((entry) => entry.slug === slug);
  return { title: item?.title ?? "Launch kit" };
}

export default async function LaunchPiece({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = deliverables.find((entry) => entry.slug === slug);
  if (!item) notFound();
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker"><Link href="/launch">Launch kit</Link> · {item.kind}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.6rem, 5vw, 4.2rem)" }}>{item.title}</h1>
      <p className="muted">{POSITIONING}</p>
      {item.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
      ))}
    </div>
  );
}
