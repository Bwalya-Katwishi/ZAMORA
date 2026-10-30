import Link from "next/link";
import { Suspense } from "react";
import { places as gazetteer } from "@/data/places";
import { AtlasMap } from "@/components/AtlasMap";
import { CatalogList } from "@/components/CatalogList";
import { yearSpan } from "@/lib/format";
import { documentsForPlace, getPlace, listEvents, listMappablePlaces, listProvinces, searchDocuments } from "@/lib/queries";

export const metadata = { title: "Atlas" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AtlasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const place = one(params.place);
  const from = Number(one(params.from) ?? "");
  const to = Number(one(params.to) ?? "");
  const [provinces, mappable, events] = await Promise.all([listProvinces(), listMappablePlaces(), listEvents()]);
  const selected = place ? await getPlace(place) : null;
  const focus = gazetteer.find((item) => item.id === place);
  const provinceId = focus?.kind === "district" ? focus.parentId : focus?.kind === "province" ? focus.id : undefined;
  const childDistricts = provinceId
    ? gazetteer.filter((item) => item.kind === "district" && item.parentId === provinceId).sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const unplacedDistricts = gazetteer.filter((item) => item.kind === "district" && !item.parentId);
  const documents = place
    ? await documentsForPlace(place, Number.isFinite(from) && from ? from : undefined, Number.isFinite(to) && to ? to : undefined)
    : (await searchDocuments({
        from: Number.isFinite(from) && from ? String(from) : undefined,
        to: Number.isFinite(to) && to ? String(to) : undefined,
        dateField: "about",
        comparative: "include",
      })).items;
  const placeIds = new Set(
    gazetteer.filter((item) => item.id === place || item.parentId === place).map((item) => item.id),
  );
  const visibleEvents = events.filter((event) => {
    const start = event.startYear ?? 0;
    const end = event.endYear ?? start;
    const inYears = !from || (end >= from && start <= (to || from + 9));
    const inPlace = !place || (event.placeId ? placeIds.has(event.placeId) : false);
    return inYears && inPlace;
  });
  const decades = Array.from({ length: 18 }, (_, index) => 1850 + index * 10);

  return (
    <div className="frame">
      <p className="kicker" style={{ marginTop: "1.2rem" }}>Archive atlas</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>The country, <em>indexed.</em></h1>
      <div className="atlas">
        <nav className="decade-list" aria-label="Decades">
          <Link href="/atlas" aria-current={!from && !place ? "page" : undefined}>All years</Link>
          {decades.map((decade) => {
            const query = new URLSearchParams();
            if (place) query.set("place", place);
            query.set("from", String(decade));
            query.set("to", String(decade + 9));
            const current = from === decade;
            return (
              <Link key={decade} href={`/atlas?${query.toString()}`} aria-current={current ? "page" : undefined}>
                {decade}s
              </Link>
            );
          })}
        </nav>
        <div>
          <Suspense fallback={<p>Opening the plate…</p>}>
            <AtlasMap places={mappable} selected={provinceId} />
          </Suspense>
          <article style={{ paddingTop: "0.8rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.03em", margin: "0 0 0.4rem" }}>
              {selected?.name ?? "Zambia"}
            </h2>
            <p>{selected?.note ?? "Choose a province. The modern boundaries are a 2020 research scaffold. Muchinga dates from 2011. Colonial names are kept as aliases, not drawn as if they were today's provinces. Districts from geoBoundaries ADM2, also 2020, are listed under a province. Their outlines are not drawn."}</p>
            {childDistricts.length ? (
              <nav aria-label="Districts in this province" style={{ marginTop: "0.8rem" }}>
                <p className="kicker">Districts, 2020</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 0.8rem" }}>
                  {childDistricts.map((district) => (
                    <Link key={district.id} href={`/atlas/districts/${district.id}`}>
                      {district.name}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : null}
            {unplacedDistricts.length > 0 && !place ? (
              <p className="muted">
                Districts left without a province, because the simplified polygon did not fall mostly inside one ADM1 boundary:{" "}
                {unplacedDistricts.map((district, index) => (
                  <span key={district.id}>
                    {index ? ", " : ""}
                    <Link href={`/atlas/districts/${district.id}`}>{district.name}</Link>
                  </span>
                ))}
                . No record is attributed to them.
              </p>
            ) : null}
          </article>
        </div>
        <div>
          <p className="kicker">Events in view</p>
          <div className="timeline">
            {visibleEvents.slice(0, 8).map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <time>{yearSpan(event.startYear, event.endYear)}</time>
                <strong>{event.title}</strong>
              </Link>
            ))}
          </div>
          <p className="kicker" style={{ marginTop: "1rem" }}>Records</p>
          {documents.length === 0 ? <p>Nothing catalogued for this cut of the map. That is a gap, not a quiet history.</p> : <CatalogList items={documents} />}
        </div>
      </div>
    </div>
  );
}
