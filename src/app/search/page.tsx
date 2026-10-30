import { CatalogList } from "@/components/CatalogList";
import { typeLabel } from "@/lib/format";
import { countDocuments, listCategories, listSearchPlaces, searchDocuments } from "@/lib/queries";
import { groupSearchPlaces, searchOutcome, type SearchInput } from "@/lib/search";

export const metadata = { title: "Search" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const input: SearchInput = {
    q: one(raw.q),
    phrase: one(raw.phrase),
    any: one(raw.any),
    exclude: one(raw.exclude),
    place: one(raw.place),
    category: one(raw.category),
    type: one(raw.type),
    author: one(raw.author),
    from: one(raw.from),
    to: one(raw.to),
    dateField: one(raw.dateField),
    comparative: one(raw.comparative),
  };
  const [result, places, categories, shelfCount] = await Promise.all([
    searchDocuments(input),
    listSearchPlaces(),
    listCategories(),
    countDocuments(),
  ]);
  const groups = groupSearchPlaces(places);
  const asked = Object.values(input).some(Boolean);
  const outcome = searchOutcome({
    asked,
    hits: result.items.length,
    errors: result.errors.length,
    outside: result.outside,
    unknownPlace: result.unknownPlace,
    shelfCount,
    placeChosen: Boolean(input.place),
  });

  return (
    <div className="frame" style={{ paddingTop: "1.3rem" }}>
      <p className="kicker">Advanced search</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)" }}>Ask the <em>shelf.</em></h1>
      <p className="muted" style={{ maxWidth: "40rem" }}>
        The default search stays inside Zambia. Quotation marks mark a phrase. OR is allowed. A leading minus excludes a word. Comparative material, currently the Katanga chapters of one labor history, stays hidden unless you ask for it.
      </p>
      <form action="/search" method="get" className="filters" style={{ marginTop: "1rem" }}>
        <label>Keywords<input name="q" defaultValue={input.q ?? ""} /></label>
        <label>Exact phrase<input name="phrase" defaultValue={input.phrase ?? ""} /></label>
        <label>Any of these<input name="any" defaultValue={input.any ?? ""} /></label>
        <label>Exclude<input name="exclude" defaultValue={input.exclude ?? ""} /></label>
        <label>Author<input name="author" defaultValue={input.author ?? ""} /></label>
        <label>Place
          <select name="place" defaultValue={input.place ?? ""}>
            <option value="">Any Zambian place</option>
            <optgroup label="Provinces">
              {groups.provinces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
            </optgroup>
            {groups.districts.map((group) => (
              <optgroup key={group.province} label={`${group.province} districts`}>
                {group.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </optgroup>
            ))}
            {groups.unassigned.length > 0 ? (
              <optgroup label="Districts without a province join">
                {groups.unassigned.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label>Discipline
          <select name="category" defaultValue={input.category ?? ""}>
            <option value="">Any</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>Form
          <select name="type" defaultValue={input.type ?? ""}>
            <option value="">Any</option>
            {["book", "paper", "report", "legal", "photograph", "archive", "newspaper", "gazette", "dataset"].map((type) => (
              <option key={type} value={type}>{typeLabel(type)}</option>
            ))}
          </select>
        </label>
        <label>From<input name="from" defaultValue={input.from ?? ""} inputMode="numeric" /></label>
        <label>To<input name="to" defaultValue={input.to ?? ""} inputMode="numeric" /></label>
        <label>Date means
          <select name="dateField" defaultValue={input.dateField ?? "published"}>
            <option value="published">Publication year</option>
            <option value="about">Years the work is about</option>
          </select>
        </label>
        <label>Comparative
          <select name="comparative" defaultValue={input.comparative ?? ""}>
            <option value="">Hide</option>
            <option value="include">Include, labeled</option>
          </select>
        </label>
        <button className="solid" type="submit">Search</button>
      </form>
      {result.errors.map((error) => <p key={error} className="warning">{error}</p>)}
      {result.unknownPlace ? <p>That place is not in the Zambian gazetteer used here.</p> : null}
      {outcome.countLine ? <p className="mono">{outcome.countLine}</p> : null}
      {outcome.gap ? (
        <div style={{ padding: "1.2rem 0" }}>
          <p>{outcome.gap}</p>
          {outcome.outsideNote ? <p>{outcome.outsideNote}</p> : null}
          {outcome.hint ? <p>{outcome.hint}</p> : null}
        </div>
      ) : null}
      {result.hiddenComparative > 0 ? (
        <p className="mono">{result.hiddenComparative} comparative source{result.hiddenComparative === 1 ? "" : "s"} matched and {result.hiddenComparative === 1 ? "was" : "were"} kept out of this list.</p>
      ) : null}
      <CatalogList items={result.items} />
    </div>
  );
}
