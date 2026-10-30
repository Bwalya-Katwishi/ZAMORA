import { NextResponse } from "next/server";
import { questionTypes } from "@/lib/evidence";
import { listCategories, listPeople, listSearchPlaces } from "@/lib/queries";

export async function GET() {
  const [places, sectors, entities] = await Promise.all([listSearchPlaces(), listCategories(), listPeople()]);
  return NextResponse.json({
    places: places.map((place) => ({
      id: place.id,
      name: place.name,
      kind: place.kind,
      parentName: place.parentName,
      assigned: place.kind !== "district" || Boolean(place.parentName),
    })),
    sectors: sectors.map((sector) => ({ id: sector.id, name: sector.name, parentId: sector.parentId })),
    entities: entities.map((entity) => ({ id: entity.id, name: entity.name })),
    questionTypes,
  });
}
