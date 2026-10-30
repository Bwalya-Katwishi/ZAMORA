export const POSITIONING =
  "ZamForesight is a Zambia-first evidence desk that compares a current district problem with the documented record. It helps newsrooms, researchers, businesses, and public institutions see what the record supports, what it does not, and when the evidence is not good enough.";

export interface Deliverable {
  slug: string;
  title: string;
  kind: string;
  paragraphs: string[];
}

const shelf =
  "The reading room is still named ZAMORA. On 15 October 2026 the shelf holds 52 metadata documents, 16 events, and 4 World Bank series. Twenty-two districts have no province assignment. The OCR trial stopped, and the transcript is not in the catalog.";

const prices =
  "Prices below are planning figures at ZMW 27 per USD, not quotes. Recheck the Bank of Zambia before a proposal. Student about ZMW 1,200 a year, newsroom about ZMW 54,000 a year, mining seat about ZMW 540,000 a year. University, NGO, cooperative, and government prices are separately defined and are not stated here. The public catalogue stays free. No payment is taken on this site.";

export const deliverables: Deliverable[] = [
  {
    slug: "product",
    title: "Product one-pager",
    kind: "One-pager",
    paragraphs: [
      POSITIONING,
      "ZAMORA is the reading room: atlas, search, desk, observatory, and method. ZamForesight is the later commercial desk around that room. A pack is returned when a place, a sector, and enough records line up. Otherwise the desk says the shelf is not enough. Ask-the-shelf quotes indexed catalog notes. A brief stays a draft until an editor signs it.",
      shelf,
      "What it will not do: name a suspect, diagnose a person, call an election, or publish a forecast that loses to persistence. District outlines are not drawn. International material appears only as labeled comparative context.",
    ],
  },
  {
    slug: "investor",
    title: "Investor one-pager",
    kind: "One-pager",
    paragraphs: [
      POSITIONING,
      "The bet is a Zambia-first evidence desk for newsrooms, universities, mines, cooperatives, and public institutions. Year one keeps models local. The public catalogue stays free. Paid desks are planning figures, not a booked pipeline.",
      `${shelf} There is no 5,000-record corpus to underwrite, and Africa-wide coverage is later.`,
      `${prices} The near milestone is one pilot that comes back with a second question. That return has not happened.`,
    ],
  },
  {
    slug: "university-proposal",
    title: "University final-year proposal",
    kind: "Proposal outline",
    paragraphs: [
      "Working title: a Zambia-only evidence desk that separates a documented record from a gap.",
      "A final-year student would use the public catalogue, the district profiles, and the method page. The project would add cited records the shelf does not yet hold, with a license state recorded before ingestion. It would not train a model on publisher text, and it would not score an individual.",
      "Deliverables for the year: a signed source note, a district profile that cites geoBoundaries, and a short brief that an editor could refuse to export. Success is a second question the shelf can answer with an accession, or an honest refusal.",
      prices,
    ],
  },
  {
    slug: "grant",
    title: "Grant description",
    kind: "Grant outline",
    paragraphs: [
      POSITIONING,
      "The grant would fund license checks, metadata capture, and editor time. It would not fund a crawl of publisher full text. OCR stays stopped until a page meets the limit already fixed.",
      "Outputs: a source register, district profiles with the 2020 boundary citation, and briefs that cannot export without a signature. The corpus target is not 5,000 records in this description.",
      shelf,
    ],
  },
  {
    slug: "pilot-newsroom",
    title: "Newsroom pilot",
    kind: "Pilot proposal",
    paragraphs: [
      "Offer: one newsroom desk for a quarter, on the planning newsroom figure, paid by invoice and bank transfer if the newsroom accepts. No card charge is built.",
      "The desk compares one district question with the shelf. The newsroom gets a pack, an ask transcript with citations, and a brief an editor must sign before it leaves the building. If the shelf is short, the deliverable is the refusal.",
      "Success: the newsroom sends a second question. Status: no newsroom has been onboarded.",
      prices,
    ],
  },
  {
    slug: "pilot-university",
    title: "University pilot",
    kind: "Pilot proposal",
    paragraphs: [
      "Offer: a seminar desk for students and one supervising editor. The public catalogue remains the reading room. Private notes and a shared brief sit in the workspace.",
      "University price is separately defined. This page does not invent one.",
      "The seminar uses district profiles and the method page. Students do not receive individual risk scores, and they do not copy texts the license does not allow.",
      "Success: a second question from the seminar. Status: no university pilot is onboarded.",
    ],
  },
  {
    slug: "pilot-mine",
    title: "Mine or cooperative pilot",
    kind: "Pilot proposal",
    paragraphs: [
      "Offer: one private desk for a mine or an agricultural cooperative, comparing a district question with the documented record. The mining figure is a planning seat price. A cooperative price is separately defined.",
      "The desk will not issue a maize-price forecast, a rainfall forecast, or a water-disruption forecast. Those series are not stored. Electricity access may be shown as a national World Bank series, with the baseline comparison, and it is not a mine forecast.",
      "Success: a second operational question that the record can support or refuse. Status: no mine or cooperative is onboarded.",
      prices,
    ],
  },
  {
    slug: "pilot-ngo",
    title: "NGO or government pilot",
    kind: "Pilot proposal",
    paragraphs: [
      "Offer: one desk for an NGO or a public institution. Price is separately defined. Nothing on this page is a procurement quote.",
      "The desk can show what the shelf holds for a district and a sector, the license on each source, and the gaps. It does not diagnose a person and it does not rank households.",
      "A disease question is refused as an individual score. Outbreak reporting would need a licensed aggregate series, which is not on the shelf.",
      "Success: the institution returns with a second question. Status: no NGO or government pilot is onboarded.",
    ],
  },
  {
    slug: "pitch",
    title: "Pitch outline",
    kind: "10 slides",
    paragraphs: [
      "1. Title. ZamForesight, and the sentence: " + POSITIONING,
      "2. The room. ZAMORA stays the reading room. ZamForesight is the desk around it.",
      "3. The problem. A district question meets a short, licensed shelf. The honest answer is often that the evidence is not good enough.",
      "4. What is held. 52 metadata documents, 16 events, 4 World Bank series. Not 5,000 records.",
      "5. The desk. Pack, ask-the-shelf, and a brief that cannot export without a signature.",
      "6. The map. Province outlines from geoBoundaries ADM1. Districts listed, not drawn. Twenty-two unassigned.",
      "7. Forecasts. Persistence, long-run mean, rolling mean. A line ships only if it wins the holdout. Five named uses have no series.",
      "8. Governance. License state before ingest. Metadata-only stays metadata-only. Takedown blocks the source.",
      "9. Pilots and prices. Four pilot types. Planning figures only. Public catalogue free. No live payment.",
      "10. The ask. One pilot, one question, and a second question if the first was useful. That return is the milestone, and it is still open.",
    ],
  },
  {
    slug: "demo",
    title: "Demo script",
    kind: "Demo",
    paragraphs: [
      "Start on the front page and say the room is Zambia only. Open Atlas, choose a province, and say the district outlines are not drawn. Open an unassigned district and read the notice that no record is attributed.",
      "Open Search and a Hansard card. Point at the publisher link and say the speech is not stored. Open the desk, run a pack that is too thin, and read the insufficient sentence.",
      "Open Forecast. Read the rainfall refusal. Read a World Bank series and the line that says a losing model is withheld. Open Pricing and say the figures are not quotes. End on this launch page and say no pilot has returned.",
    ],
  },
  {
    slug: "methodology",
    title: "Methodology",
    kind: "Method copy",
    paragraphs: [
      "Facts, catalog notes, interpretation, correlation, scenarios, and gaps stay labeled. Publication date is not event date. A pack needs a known place, a sector, at least three records, and adequate date coverage. Confidence stays limited because the texts are not held.",
      "Ask-the-shelf uses the local hash zamora-hash-v1 on numeric arrays. No external model is called. An answer is an extract or one labeled synthesis sentence. Instructions inside a question or a source are not obeyed.",
      "A forecast is local arithmetic on a licensed annual series. It is compared with last value, the training mean, and a three-year rolling mean. There is no seasonal cycle in annual data. The line is withheld unless its holdout miss is lower than persistence. Publication waits for a signed brief.",
    ],
  },
  {
    slug: "responsible-ai",
    title: "Responsible-AI policy",
    kind: "Policy outline",
    paragraphs: [
      "This is an outline, not an adopted policy. Year-one models stay local. The shelf does not send catalog notes to an external model.",
      "The desk refuses named accusations, individual diagnoses, and certain election calls. It does not produce an individual risk score. A forecast that does not beat persistence is not shipped. Missing data is called insufficient.",
      "A human signs a brief before export. A human signs a brief before a forecast is published outside the desk. OCR that fails its pre-set limit is not added to the catalog.",
    ],
  },
  {
    slug: "data-governance",
    title: "Data-governance policy",
    kind: "Policy outline",
    paragraphs: [
      "This is an outline, not an adopted policy. Every source needs a license state before ingestion: public domain, open, publisher metadata only, request-based, partnership required, restricted, or expired.",
      "No crawl runs without permission. Full text is not stored without a checked right. Restricted material is not displayed. A takedown sets the source to blocked and is written to the audit log.",
      "Ingest, edit, override, query, brief, export, and forecast are audit actions. An open district is not given another place's records.",
    ],
  },
  {
    slug: "privacy",
    title: "Privacy outline",
    kind: "Privacy outline",
    paragraphs: [
      "This is an outline, not a privacy notice that has been reviewed. Accounts store a name, an email, a password hash, and a role. Sessions are random tokens, stored as a hash.",
      "API keys are stored as hashes. The raw key is shown once to the person who created it. The desk does not build an individual health or political score.",
      "Usage rows count desk actions for an organization. They are not a profile of a person outside the account. A takedown request is recorded with the reason.",
    ],
  },
  {
    slug: "terms",
    title: "Terms outline",
    kind: "Terms outline",
    paragraphs: [
      "This is an outline, not a contract. The public catalogue is a reading room. Catalog notes are written for the shelf. They are not the publisher's text.",
      "A brief, an export, or a forecast on a paid desk is a draft until the rules on this site say it can leave: a source, a clear citation check, and a signature. A forecast also has to beat persistence.",
      "Planning prices are not an offer. Bank-transfer invoices are records. The site does not take a card payment. Comparative material is labeled and is not Zambia's record.",
    ],
  },
  {
    slug: "data-license",
    title: "Data-license policy",
    kind: "Policy outline",
    paragraphs: [
      "This is an outline, not a license grant. World Bank values are stored with attribution. geoBoundaries provinces and district names are CC BY 4.0, boundary year 2020.",
      "Parliament, ZambiaLII, and gazette rows are metadata and links. The speeches, judgments, and gazette text are not copied onto this shelf. Book and paper notes are catalog notes.",
      "A source with no license state is not ingested. An expired or unreviewed license blocks the next ingest. Recheck a license before adding pages.",
    ],
  },
  {
    slug: "onboarding",
    title: "Onboarding guide",
    kind: "Guide",
    paragraphs: [
      "Nine steps: name the organization, add a member, write the question, name a place that is already on the shelf, name a sector, save the search, draft a brief, send feedback, and come back with a second question.",
      "The second question is the success metric. A checklist with eight ticks is not a finished pilot.",
      "Roles in the room are reader, viewer, researcher, analyst, journalist, editor, organization admin, admin, and API user. The seeded accounts stay researcher, editor, and admin. An API user gets a hash, not a stored raw key.",
    ],
  },
  {
    slug: "support",
    title: "Support and feedback",
    kind: "Workflow",
    paragraphs: [
      "A reader reports a wrong tag, a bad citation, or a license worry from the document page or by writing to the desk. An editor records a tag override with a note, or a takedown with a reason of at least twelve characters.",
      "Ask-the-shelf feedback is stored for the signed-in reader. It does not rewrite the answer by itself.",
      "A correction of a published year is not offered. The year on the card stays the year in the source note.",
    ],
  },
  {
    slug: "announcement",
    title: "Launch announcement",
    kind: "Announcement",
    paragraphs: [
      "ZAMORA, the Zambian Archive of Memory, Observation, Research and Analysis, is open as a reading room. Yesterday's evidence. Tomorrow's insight. ZamForesight is the name of the evidence desk that will sit around it for pilots.",
      shelf,
      "You can search, open a province, and ask the desk. You will sometimes be told the evidence is not good enough. That sentence is the product. Forecasts, private desks, and exports that leave the building are still gated. No pilot is announced as signed, because none is.",
    ],
  },
  {
    slug: "pilot-report",
    title: "90-day pilot report",
    kind: "Report template",
    paragraphs: [
      "Template, not a completed report. Pilot name, type, start date, question, place, sector. Leave these blank until an organization exists.",
      "What the shelf returned: accessions, or the insufficient sentence. What was refused: forecast, diagnosis, or a district with no assignment. What the editor signed, if anything. What was not exported.",
      "Did the pilot send a second question? If no, the pilot did not meet the success metric. Attach the license states used. Do not attach a corpus count above the records actually retrieved.",
      "Planning cost, if an invoice was issued, labeled as a planning figure. No card receipt, because none is generated.",
    ],
  },
];
