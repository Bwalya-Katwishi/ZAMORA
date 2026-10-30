import trial from "@/data/ocr-trial.json";
import { researchQuestions } from "@/data/questions";
import { documents } from "@/data/documents";
import { judgeOcrSample, OCR_MEAN_CER_LIMIT, OCR_PAGE_CER_LIMIT, type OcrPageScore } from "@/lib/ocr";
import { licenseLog } from "@/lib/policy";

const ocr = judgeOcrSample(trial.pages as OcrPageScore[]);

function percent(value: number | null): string {
  if (value === null) return "unscored";
  return `${(value * 100).toFixed(1)} percent`;
}

function capturedLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (!year || !month || !day || !months[month - 1]) return iso;
  return `${day} ${months[month - 1]} ${year}`;
}

export const metadata = { title: "Method" };

const classes = [
  ["Documented", "A date, a name, or an instrument that the linked source supports. The independence date is documented. A casualty figure we have not transcribed is not."],
  ["Catalog note", "Prose written for this shelf to say what a work is. It is not a quotation, and it is not the finding of the book."],
  ["Interpretation", "An argument, such as Ferguson's reading of the Copperbelt. Marked by the kind of book it is. Not upgraded into a fact."],
  ["Correlation", "Two series moving together, or a baseline with a lower error. Not a cause. The observatory says so in the same column as the number."],
  ["Scenario", "A question about what could be examined next, with assumptions and with the sentence that is not claimed. Never a probability."],
  ["Gap", "An empty ledger, a missing series, a province with no document. Shown as a gap. Not filled with a plausible story."],
];

export default function MethodPage() {
  return (
    <div className="frame" style={{ padding: "1.4rem 0 2.5rem" }}>
      <p className="kicker">Method</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>Six kinds of <em>sentence.</em></h1>
      <p className="deck">News says what happened. An archive keeps what was recorded. Research asks why. Comparison looks for a rhyme. A scenario asks what could follow, and then stops where the evidence stops.</p>
      <div>
        {classes.map(([name, text], index) => (
          <article key={name} style={{ display: "grid", gridTemplateColumns: "7rem 1fr", gap: "1rem", borderTop: "1px solid var(--rule)", padding: "1rem 0" }}>
            <span className="mono">0{index + 1}</span>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0 0 0.3rem", fontSize: "2rem" }}>{name}</h2>
              <p style={{ margin: 0 }}>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <p>Ask-the-shelf ranks catalog notes with a local hashed embedding, zamora-hash-v1. The vectors are numeric arrays in PostgreSQL. This cluster does not load pgvector, and no external model is called. An answer sentence is either an indexed note or marked synthesis. The evidence pack itself stays lexical. A model is not asked to invent a citation. Sensitive desks are private to their members. Instructions found inside a source document are catalogued as text, not obeyed as commands. An editor may add or remove a place, a sector, or an entity that is already on the shelf. The change is stored with the editor’s name and a note. The publication year is not rewritten. The evidence desk returns a cited pack only when a place, a sector, and at least three records line up. Otherwise it says the shelf is not enough. A foresight brief is drafted from that pack. It stays on the desk until an editor reviews it and signs it. Export is refused without a source, without a clear citation check, or without that signature. A forecast is local arithmetic on a licensed annual series. It is withheld unless it beats persistence, and it is not published without a signed brief. Rainfall, maize prices, water service, disease outbreaks, and mining activity are not series on this shelf.</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.4rem", margin: "2rem 0 0.6rem" }}>Questions the shelf will open</h2>
      <div>
        {researchQuestions.map((item) => (
          <article key={item.id} style={{ borderTop: "1px solid var(--rule)", padding: "1rem 0" }}>
            <p className="kicker">{item.sector}</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.7rem", margin: "0.2rem 0 0.4rem" }}>{item.question}</h3>
            <p style={{ margin: "0 0 0.3rem" }}>{item.held}</p>
            <p className="muted" style={{ margin: 0 }}>Not on this shelf: {item.notHeld}</p>
          </article>
        ))}
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.4rem", margin: "2rem 0 0.6rem" }}>License log</h2>
      <p className="muted">Grouped from the rights line stored on each accession. Full text stays out unless that line says otherwise.</p>
      <div>
        {licenseLog(documents).map((row) => (
          <article key={row.rights} style={{ display: "grid", gridTemplateColumns: "4rem 1fr", gap: "1rem", borderTop: "1px solid var(--rule)", padding: "0.8rem 0" }}>
            <span className="mono">{row.count}</span>
            <div>
              <p style={{ margin: "0 0 0.25rem" }}>{row.rights}</p>
              <p className="mono" style={{ margin: 0 }}>{row.accessions.join(" · ")}</p>
            </div>
          </article>
        ))}
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.4rem", margin: "2rem 0 0.6rem" }}>OCR trial</h2>
      <p>
        On {capturedLabel(trial.capturedOn)}, {trial.pages.length} pages of the {trial.sourceTitle} were rendered from the National Assembly PDF and read with {trial.engine}. The file has {trial.pagesInFile} pages. {trial.pagesMissingTextInFile === 0 ? "Every page has a text layer." : `${trial.pagesMissingTextInFile} lack a text layer.`} The National Flag and Armorial Ensigns Act, seven pages from the same publisher, also has a text layer on every page. Gazette issue files returned HTTP 403 to a download, so no scanned page is in this sample.
      </p>
      <p>
        The judged error ignores word order, because the PDF text layer does not follow the page. Before the run, the line was {percent(OCR_MEAN_CER_LIMIT)} on average and {percent(OCR_PAGE_CER_LIMIT)} on any one page. This sample averaged {percent(ocr.meanCer)}. The worst page was {percent(ocr.maxCer)}. That page is the long title and the list of amending Acts. The engine read the word “of” as “01”, so an Act number was fused to its year.
      </p>
      <p>{ocr.reason} The transcript is not stored.</p>
    </div>
  );
}
