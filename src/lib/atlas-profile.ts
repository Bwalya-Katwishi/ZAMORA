import type { PlaceSeed } from "@/data/places";

export const BOUNDARY_CITATION =
  "geoBoundaries ZMB ADM2, CC BY 4.0, boundary year 2020, release commit 9469f09. geoBoundaries names the source as GRID3 and the Office of the Surveyor General.";

export const BOUNDARY_LICENSE = "CC BY 4.0";

export interface ProfileRecord {
  id: string;
  accession: string;
  title: string;
  year: number | null;
  sectors: string[];
}

export interface DistrictProfile {
  id: string;
  officialName: string;
  boundaryCitation: string;
  license: string;
  boundaryYear: 2020;
  drawn: false;
  assigned: boolean;
  provinceId: string | null;
  provinceName: string | null;
  note: string;
  uncertainty: string | null;
  records: ProfileRecord[];
  sectors: { name: string; count: number }[];
  coFiled: { id: string; name: string }[];
  neighborNote: string;
  gaps: string[];
  representative: { latitude: number; longitude: number; note: string } | null;
}

export function districtProfile(place: PlaceSeed, gazetteer: PlaceSeed[], records: ProfileRecord[]): DistrictProfile | null {
  if (place.kind !== "district") return null;
  const assigned = Boolean(place.parentId);
  const filed = assigned ? records : [];
  const province = gazetteer.find((item) => item.id === place.parentId);
  const coFiled = assigned
    ? gazetteer.filter((item) => item.kind === "district" && item.parentId === place.parentId && item.id !== place.id)
    : [];
  const counts = new Map<string, number>();
  for (const record of filed) {
    for (const sector of record.sectors) counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }
  return {
    id: place.id,
    officialName: place.name,
    boundaryCitation: BOUNDARY_CITATION,
    license: BOUNDARY_LICENSE,
    boundaryYear: 2020,
    drawn: false,
    assigned,
    provinceId: place.parentId ?? null,
    provinceName: province?.name ?? null,
    note: place.note,
    uncertainty: assigned ? null : `${place.name} has no province assignment. No record is attributed to it.`,
    records: filed,
    sectors: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    coFiled: coFiled.map((item) => ({ id: item.id, name: item.name })).sort((a, b) => a.name.localeCompare(b.name)),
    neighborNote: assigned
      ? "These are other districts filed under the same province. A shared border was not measured."
      : "No province is filed, so no neighbor is inferred.",
    gaps: filed.length
      ? []
      : assigned
        ? ["No catalog record is tagged to this district."]
        : ["No record is attributed while the province assignment is open."],
    representative:
      place.latitude != null && place.longitude != null
        ? {
            latitude: place.latitude,
            longitude: place.longitude,
            note: "A ring centroid from the simplified polygon, not a surveyed town.",
          }
        : null,
  };
}

export function filterProfileRecords(
  records: ProfileRecord[],
  filter: { sector?: string; from?: number; to?: number },
): ProfileRecord[] {
  return records.filter((record) => {
    if (filter.sector && !record.sectors.includes(filter.sector)) return false;
    if (filter.from && (record.year == null || record.year < filter.from)) return false;
    if (filter.to && (record.year == null || record.year > filter.to)) return false;
    return true;
  });
}
