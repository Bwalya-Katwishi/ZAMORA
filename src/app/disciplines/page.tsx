import Link from "next/link";
import { listCategories } from "@/lib/queries";

export const metadata = { title: "Index" };

export default async function DisciplinesPage() {
  const categories = await listCategories();
  const parents = categories.filter((category) => !category.parentId);
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2rem" }}>
      <p className="kicker">Disciplinary index</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>Eleven ways <em>in.</em></h1>
      <p className="deck">Each discipline keeps a layout of its own. A legal instrument is not set like a field note, and a safeguard is not set like a chart.</p>
      <nav className="contents">
        {parents.map((category, index) => (
          <Link key={category.id} href={`/disciplines/${category.id}`}>
            <span className="contents-num">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <span className="contents-name">{category.name}</span>
              <small>{category.description}</small>
            </span>
            <span className="mono">{category.layout}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
