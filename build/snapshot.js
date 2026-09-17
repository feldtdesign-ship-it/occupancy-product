// Pull the registry, run the pipeline, write data/targets.json for the page to load first.
// Run from the repo root: node build/snapshot.js
const fs = require("fs");
const P = require("../pipeline.js");

(async () => {
  const rows = await P.fetchRows(fetch, n => process.stdout.write("\r" + n + " rows"));
  const res = P.run(rows);
  const keep = res.lots.filter(l => l.yearsDark >= 2);
  const out = {
    pulled: new Date().toISOString().slice(0, 10),
    source: P.API, neighborhoods: P.NBHDS,
    rowCount: res.rowCount, years: res.years, noCoords: res.noCoords,
    lots: keep
  };
  fs.writeFileSync("data/targets.json", JSON.stringify(out));
  console.log("\n" + keep.length + " lots dark 2+ filings, " + keep.filter(l => l.target).length + " dark 3+");
  console.log(keep.filter(l => l.corridor === "avenue").slice(0, 15).map(l => l.yearsDark + "/" + l.yearsFiled + " " + l.address + " " + (l.lastUse || "")).join("\n"));
})();
