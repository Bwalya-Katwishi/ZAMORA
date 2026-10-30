import Link from "next/link";
import { CatalogList } from "@/components/CatalogList";
import { yearSpan } from "@/lib/format";
import { homeShelf, listCategories } from "@/lib/queries";

export default async function HomePage() {
  const [home, categories] = await Promise.all([homeShelf(), listCategories()]);
  const disciplines = categories.filter((category) => !category.parentId);
  const timeline = home.eventsList.filter((event) =>
    ["mosi-oa-tunya-1855", "falls-bridge-1905", "rail-kabwe-1906", "capital-lusaka-1935", "rli-1937", "kariba", "independence-1964", "election-1991", "muchinga-2011"].includes(event.id),
  );

  return (
    <div className="frame">
      <section className="hero">
        <div>
          <p className="kicker">Plate 00 · The country as a record</p>
          <h1 className="display">8° to 18° <em>south.</em></h1>
          <p className="deck">
            ZAMORA is a research room for Zambia alone. It keeps what was written down, sets it beside what can be sourced now, and refuses to treat a resemblance as a prediction.
          </p>
          <form className="slip" action="/search" method="get">
            <label htmlFor="q">Open a Zambian question</label>
            <input id="q" name="q" placeholder="Kariba, the line of rail, Barotseland, Bemba" />
            <button type="submit">Search the record</button>
          </form>
        </div>
        <aside className="scope-note">
          <p><strong>On the desk</strong></p>
          <p>{home.documents} catalogued works. {home.events} dated events. {home.comparative} item marked as comparative context, and kept out of the default search.</p>
          <p>{home.wire}</p>
          <p className="mono">Scope: the Republic of Zambia, and the territory that became it.</p>
        </aside>
      </section>

      <section className="spread">
        <figure className="plate">
          <img src="/media/victoria-falls-bridge-1905.jpg" alt="The railway bridge in the gorge at Mosi-oa-Tunya, photographed in 1905." />
          <figcaption>
            Victoria Falls Bridge. Photograph in Stead&apos;s Review, November 1905. Public domain via Wikimedia Commons. The gorge is the border: the north bank is Zambia, the south bank is Zimbabwe. ZAMORA follows the Zambian bank and the railway it carried north.
          </figcaption>
        </figure>
        <div>
          <p className="kicker">A spine, not a feed</p>
          <h2 className="section-head" style={{ marginTop: 0 }}><span style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", letterSpacing: "-0.03em" }}>From the falls to the Copperbelt</span></h2>
          <p>
            The line of rail crossed the Zambezi in 1905 and reached Broken Hill, now Kabwe, in 1906. Lusaka, a railway town, became the capital in 1935. The Copperbelt&apos;s industrial towns came at the end of the 1920s. The atlas treats that line as an index.
          </p>
          <div className="timeline">
            {timeline.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <time>{event.startOn ?? yearSpan(event.startYear, event.endYear)}</time>
                <strong>{event.title}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="compare">
        <article className="fact">
          <p className="kicker">Documented</p>
          <h2>Kariba, in the studies</h2>
          <p>The dam and the resettlement of Gwembe Tonga communities are on the shelf, with the period stated and the lake marked as shared with Zimbabwe.</p>
          <ul>
            <li><Link href="/documents/scudder-1962">Scudder, The Ecology of the Gwembe Tonga, 1962</Link></li>
            <li><Link href="/documents/colson-1971">Colson, The Social Consequences of Resettlement, 1971</Link></li>
          </ul>
        </article>
        <article className="gap">
          <p className="kicker">Not claimed</p>
          <h2>Power, next season</h2>
          <p>A national figure for access to electricity is not generation, not hydropower, and not a load-shedding log. No rainfall series for the Zambezi catchment is stored. No probability is offered.</p>
          <p><Link href="/observatory?question=kariba-power">Open the question in the observatory</Link></p>
        </article>
      </section>

      <div className="section-head">
        <h2>Index of the country</h2>
        <Link href="/disciplines">All disciplines</Link>
      </div>
      <nav className="contents" aria-label="Disciplines">
        {disciplines.map((category, index) => (
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

      <div className="section-head">
        <h2>On the shelf</h2>
        <span className="mono">Initial catalog, 14 October 2026. Not a claim about when the works were made.</span>
      </div>
      <CatalogList items={home.shelf} />
    </div>
  );
}
