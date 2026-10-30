import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="frame footer-grid">
        <div>
          <h2>ZAMORA</h2>
          <p>
            Zambian Archive of Memory, Observation, Research and Analysis. A reading room for Zambia alone:
            what was recorded, what is documented now, and what the difference will not let us claim.
          </p>
        </div>
        <div>
          <h2>The staff</h2>
          <p>
            The copper line marks the latitudes Zambia spans, from about 8° south to about 18° south. It is a
            masthead instrument, not a scale for the text. The map is the geography.
          </p>
        </div>
        <div>
          <h2>Record</h2>
          <p>
            Province outlines are geoBoundaries ADM1, CC BY 4.0, simplified, boundary year 2020. District names are geoBoundaries ADM2 from the same year, listed and not drawn. Catalog
            notes are written for this shelf. They are not quotations. Full texts stay with their publishers.
          </p>
          <p>
            <Link href="/forecast">Forecasts</Link> · <Link href="/governance">Governance</Link> · <Link href="/pricing">Pricing</Link> · <Link href="/plan">90-day plan</Link> · <Link href="/launch">Launch kit</Link> · <Link href="/desk/workspace">Workspace</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
