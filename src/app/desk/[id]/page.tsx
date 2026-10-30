import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskEditor } from "@/components/DeskEditor";
import { allows, getSessionUser } from "@/lib/auth";
import { getInvestigation } from "@/lib/desk";
import { searchDocuments } from "@/lib/queries";

export const metadata = { title: "Investigation" };

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) {
    return (
      <div className="frame" style={{ padding: "2rem 0" }}>
        <p>Sign in to open a desk. <Link href="/login">Enter</Link></p>
      </div>
    );
  }
  const { id } = await params;
  const detail = await getInvestigation(user, id);
  if (!detail) notFound();
  const catalog = await searchDocuments({ comparative: "include" });
  return (
    <div className="frame" style={{ paddingTop: "1.2rem" }}>
      <p className="kicker"><Link href="/desk/files">Files</Link> · {detail.status}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.6rem, 5vw, 4.2rem)" }}>{detail.title}</h1>
      <p className="deck">{detail.question}</p>
      <DeskEditor detail={detail} catalog={catalog.items} />
    </div>
  );
}
