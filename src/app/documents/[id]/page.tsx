import Link from "next/link";
import { notFound } from "next/navigation";
import { CitationBar } from "@/components/CitationBar";
import { CatalogList } from "@/components/CatalogList";
import { TagEditor } from "@/components/TagEditor";
import { allows, getSessionUser } from "@/lib/auth";
import { relationLabel, typeLabel, yearSpan } from "@/lib/format";
import { getDocument, listCategories, listPeople, listSearchPlaces, relatedDocuments } from "@/lib/queries";
import { applyTags } from "@/lib/tags";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  return { title: document?.title ?? "Record" };
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const document = await getDocument(id);
  if (!document) notFound();
  const user = await getSessionUser();
  const editor = Boolean(user && allows(user.role, "editor"));
  const [related, places, sectors, people] = await Promise.all([
    relatedDocuments(id),
    editor ? listSearchPlaces() : Promise.resolve([]),
    editor ? listCategories() : Promise.resolve([]),
    editor ? listPeople() : Promise.resolve([]),
  ]);
  const placeTags = applyTags(
    document.places.map((place) => ({ id: place.id, name: place.name })),
    document.overrides.filter((item) => item.kind === "place"),
  );
  const sectorTags = applyTags(
    document.categories.map((category) => ({ id: category.id, name: category.name })),
    document.overrides.filter((item) => item.kind === "sector"),
  );
  const entityTags = applyTags(
    document.people.map((person) => ({ id: person.id, name: person.name })),
    document.overrides.filter((item) => item.kind === "entity"),
  );

  return (
    <article className="frame reader">
      <div>
        <p className="kicker">{typeLabel(document.type)} · {document.accession}</p>
        <h1>{document.title}</h1>
        <p className="mono">
          {entityTags.filter((tag) => !tag.removed).map((tag) => tag.name).join(", ") || "Institutional record"}
          {document.comparative ? " · Comparative context" : ""}
        </p>
        <div className="dates">
          <p><span>Published</span>{document.publishedOn ?? yearSpan(document.publishedYear, null, "No publication date stored")}</p>
          <p><span>About</span>{yearSpan(document.aboutStart, document.aboutEnd, "The period is not narrower than the work itself")}</p>
        </div>
        {document.id === "bridge-1905-photo" ? (
          <figure className="plate">
            <img src="/media/victoria-falls-bridge-1905.jpg" alt="The railway bridge at Mosi-oa-Tunya in 1905." />
            <figcaption>Stead&apos;s Review, November 1905. Public domain. Local display copy of the Wikimedia Commons file.</figcaption>
          </figure>
        ) : null}
        <div className="catalog-note">
          <p className="kicker">Catalog note. Not a quotation.</p>
          <p>{document.summary}</p>
          <p>{document.relevance}</p>
          {document.comparativeLabel ? <p className="warning">{document.comparativeLabel}</p> : null}
        </div>
        <p className="mono">Verification: {document.verification}. Rights: {document.rights}</p>
        {document.sourceUrl ? <p><a href={document.sourceUrl}>Open the source outside ZAMORA</a></p> : null}
        {related.length ? (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Nearby on the shelf</h2>
            <CatalogList items={related} />
          </>
        ) : null}
      </div>
      <aside>
        <CitationBar
          source={{
            authors: document.people.map((person) => ({ name: person.name, sortName: person.sortName, kind: person.kind })),
            year: document.publishedYear,
            title: document.title,
            place: document.publicationPlace,
            publisher: document.publisher,
            container: document.container,
            type: document.type,
            url: document.sourceUrl,
          }}
        />
        <div className="margin-note">
          <h2>Date</h2>
          <p>Published {document.publishedOn ?? yearSpan(document.publishedYear, null, "undated")}. The publication year is the catalog year.</p>
        </div>
        <div className="margin-note">
          <h2>Place</h2>
          <ul>
            {placeTags.map((tag) => (
              <li key={tag.id}>
                <Link href={`/atlas?place=${tag.id}`}>{tag.name}</Link>
                {tag.origin === "editor" ? <span className="mono"> · Editor</span> : null}
                {tag.removed ? <span className="mono"> · Editor removed</span> : null}
                {tag.note ? <span className="mono"> · {tag.author}: {tag.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="margin-note">
          <h2>Sector</h2>
          <ul>
            {sectorTags.map((tag) => {
              const category = document.categories.find((item) => item.id === tag.id);
              const href = `/disciplines/${category?.parentId ?? tag.id}`;
              return (
                <li key={tag.id}>
                  <Link href={href}>{tag.name}</Link>
                  {tag.origin === "editor" ? <span className="mono"> · Editor</span> : null}
                  {tag.removed ? <span className="mono"> · Editor removed</span> : null}
                  {tag.note ? <span className="mono"> · {tag.author}: {tag.note}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="margin-note">
          <h2>Entities</h2>
          <ul>
            {entityTags.length === 0 ? <li>No person or institution is named.</li> : null}
            {entityTags.map((tag) => (
              <li key={tag.id}>
                {tag.name}
                {tag.origin === "editor" ? <span className="mono"> · Editor</span> : null}
                {tag.removed ? <span className="mono"> · Editor removed</span> : null}
                {tag.note ? <span className="mono"> · {tag.author}: {tag.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        {editor ? (
          <TagEditor
            documentId={document.id}
            message={one(raw.tag)}
            options={[
              ...places.map((place) => ({ id: place.id, name: place.name, kind: place.kind })),
              ...sectors.map((sector) => ({ id: sector.id, name: sector.name, kind: "sector" })),
              ...people.map((person) => ({ id: person.id, name: person.name, kind: "entity" })),
            ]}
          />
        ) : null}
        <div className="margin-note">
          <h2>Events</h2>
          <ul>
            {document.events.length === 0 ? <li>None linked.</li> : null}
            {document.events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>{event.title}</Link>
                <span className="mono"> · {relationLabel(event.relation ?? "")}</span>
              </li>
            ))}
          </ul>
        </div>
        {document.corrections.length ? (
          <div className="margin-note warning">
            <h2>Corrections</h2>
            {document.corrections.map((correction) => (
              <p key={correction.id}>{correction.note} <span className="mono">{correction.author}</span></p>
            ))}
          </div>
        ) : null}
      </aside>
    </article>
  );
}
