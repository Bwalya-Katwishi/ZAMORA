export function CoverageChart({ rows }: { rows: { decade: number; count: number }[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div>
      {rows.map((row) => (
        <div key={row.decade} className="route" style={{ borderLeft: "none" }}>
          <div style={{ display: "grid", gridTemplateColumns: "4rem 1fr 2rem", gap: "0.6rem", alignItems: "center", borderTop: "1px solid var(--rule)", padding: "0.28rem 0" }}>
            <span className="mono">{row.decade}</span>
            <span style={{ display: "block", height: "1px", background: "#9a4630", width: `${(row.count / max) * 100}%` }} />
            <span className="mono">{row.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
