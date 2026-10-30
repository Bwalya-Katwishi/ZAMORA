import { readFileSync } from "node:fs";
import pg from "pg";
import { documents } from "../src/data/documents";
import { events } from "../src/data/events";
import { places } from "../src/data/places";
import { scenarios } from "../src/data/scenarios";
import { categories } from "../src/data/taxonomy";
import { loadEnvFile, requireEnv } from "../src/lib/env";
import { validateCatalog } from "../src/lib/integrity";
import { hashPassword } from "../src/lib/password";

interface IndicatorFile {
  retrieved: string;
  source: string;
  sourceUrl: string;
  series: {
    code: string;
    name: string;
    unit: string;
    question: string;
    caveat: string;
    observations: { year: number; value: number }[];
  }[];
}

async function main(): Promise<void> {
  loadEnvFile();
  const issues = validateCatalog();
  if (issues.length) {
    throw new Error(issues.map((issue) => `${issue.id}: ${issue.message}`).join("\n"));
  }
  const password = requireEnv("SEED_PASSWORD");
  if (password.length < 12) throw new Error("SEED_PASSWORD must be at least 12 characters.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed development accounts while NODE_ENV is production.");
  }
  const indicators = JSON.parse(readFileSync("data/indicators/worldbank-zmb.json", "utf8")) as IndicatorFile;
  const client = new pg.Client({ connectionString: requireEnv("DATABASE_URL") });
  await client.connect();
  await client.query("begin");
  try {
    const org = await client.query<{ id: string }>(
      `insert into organizations (name, kind)
       select 'ZAMORA reading room', 'desk'
       where not exists (select 1 from organizations where name = 'ZAMORA reading room')
       returning id`,
    );
    const orgId =
      org.rows[0]?.id ??
      (await client.query<{ id: string }>("select id from organizations where name = 'ZAMORA reading room'")).rows[0].id;

    const passwordHash = await hashPassword(password);
    const users = [
      ["researcher@zamora.local", "Researcher", "researcher"],
      ["editor@zamora.local", "Editor", "editor"],
      ["admin@zamora.local", "Administrator", "admin"],
    ];
    for (const [email, name, role] of users) {
      await client.query(
        `insert into users (organization_id, email, name, password_hash, role)
         values ($1, $2, $3, $4, $5)
         on conflict (email) do update set
           name = excluded.name,
           password_hash = excluded.password_hash,
           role = excluded.role,
           organization_id = excluded.organization_id`,
        [orgId, email, name, passwordHash, role],
      );
    }

    for (const place of places) {
      await client.query(
        `insert into places (id, name, kind, parent_id, latitude, longitude, valid_from, valid_to, note)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (id) do update set
           name = excluded.name, kind = excluded.kind, parent_id = excluded.parent_id,
           latitude = excluded.latitude, longitude = excluded.longitude,
           valid_from = excluded.valid_from, valid_to = excluded.valid_to, note = excluded.note`,
        [
          place.id,
          place.name,
          place.kind,
          place.parentId ?? null,
          place.latitude ?? null,
          place.longitude ?? null,
          place.validFrom ?? null,
          place.validTo ?? null,
          place.plate ?? place.note,
        ],
      );
      await client.query("delete from place_names where place_id = $1", [place.id]);
      for (const alias of place.aliases ?? []) {
        await client.query("insert into place_names (place_id, name, kind) values ($1, $2, 'alias')", [place.id, alias]);
      }
    }

    for (const category of categories) {
      await client.query(
        `insert into categories (id, name, parent_id, description, layout, position, active)
         values ($1,$2,$3,$4,$5,$6, true)
         on conflict (id) do update set
           name = excluded.name, parent_id = excluded.parent_id, description = excluded.description,
           layout = excluded.layout, position = excluded.position`,
        [category.id, category.name, category.parentId ?? null, category.description, category.layout, category.position],
      );
    }

    const people = new Map<string, { name: string; sortName: string; kind: string }>();
    for (const document of documents) {
      for (const creator of document.creators) {
        const existing = people.get(creator.id);
        if (existing && existing.name !== creator.name) {
          throw new Error(`Person ${creator.id} has conflicting names.`);
        }
        people.set(creator.id, { name: creator.name, sortName: creator.sortName, kind: creator.kind });
      }
    }
    for (const [id, person] of people) {
      await client.query(
        `insert into people (id, name, sort_name, kind) values ($1,$2,$3,$4)
         on conflict (id) do update set name = excluded.name, sort_name = excluded.sort_name, kind = excluded.kind`,
        [id, person.name, person.sortName, person.kind],
      );
    }

    const placeById = new Map(places.map((place) => [place.id, place]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    for (const document of documents) {
      const placeWords = document.places.flatMap((id) => {
        const place = placeById.get(id);
        return place ? [place.name, ...(place.aliases ?? [])] : [];
      });
      const categoryWords = document.categories.map((id) => categoryById.get(id)?.name ?? "");
      const searchText = [
        document.title,
        document.creators.map((creator) => creator.name).join(" "),
        document.summary,
        document.relevance,
        document.accession,
        document.publisher ?? "",
        placeWords.join(" "),
        categoryWords.join(" "),
      ].join(" ");
      await client.query(
        `insert into documents (
           id, title, document_type, published_year, about_year_start, about_year_end,
           publisher, publication_place, container_title, source_url, accession, summary,
           rights_status, verification_status, comparative, comparative_label, zambia_relevance, search_text
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'catalogued',$14,$15,$16,$17
         )
         on conflict (id) do update set
           title = excluded.title, document_type = excluded.document_type,
           published_year = excluded.published_year, about_year_start = excluded.about_year_start,
           about_year_end = excluded.about_year_end, publisher = excluded.publisher,
           publication_place = excluded.publication_place, container_title = excluded.container_title,
           source_url = excluded.source_url, accession = excluded.accession, summary = excluded.summary,
           rights_status = excluded.rights_status, comparative = excluded.comparative,
           comparative_label = excluded.comparative_label, zambia_relevance = excluded.zambia_relevance,
           search_text = excluded.search_text, updated_at = now()`,
        [
          document.id,
          document.title,
          document.type,
          document.year,
          document.aboutStart ?? null,
          document.aboutEnd ?? document.yearEnd ?? null,
          document.publisher ?? null,
          document.place ?? null,
          document.container ?? null,
          document.url ?? null,
          document.accession,
          document.summary,
          document.rights,
          document.comparative ?? false,
          document.comparativeLabel ?? null,
          document.relevance,
          searchText,
        ],
      );
      await client.query("delete from document_people where document_id = $1", [document.id]);
      for (const [index, creator] of document.creators.entries()) {
        await client.query(
          `insert into document_people (document_id, person_id, role, position) values ($1,$2,$3,$4)`,
          [document.id, creator.id, creator.role, index],
        );
      }
      await client.query("delete from document_places where document_id = $1", [document.id]);
      for (const placeId of document.places) {
        await client.query("insert into document_places (document_id, place_id) values ($1,$2)", [document.id, placeId]);
      }
      await client.query("delete from document_categories where document_id = $1", [document.id]);
      for (const categoryId of document.categories) {
        await client.query("insert into document_categories (document_id, category_id) values ($1,$2)", [
          document.id,
          categoryId,
        ]);
      }
    }

    for (const event of events) {
      await client.query(
        `insert into events (id, title, summary, start_year, end_year, start_on, date_note, place_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
           title = excluded.title, summary = excluded.summary, start_year = excluded.start_year,
           end_year = excluded.end_year, start_on = excluded.start_on, date_note = excluded.date_note,
           place_id = excluded.place_id`,
        [
          event.id,
          event.title,
          event.summary,
          event.startYear ?? null,
          event.endYear ?? null,
          event.startOn ?? null,
          event.dateNote,
          event.placeId ?? null,
        ],
      );
    }
    for (const document of documents) {
      await client.query("delete from document_events where document_id = $1", [document.id]);
      for (const link of document.events) {
        await client.query(
          "insert into document_events (document_id, event_id, relation) values ($1,$2,$3)",
          [document.id, link.id, link.relation],
        );
      }
    }

    for (const scenario of scenarios) {
      await client.query(
        `insert into scenarios (id, question, category_id, status, assumptions, not_claimed, method_note)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do update set
           question = excluded.question, category_id = excluded.category_id, status = excluded.status,
           assumptions = excluded.assumptions, not_claimed = excluded.not_claimed, method_note = excluded.method_note`,
        [
          scenario.id,
          scenario.question,
          scenario.categoryId,
          scenario.status,
          scenario.assumptions,
          scenario.notClaimed,
          scenario.methodNote,
        ],
      );
      await client.query("delete from scenario_events where scenario_id = $1", [scenario.id]);
      await client.query("delete from scenario_documents where scenario_id = $1", [scenario.id]);
      for (const eventId of scenario.events) {
        await client.query("insert into scenario_events (scenario_id, event_id) values ($1,$2)", [scenario.id, eventId]);
      }
      for (const documentId of scenario.documents) {
        await client.query("insert into scenario_documents (scenario_id, document_id) values ($1,$2)", [
          scenario.id,
          documentId,
        ]);
      }
    }

    for (const series of indicators.series) {
      await client.query(
        `insert into indicators (code, name, unit, caveat, source_name, source_url, retrieved_on, scenario_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (code) do update set
           name = excluded.name, unit = excluded.unit, caveat = excluded.caveat,
           source_name = excluded.source_name, source_url = excluded.source_url,
           retrieved_on = excluded.retrieved_on, scenario_id = excluded.scenario_id`,
        [series.code, series.name, series.unit, series.caveat, indicators.source, indicators.sourceUrl, indicators.retrieved, series.question],
      );
      await client.query("delete from indicator_observations where indicator_code = $1", [series.code]);
      for (const observation of series.observations) {
        await client.query(
          "insert into indicator_observations (indicator_code, year, value) values ($1,$2,$3)",
          [series.code, observation.year, observation.value],
        );
      }
    }

    await client.query(
      `insert into ingestion_jobs (id, source_name, status, message)
       values (
         'news-wire',
         'Zambian news wire',
         'not_configured',
         'No licensed Zambian news wire is connected. Current reporting is not invented to fill the gap.'
       )
       on conflict (id) do update set message = excluded.message, status = excluded.status, updated_at = now()`,
    );

    await client.query("commit");
    console.log(`seeded ${documents.length} documents, ${events.length} events, ${indicators.series.length} series`);
    console.log("development accounts: researcher@zamora.local, editor@zamora.local, admin@zamora.local");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
