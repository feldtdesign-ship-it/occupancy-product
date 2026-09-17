// Pull the registry for every area, run the pipeline, write data/areas/<id>.json and data/areas.json.
// Run from the repo root: node build/snapshot.js [area-id ...]
const fs = require("fs");
const P = require("../pipeline.js");

(async () => {
  fs.mkdirSync("data/areas", { recursive: true });
  const only = process.argv.slice(2);
  const pulled = new Date().toISOString().slice(0, 10);
  const index = fs.existsSync("data/areas.json") ? JSON.parse(fs.readFileSync("data/areas.json")) : {};
  for (const area of P.AREAS) {
    if (only.length && !only.includes(area.id)) continue;
    const rows = await P.fetchRows(area, fetch, n => process.stdout.write("\r" + area.id + " " + n + " rows   "));
    const res = P.run(rows, area);
    const keep = res.lots.filter(l => l.yearsDark >= 2);
    fs.writeFileSync(`data/areas/${area.id}.json`, JSON.stringify({ area: area.id, pulled, rowCount: res.rowCount, years: res.years, lots: keep }));
    const d3 = keep.filter(l => l.yearsDark >= 3);
    index[area.id] = { pulled, rowCount: res.rowCount, dark3: d3.length, dark3main: d3.filter(l => l.corridor === "main").length };
    console.log(`\n${area.id}: ${res.rowCount} filings, ${d3.length} dark 3+, ${index[area.id].dark3main} on main streets`);
    console.log("  " + d3.filter(l => l.corridor === "main").slice(0, 6).map(l => `${l.yearsDark}/${l.yearsFiled} ${l.address}`).join(" | "));
  }
  fs.writeFileSync("data/areas.json", JSON.stringify(index, null, 1));
})();
