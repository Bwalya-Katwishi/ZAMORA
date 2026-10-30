import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDistrict } from "@/lib/atlas-query";

export const metadata = { title: "District" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DistrictPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const sector = one(query.sector);
  const from = Number(one(query.from) ?? "");
  const to = Number(one(query.to) ?? "");
  const profile = await loadDistrict(id, {
    sector,
    from: Number.isFinite(from) && from ? from : undefined,
    to: Number.isFinite(to) && to ? to : undefined,
  });
  if (!profile) notFound();
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker"><Link href="/atlas">Atlas</Link> · District profile</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>{profile.officialName}</h1>
      <p>{profile.assigned ? `Filed under ${profile.provinceName}.` : profile.uncertainty}</p>
      <p>Boundary: {profile.boundaryCitation} License: {profile.license}. Boundary year {profile.boundaryYear}. The district outline is not drawn.</p>
      <p className="muted">{profile.note}</p>
      {profile.representative ? (
        <p className="mono">Representative point {profile.representative.latitude.toFixed(3)}, {profile.representative.longitude.toFixed(3)}. {profile.representative.note}</p>
      ) : null}
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Records</h2>
      {profile.records.length === 0 ? <p>{profile.gaps[0]}</p> : null}
      <ul>
        {profile.records.map((record) => (
          <li key={record.id}>
            <Link href={`/documents/${record.id}`}>{record.accession}</Link> {record.title}
            {record.year ? ` (${record.year})` : ""}
          </li>
        ))}
      </ul>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Sectors</h2>
      {profile.sectors.length === 0 ? <p>No sector tag is attached to a record on this profile.</p> : (
        <ul>{profile.sectors.map((sectorRow) => <li key={sectorRow.name}>{sectorRow.name}: {sectorRow.count}</li>)}</ul>
      )}
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>{profile.assigned ? "Same province" : "Neighbors"}</h2>
      <p>{profile.neighborNote}</p>
      {profile.coFiled.length === 0 ? <p>No other district is filed with this one.</p> : (
        <p>{profile.coFiled.map((item) => item.name).join(", ")}.</p>
      )}
    </div>
  );
}
