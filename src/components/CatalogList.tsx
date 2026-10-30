import Link from "next/link";
import { typeLabel, yearSpan } from "@/lib/format";
import type { DocCard } from "@/lib/types";

export function CatalogList({ items }: { items: DocCard[] }) {
  if (!items.length) return null;
  return (
    <div className="rows">
      {items.map((item) => (
        <Link key={item.id} href={`/documents/${item.id}`}>
          <span className="mono">{item.accession}</span>
          <span className="mono">{yearSpan(item.publishedYear, null, "—")}</span>
          <span className="mono">{typeLabel(item.type)}</span>
          <span>
            <span className="row-title">{item.title}</span>
            {item.comparative ? <span className="mono"> · Comparative context</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
