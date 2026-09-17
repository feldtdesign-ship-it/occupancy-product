// Occupancy product: vacancy pipeline.
// Same code runs in the browser (live refresh) and in Node (build/snapshot.js).
// Source: NYC Open Data 92iy-9c3n, Storefronts Reported Vacant or Not, Local Law 157 of 2019.
(function (root) {
  const API = "https://data.cityofnewyork.us/resource/92iy-9c3n.json";
  const NBHDS = ["East Village", "Lower East Side"];
  const AVENUES = ["1 AVENUE", "AVENUE A", "AVENUE B", "AVENUE C"];

  const yes = v => /^(Y|YES)$/i.test(String(v || "").trim());

  // "2019 and 2020" -> 2019. The filing covers Dec 31 of the first year.
  const yearOf = s => parseInt(String(s || "").slice(0, 4), 10) || null;

  function normStreet(s) {
    let t = String(s || "").toUpperCase().replace(/\s+/g, " ").trim();
    t = t.replace(/\bFIRST\b/, "1").replace(/\bSECOND\b/, "2").replace(/\bTHIRD\b/, "3").replace(/\bFOURTH\b/, "4");
    t = t.replace(/\b(\d+)(ST|ND|RD|TH)\b/, "$1");
    t = t.replace(/^E\.? /, "EAST ").replace(/ ST\.?$/, " STREET").replace(/ AVE\.?$/, " AVENUE");
    t = t.replace(/^AVE\.? /, "AVENUE ");
    if (/^[A-Z]+$/.test(t) && !/^BOWERY$/.test(t)) t += " STREET"; // "Orchard" -> "ORCHARD STREET"
    return t;
  }

  // Corridor: the four avenues, plus East 1st to East 14th and Houston between them.
  function corridorOf(street) {
    if (AVENUES.includes(street)) return "avenue";
    const m = street.match(/^EAST (\d+) STREET$/);
    if (m && +m[1] >= 1 && +m[1] <= 14) return "cross";
    if (street === "EAST HOUSTON STREET" || street === "ST MARKS PLACE") return "cross";
    return null;
  }

  function run(rows) {
    const lots = new Map();
    const allYears = new Set();
    let dropped00 = 0;
    for (const r of rows) {
      const y = yearOf(r.reporting_year);
      if (!y || !r.bbl) continue;
      allYears.add(y);
      const street = normStreet(r.property_street);
      const key = r.bbl + "|" + (r.property_number || "") + " " + street;
      let lot = lots.get(key);
      if (!lot) {
        lot = { bbl: r.bbl, number: r.property_number || "", street, nbhd: r.nbhd, corridor: corridorOf(street),
          dark: new Set(), filed: new Set(), construction: false, lastLease: null, lastUse: null, lastUseYear: 0,
          units: new Set(), lat: null, lng: null };
        lots.set(key, lot);
      }
      lot.filed.add(y);
      if (yes(r.vacant_on_12_31)) lot.dark.add(y);
      if (yes(r.construction_reported)) lot.construction = true;
      if (r.unit) lot.units.add(String(r.unit).trim());
      if (r.expir_dt_of_most_recent_lease && (!lot.lastLease || r.expir_dt_of_most_recent_lease > lot.lastLease))
        lot.lastLease = r.expir_dt_of_most_recent_lease.slice(0, 10);
      if (r.primary_business_activity && y >= lot.lastUseYear) { lot.lastUse = r.primary_business_activity; lot.lastUseYear = y; }
      const la = parseFloat(r.latitude), ln = parseFloat(r.longitude);
      if (la && ln) { lot.lat = la; lot.lng = ln; } else if (r.latitude !== undefined) dropped00++;
    }

    const out = [];
    for (const lot of lots.values()) {
      if (lot.construction) continue;       // under construction is not a target
      if (lot.dark.size < 1) continue;
      const dark = [...lot.dark].sort(), filed = [...lot.filed].sort();
      // Longest unbroken run of dark filings, counting only years it actually filed.
      let run = 0, best = 0;
      for (const y of filed) { run = lot.dark.has(y) ? run + 1 : 0; best = Math.max(best, run); }
      const latest = filed[filed.length - 1];
      out.push({
        id: lot.bbl + "-" + (lot.number || "x") + "-" + lot.street.replace(/\W+/g, ""),
        address: (lot.number ? lot.number + " " : "") + lot.street,
        bbl: lot.bbl, nbhd: lot.nbhd, corridor: lot.corridor,
        yearsDark: dark.length, streak: best, yearsFiled: filed.length,
        darkYears: dark, filedYears: filed, darkLatest: lot.dark.has(latest), latestFiled: latest,
        lastLease: lot.lastLease, lastUse: lot.lastUse, units: [...lot.units].slice(0, 6),
        lat: lot.lat, lng: lot.lng,
        target: dark.length >= 3
      });
    }
    // Rank: most years dark, then longest streak, then still dark in its latest filing.
    out.sort((a, b) => b.yearsDark - a.yearsDark || b.streak - a.streak || (b.darkLatest - a.darkLatest) || a.address.localeCompare(b.address));
    return { lots: out, years: [...allYears].sort(), rowCount: rows.length, noCoords: dropped00 };
  }

  async function fetchRows(fetchFn, onProgress) {
    const f = fetchFn || fetch;
    const where = "nbhd in(" + NBHDS.map(n => "'" + n + "'").join(",") + ")";
    let rows = [], off = 0;
    for (;;) {
      const qs = new URLSearchParams({ "$where": where, "$limit": "5000", "$offset": String(off), "$order": ":id" });
      const res = await f(API + "?" + qs.toString());
      if (!res.ok) throw new Error("NYC Open Data returned " + res.status);
      const batch = await res.json();
      rows = rows.concat(batch);
      if (onProgress) onProgress(rows.length);
      if (batch.length < 5000) break;
      off += 5000;
    }
    return rows;
  }

  const api = { run, fetchRows, normStreet, API, NBHDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Pipeline = api;
})(this);
