import { redirect } from "next/navigation";
import { allows, getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const metadata = { title: "Taxonomy" };

export default async function TaxonomyPage() {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "editor")) redirect("/login");
  const categories = await query<{ id: string; name: string; description: string; active: boolean }>(
    "select id, name, description, active from categories order by position, name",
  );
  return (
    <div className="frame" style={{ padding: "1.4rem 0 2rem" }}>
      <p className="kicker">Editor · {user.name}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.8rem, 5vw, 4.2rem)" }}>The index, <em>editable.</em></h1>
      <ul>
        {categories.map((category) => (
          <li key={category.id} style={{ borderTop: "1px solid var(--rule)", padding: "0.6rem 0" }}>
            <strong>{category.name}</strong> <span className="mono">{category.id}{category.active ? "" : " · inactive"}</span>
            <form action={`/api/taxonomy/${category.id}`} method="post" className="ruled">
              <input type="hidden" name="_method" value="patch" />
              <label>Name<input name="name" defaultValue={category.name} /></label>
              <label>Description<textarea name="description" defaultValue={category.description} /></label>
              <button className="text-button" type="submit">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <form action="/api/taxonomy" method="post" className="ruled" style={{ maxWidth: "36rem" }}>
        <p className="kicker">Add a category</p>
        <label>Id<input name="id" required pattern="[a-z0-9-]{2,40}" /></label>
        <label>Name<input name="name" required /></label>
        <label>Parent id<input name="parentId" /></label>
        <label>Description<textarea name="description" required /></label>
        <button className="solid" type="submit">Add to the index</button>
      </form>
    </div>
  );
}
