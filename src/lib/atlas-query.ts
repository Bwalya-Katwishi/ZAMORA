import { places } from "@/data/places";
import { districtProfile, filterProfileRecords, type ProfileRecord } from "@/lib/atlas-profile";
import { query } from "@/lib/db";
import { documentsForPlace } from "@/lib/queries";

export function listDistrictCards() {
  return places
    .filter((place) => place.kind === "district")
    .map((place) => ({
      id: place.id,
      name: place.name,
      assigned: Boolean(place.parentId),
      provinceId: place.parentId ?? null,
      drawn: false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadDistrict(id: string, filter: { sector?: string; from?: number; to?: number } = {}) {
  const place = places.find((item) => item.id === id);
  if (!place || place.kind !== "district") return null;
  let records: ProfileRecord[] = [];
  if (place.parentId) {
    try {
      const docs = await documentsForPlace(id, filter.from, filter.to);
      const ids = docs.map((doc) => doc.id);
      const tags = ids.length
        ? await query<{ document_id: string; name: string }>(
            `select dc.document_id, c.name
             from document_categories dc
             join categories c on c.id = dc.category_id
             where dc.document_id = any($1::uuid[])`,
            [ids],
          )
        : [];
      records = docs.map((doc) => ({
        id: doc.id,
        accession: doc.accession,
        title: doc.title,
        year: doc.publishedYear,
        sectors: tags.filter((tag) => tag.document_id === doc.id).map((tag) => tag.name),
      }));
    } catch {
      records = [];
    }
  }
  return districtProfile(place, places, filterProfileRecords(records, filter));
}
