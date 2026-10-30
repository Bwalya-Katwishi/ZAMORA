import Link from "next/link";
import { CreateInvestigation } from "@/components/CreateInvestigation";
import { LogoutButton } from "@/components/LoginForm";
import { allows, getSessionUser } from "@/lib/auth";
import { listInvestigations } from "@/lib/desk";

export const metadata = { title: "Investigation files" };

export default async function InvestigationFilesPage() {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) {
    return (
      <div className="frame" style={{ padding: "1.6rem 0 2.5rem" }}>
        <p className="kicker">Investigation files</p>
        <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)" }}>A case file, <em>not a feed.</em></h1>
        <p className="deck">The file holds your question, the sources you place on it, the claims you are willing to make, and the evidence that supports or contradicts them. Notes stay with the signed-in researcher.</p>
        <p><a href="/login">Sign in to open a file</a></p>
      </div>
    );
  }
  const investigations = await listInvestigations(user);
  return (
    <div className="frame" style={{ padding: "1.4rem 0 2.5rem" }}>
      <p className="kicker">Investigation files · {user.name}</p>
      <div className="section-head">
        <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.6rem)" }}>Open files</h1>
        <LogoutButton />
      </div>
      <p><Link href="/desk">Back to the evidence desk</Link></p>
      <div className="rows">
        {investigations.length === 0 ? <p>No investigation yet. The form below opens an empty ledger. It will not invent a case.</p> : null}
        {investigations.map((item) => (
          <Link key={item.id} href={`/desk/${item.id}`}>
            <span className="mono">{item.status}</span>
            <span className="mono">{item.updatedAt.slice(0, 10)}</span>
            <span className="mono">File</span>
            <span className="row-title">{item.title}</span>
          </Link>
        ))}
      </div>
      <div style={{ maxWidth: "36rem", marginTop: "1.5rem" }}>
        <CreateInvestigation />
      </div>
    </div>
  );
}
