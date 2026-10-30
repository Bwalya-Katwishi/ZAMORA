import Link from "next/link";
import { LogoutButton } from "@/components/LoginForm";
import { allows, getSessionUser } from "@/lib/auth";
import { questionTypes } from "@/lib/evidence";
import { listBriefs } from "@/lib/foresight-store";
import { listCategories, listSearchPlaces } from "@/lib/queries";
import { groupSearchPlaces } from "@/lib/search";

export const metadata = { title: "Foresight briefs" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BriefListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) {
    return (
      <div className="frame" style={{ padding: "1.6rem 0 2.5rem" }}>
        <p className="kicker">Foresight briefs</p>
        <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)" }}>A draft, <em>not a release.</em></h1>
        <p className="deck">A brief is copied from a shelf pack. It is not published. An editor reviews it and signs it before any export.</p>
        <p><a href="/login">Sign in to draft a brief</a></p>
        <p><Link href="/desk">Back to the evidence desk</Link></p>
      </div>
    );
  }
  const [briefs, places, sectors] = await Promise.all([listBriefs(user), listSearchPlaces(), listCategories()]);
  const groups = groupSearchPlaces(places);
  const error = one(raw.error);
  return (
    <div className="frame" style={{ padding: "1.4rem 0 2.5rem" }}>
      <p className="kicker">Foresight briefs · {user.name}</p>
      <div className="section-head">
        <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.6rem)" }}>Unsigned until a person signs.</h1>
        <LogoutButton />
      </div>
      <p><Link href="/desk">Evidence desk</Link> · <Link href="/desk/files">Investigation files</Link></p>
      {error ? <p className="warning">{error}</p> : null}
      <div className="rows">
        {briefs.length === 0 ? <p>No brief yet. The form drafts one from the shelf. It does not invent a finding.</p> : null}
        {briefs.map((brief) => (
          <Link key={brief.id} href={`/desk/briefs/${brief.id}`}>
            <span className="mono">{brief.status === "signed" ? "Signed" : brief.status === "in_review" ? "In review" : "Draft"}</span>
            <span className="mono">v{brief.version}</span>
            <span className="mono">{brief.signerName ?? "Not signed"}</span>
            <span className="row-title">{brief.title}</span>
          </Link>
        ))}
      </div>
      <form action="/api/briefs" method="post" className="filters" style={{ marginTop: "1.4rem" }}>
        <label>Place
          <select name="place" required defaultValue="">
            <option value="">Choose a place</option>
            <optgroup label="Provinces">
              {groups.provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>
            {groups.districts.map((group) => (
              <optgroup key={group.province} label={`${group.province} districts`}>
                {group.places.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </optgroup>
            ))}
            {groups.unassigned.length ? (
              <optgroup label="Districts without a province join">
                {groups.unassigned.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label>Sector
          <select name="sector" required defaultValue="">
            <option value="">Choose a sector</option>
            {sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Question type
          <select name="questionType" defaultValue="historical">
            {questionTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>From<input name="from" inputMode="numeric" /></label>
        <label>To<input name="to" inputMode="numeric" /></label>
        <label>Question<input name="question" required /></label>
        <button className="solid" type="submit">Draft from the shelf</button>
      </form>
    </div>
  );
}
