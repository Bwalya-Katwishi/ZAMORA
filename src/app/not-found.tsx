export default function NotFound() {
  return (
    <div className="frame" style={{ padding: "3rem 0" }}>
      <p className="kicker">Not on this shelf</p>
      <h1 className="display" style={{ fontSize: "4.2rem" }}>This slip is not in the catalog.</h1>
      <p><a href="/search">Return to search</a></p>
    </div>
  );
}
