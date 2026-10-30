import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogList } from "@/components/CatalogList";
import { railTownIds } from "@/data/places";
import { yearSpan } from "@/lib/format";
import { documentsForCategory, listCategories, listEvents, listMappablePlaces } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await listCategories();
  return { title: categories.find((category) => category.id === id)?.name ?? "Discipline" };
}

export default async function DisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await listCategories();
  const category = categories.find((item) => item.id === id && !item.parentId);
  if (!category) notFound();
  const children = categories.filter((item) => item.parentId === id);
  const documents = await documentsForCategory(id);
  const events = category.layout === "timeline" || category.layout === "chronology" ? await listEvents() : [];
  const towns = category.layout === "route" ? await listMappablePlaces() : [];
  const rail = railTownIds
    .map((townId) => towns.find((town) => town.id === townId))
    .filter((town) => town);

  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">{category.layout}</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>{category.name}</h1>
      <p className="deck">{category.description}</p>
      {children.length ? (
        <p className="mono">{children.map((child) => child.name).join(" · ")}</p>
      ) : null}

      {category.layout === "safeguard" ? (
        <div className="warning" style={{ maxWidth: "40rem", marginTop: "1rem" }}>
          <p>Allegations, arrests, charges, convictions, acquittals, and unresolved inquiries are different states. ZAMORA does not publish crime narratives about private people, and it does not invent cases to fill this shelf. Health claims need a named study. None is loaded beyond what the catalog already shows.</p>
        </div>
      ) : null}

      {category.layout === "timeline" || category.layout === "chronology" ? (
        <div className="timeline" style={{ marginTop: "1rem" }}>
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <time>{yearSpan(event.startYear, event.endYear)}</time>
              <span><strong>{event.title}</strong><br />{event.dateNote}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {category.layout === "route" ? (
        <div className="route" style={{ marginTop: "1rem" }}>
          {rail.map((town) => town ? (
            <Link key={town.id} href={`/atlas?place=${town.id}`}>
              <span className="mono">{town.latitude?.toFixed(2)}, {town.longitude?.toFixed(2)}</span>
              <span><strong>{town.name}</strong><br />{town.note}</span>
            </Link>
          ) : null)}
        </div>
      ) : null}

      {category.layout === "fieldnotes" ? (
        <div className="fieldnotes">
          {documents.map((document) => (
            <article key={document.id}>
              <p className="kicker">{document.accession} · {yearSpan(document.publishedYear, null, "Undated")}</p>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0 0 0.4rem" }}><Link href={`/documents/${document.id}`}>{document.title}</Link></h2>
              <p>{document.summary}</p>
            </article>
          ))}
        </div>
      ) : null}

      {category.layout === "docket" ? (
        <div className="docket">
          {documents.filter((document) => document.type === "legal" || document.type === "gazette").map((document) => (
            <article key={document.id}>
              <p className="mono">{yearSpan(document.publishedYear, document.aboutEnd, "Period not stored as a single year")}</p>
              <h3><Link href={`/documents/${document.id}`}>{document.title}</Link></h3>
              <p>{document.summary}</p>
            </article>
          ))}
        </div>
      ) : null}

      {category.layout === "season" ? (
        <div style={{ maxWidth: "40rem" }}>
          <p>The agricultural year on this shelf is still a bibliography: diet and labor among the Bemba, the floodplain economy of the Lozi, fisheries at Bangweulu, and a national cereal-yield series that must not be read as a household or a province.</p>
          <p><Link href="/observatory?question=food">Open the food question</Link></p>
        </div>
      ) : null}

      {category.layout === "catchment" ? (
        <p style={{ maxWidth: "40rem" }}>The rivers are an index, not a rainfall model. Zambezi, Kafue, Luangwa, and Bangweulu are places in the gazetteer. Kariba is the one scheme with a documented resettlement literature here. <Link href="/atlas?place=southern">Southern Province on the atlas</Link>.</p>
      ) : null}

      {category.layout === "series" ? (
        <p><Link href="/observatory?question=public-finance">The observatory plots only sourced national series, on separate charts.</Link></p>
      ) : null}

      {category.layout === "institutions" ? (
        <p style={{ maxWidth: "42rem" }}>The Rhodes-Livingstone Institute, founded in 1937, is the research institution with a real trail on this shelf. The National Archives of Zambia and the Livingstone Museum are collection-level pointers. No university thesis has been ingested.</p>
      ) : null}

      {category.layout !== "fieldnotes" && category.layout !== "docket" ? <CatalogList items={documents} /> : null}
      {documents.length === 0 ? <p>No document is filed here yet.</p> : null}
    </div>
  );
}
