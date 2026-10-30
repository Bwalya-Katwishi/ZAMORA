"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Front"],
  ["/atlas", "Atlas"],
  ["/search", "Search"],
  ["/desk", "Desk"],
  ["/observatory", "Observatory"],
  ["/disciplines", "Index"],
  ["/method", "Method"],
];

export function Masthead({ name }: { name: string | null }) {
  const pathname = usePathname();
  return (
    <header className="mast">
      <div className="mast-inner">
        <Link href="/" className="brand">
          <svg width="36" height="42" viewBox="0 0 36 42" aria-hidden="true">
            <rect x="16" y="1" width="1.4" height="40" fill="#c4785a" />
            <path d="M16 8h7M16 34h7" stroke="#f3eadc" strokeWidth="1" />
            <text x="24" y="12" fill="#f3eadc" fontSize="7" fontFamily="ui-monospace, monospace">8</text>
            <text x="24" y="36" fill="#f3eadc" fontSize="7" fontFamily="ui-monospace, monospace">18</text>
          </svg>
          <span>
            <span className="word">ZAMORA</span>
            <small>Yesterday&apos;s evidence. Tomorrow&apos;s insight.</small>
          </span>
        </Link>
        <nav className="mast-nav" aria-label="Primary">
          {links.map(([href, label]) => {
            const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
          <Link href={name ? "/desk/files" : "/login"}>{name ?? "Sign in"}</Link>
        </nav>
        <p className="dateline">
          <span>Lusaka · Republic of Zambia</span>
          <span>8°S–18°S · 22°E–34°E</span>
        </p>
      </div>
    </header>
  );
}
