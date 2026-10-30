import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Masthead } from "@/components/Masthead";
import { getSessionUser } from "@/lib/auth";
import { databaseAvailable } from "@/lib/db";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "ZAMORA", template: "%s · ZAMORA" },
  description:
    "Zambian Archive of Memory, Observation, Research and Analysis. Yesterday's evidence. Tomorrow's insight.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ready = await databaseAvailable();
  const user = ready ? await getSessionUser() : null;
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#content">Skip to the record</a>
        <div className="staff" aria-hidden="true">
          <i style={{ top: "8%" }} />
          <span style={{ top: "8%" }}>8°S</span>
          <i style={{ top: "28%" }} />
          <span style={{ top: "28%" }}>10°</span>
          <i style={{ top: "48%" }} />
          <span style={{ top: "48%" }}>12°</span>
          <i style={{ top: "68%" }} />
          <span style={{ top: "68%" }}>15°</span>
          <i style={{ top: "88%" }} />
          <span style={{ top: "88%" }}>18°S</span>
        </div>
        <div className="shell">
          <p className="mobile-lat">8°S — 18°S · Zambia</p>
          <Masthead name={user?.name ?? null} />
          <main id="content">
            {ready ? (
              children
            ) : (
              <div className="frame" style={{ padding: "3rem 0" }}>
                <p className="kicker">The room is locked</p>
                <h1 className="display" style={{ fontSize: "4rem" }}>The record is not connected.</h1>
                <p className="deck">
                  ZAMORA reads from PostgreSQL. Start the database, run the migrations, and seed the catalog.
                  Nothing on this screen is a substitute for the archive.
                </p>
              </div>
            )}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
