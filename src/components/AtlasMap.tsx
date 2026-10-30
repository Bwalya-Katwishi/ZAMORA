"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { mapView, project, provinces } from "@/data/map";
import { railTownIds } from "@/data/places";
import type { PlaceRef } from "@/lib/types";

export function AtlasMap({ places, selected }: { places: PlaceRef[]; selected?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const byId = new Map(places.map((place) => [place.id, place]));

  function choose(id: string) {
    const next = new URLSearchParams(params.toString());
    if (selected === id) next.delete("place");
    else next.set("place", id);
    router.push(`/atlas?${next.toString()}`);
  }

  const rail = railTownIds
    .map((id) => byId.get(id))
    .filter((place): place is PlaceRef => Boolean(place && place.latitude != null && place.longitude != null))
    .map((place) => project(place.longitude as number, place.latitude as number));

  const graticule: { d: string; label: string; x: number; y: number }[] = [];
  for (let lon = 24; lon <= 32; lon += 4) {
    const [x1, y1] = project(lon, mapView.minLat);
    const [x2, y2] = project(lon, mapView.maxLat);
    graticule.push({ d: `M${x1} ${y1} L${x2} ${y2}`, label: `${lon}°E`, x: x2 + 3, y: 18 });
  }
  for (let lat = -16; lat <= -10; lat += 2) {
    const [x1, y1] = project(mapView.minLon, lat);
    const [x2, y2] = project(mapView.maxLon, lat);
    graticule.push({ d: `M${x1} ${y1} L${x2} ${y2}`, label: `${Math.abs(lat)}°S`, x: 6, y: y1 - 3 });
  }

  return (
    <div className="map-plate">
      <svg viewBox={`0 0 ${mapView.width} ${mapView.height}`} role="img" aria-label="Provinces of Zambia">
        {graticule.map((line) => (
          <g key={line.label}>
            <path d={line.d} stroke="rgba(20,28,36,0.16)" strokeWidth="0.6" fill="none" />
            <text x={line.x} y={line.y} fontSize="11" fontFamily="ui-monospace, monospace" fill="#5e564c">
              {line.label}
            </text>
          </g>
        ))}
        {provinces.map((province) => {
          const active = selected === province.id;
          return (
            <path
              key={province.id}
              d={province.d}
              role="button"
              tabIndex={0}
              aria-label={province.name}
              aria-pressed={active}
              fill={active ? "rgba(154,70,48,0.45)" : "#efe4d2"}
              stroke="#141c24"
              strokeWidth={active ? 1.4 : 0.8}
              strokeLinejoin="round"
              onClick={() => choose(province.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  choose(province.id);
                }
              }}
            />
          );
        })}
        {rail.length > 1 ? (
          <polyline
            points={rail.map((point) => point.join(",")).join(" ")}
            fill="none"
            stroke="#9a4630"
            strokeWidth="1.6"
            strokeDasharray="2 2.4"
            strokeLinejoin="round"
          />
        ) : null}
        {rail.map((point, index) => (
          <circle key={railTownIds[index]} cx={point[0]} cy={point[1]} r="2.2" fill="#9a4630" />
        ))}
        {provinces.map((province) => (
          <text
            key={`${province.id}-label`}
            x={province.label[0]}
            y={province.label[1]}
            textAnchor="middle"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
            fill="#141c24"
            pointerEvents="none"
          >
            {province.name}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", padding: "0.45rem 0.3rem 0.2rem" }}>
        {provinces.map((province) => (
          <button key={province.id} type="button" aria-pressed={selected === province.id} onClick={() => choose(province.id)}>
            {province.name}
          </button>
        ))}
      </div>
      <p className="mono" style={{ margin: "0.4rem 0.3rem 0.2rem" }}>
        Line of rail drawn through modern town centers, Livingstone to Kitwe. A guide, not a surveyed alignment. The falls and Kariba are shared with Zimbabwe.
      </p>
    </div>
  );
}
