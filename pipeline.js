// Occupancy product: vacancy pipeline.
// Same code runs in the browser (live refresh) and in Node (build/snapshot.js).
// Source: NYC Open Data 92iy-9c3n, Storefronts Reported Vacant or Not, Local Law 157 of 2019.
(function (root) {
  const API = "https://data.cityofnewyork.us/resource/92iy-9c3n.json";

  // Neighborhood names changed between filing years, so each area lists both spellings.
  // "main" is the retail streets worth walking first. Street names are in normStreet() form.
  const AREAS = [
    { id: "lower-manhattan", name: "Seaport and Lower Manhattan", borough: "Manhattan", center: [40.7075, -74.0040],
      why: "Where the receipts come from. Same crowd, same subway stops.",
      nbhds: ["Financial District-Battery Park City", "Battery Park City-Lower Manhattan"],
      main: ["FULTON STREET", "WATER STREET", "FRONT STREET", "SOUTH STREET", "PEARL STREET", "JOHN STREET", "MAIDEN LANE",
        "BEEKMAN STREET", "PECK SLIP", "STONE STREET", "BROADWAY", "NASSAU STREET", "WILLIAM STREET", "GOLD STREET", "CHURCH STREET"] },
    { id: "ev-les", name: "East Village and Lower East Side", borough: "Manhattan", center: [40.7235, -73.9840],
      why: "No business district on the avenues. The first list, and 28 Avenue A.",
      nbhds: ["East Village", "Lower East Side"],
      main: ["1 AVENUE", "AVENUE A", "AVENUE B", "AVENUE C", "ORCHARD STREET", "LUDLOW STREET", "ESSEX STREET", "RIVINGTON STREET",
        "STANTON STREET", "CLINTON STREET", "EAST HOUSTON STREET", "DELANCEY STREET"],
      cross: s => { const m = s.match(/^EAST (\d+) STREET$/); return (m && +m[1] >= 1 && +m[1] <= 14) || s === "ST MARKS PLACE"; } },
    { id: "soho-village", name: "SoHo and the Village", borough: "Manhattan", center: [40.7270, -74.0010],
      why: "The heaviest shopping foot traffic downtown. The highest asks too.",
      nbhds: ["SoHo-Little Italy-Hudson Square", "SoHo-TriBeCa-Civic Center-Little Italy", "Greenwich Village", "West Village"],
      main: ["BROADWAY", "PRINCE STREET", "SPRING STREET", "BROOME STREET", "GRAND STREET", "MERCER STREET", "GREENE STREET",
        "WOOSTER STREET", "WEST BROADWAY", "THOMPSON STREET", "SULLIVAN STREET", "LAFAYETTE STREET", "BLEECKER STREET",
        "MACDOUGAL STREET", "CHRISTOPHER STREET", "WEST 4 STREET", "HUDSON STREET", "8 AVENUE", "6 AVENUE", "AVENUE OF THE AMERICAS"] },
    { id: "bk-north", name: "Williamsburg and Greenpoint", borough: "Brooklyn", center: [40.7180, -73.9570],
      why: "Artists and Fleas on North 7th. A crowd that buys art on a weekend.",
      nbhds: ["Williamsburg", "North Side-South Side", "East Williamsburg", "South Williamsburg", "Greenpoint"],
      main: ["BEDFORD AVENUE", "NORTH 6 STREET", "NORTH 7 STREET", "NORTH 8 STREET", "NORTH 4 STREET", "WYTHE AVENUE", "KENT AVENUE",
        "BERRY STREET", "GRAND STREET", "METROPOLITAN AVENUE", "DRIGGS AVENUE", "MANHATTAN AVENUE", "FRANKLIN STREET", "GRAHAM AVENUE", "LORIMER STREET"] },
    { id: "bushwick", name: "Bushwick", borough: "Brooklyn", center: [40.6990, -73.9240],
      why: "Street art is the neighborhood's calling card. Cheaper doors.",
      nbhds: ["Bushwick North", "Bushwick South", "Bushwick (West)", "Bushwick (East)"],
      main: ["WYCKOFF AVENUE", "KNICKERBOCKER AVENUE", "BROADWAY", "MYRTLE AVENUE", "IRVING AVENUE", "ST NICHOLAS AVENUE", "FLUSHING AVENUE", "BUSHWICK AVENUE"] },
    { id: "dumbo-downtown", name: "DUMBO to Fort Greene", borough: "Brooklyn", center: [40.6960, -73.9870],
      why: "Brooklyn Flea under the archway every weekend. Tourists walk off the bridge.",
      nbhds: ["Downtown Brooklyn-DUMBO-Boerum Hill", "DUMBO-Vinegar Hill-Downtown Brooklyn-Boerum Hill", "Brooklyn Heights", "Brooklyn Heights-Cobble Hill",
        "Fort Greene", "Clinton Hill", "Carroll Gardens-Cobble Hill-Gowanus-Red Hook", "Carroll Gardens-Columbia Street-Red Hook"],
      main: ["WATER STREET", "FRONT STREET", "WASHINGTON STREET", "MAIN STREET", "JAY STREET", "FULTON STREET", "ATLANTIC AVENUE", "SMITH STREET",
        "COURT STREET", "MONTAGUE STREET", "DEKALB AVENUE", "MYRTLE AVENUE", "LAFAYETTE AVENUE", "FLATBUSH AVENUE", "HENRY STREET"] },
    { id: "bedstuy-crown", name: "Bed-Stuy and Crown Heights", borough: "Brooklyn", center: [40.6830, -73.9480],
      why: "247 Nostrand is here. Neighborhood streets, lower asks.",
      nbhds: ["Bedford-Stuyvesant (West)", "Bedford-Stuyvesant (East)", "Bedford", "Stuyvesant Heights", "Crown Heights North", "Crown Heights (North)"],
      main: ["NOSTRAND AVENUE", "FULTON STREET", "LEWIS AVENUE", "TOMPKINS AVENUE", "FRANKLIN AVENUE", "BEDFORD AVENUE", "MARCY AVENUE",
        "MALCOLM X BOULEVARD", "ROGERS AVENUE", "BERGEN STREET", "MYRTLE AVENUE"] },
    { id: "park-slope", name: "Park Slope and Prospect Heights", borough: "Brooklyn", center: [40.6750, -73.9780],
      why: "Two long shopping avenues and a family weekend crowd.",
      nbhds: ["Park Slope", "Park Slope-Gowanus", "Prospect Heights", "Windsor Terrace-South Slope"],
      main: ["5 AVENUE", "7 AVENUE", "FLATBUSH AVENUE", "VANDERBILT AVENUE", "UNION STREET", "WASHINGTON AVENUE"] },
  ];

  const yes = v => /^(Y|YES)$/i.test(String(v || "").trim());

  // "2019 and 2020" -> 2019. The filing covers Dec 31 of the first year.
  const yearOf = s => parseInt(String(s || "").slice(0, 4), 10) || null;

  const WORDS = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5, SIXTH: 6, SEVENTH: 7, EIGHTH: 8 };
  const BARE = new Set(["BOWERY", "BROADWAY"]);

  function normStreet(s) {
    let t = String(s || "").toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
    t = t.replace(/\b(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH)\b/g, w => WORDS[w]);
    t = t.replace(/\b(\d+)(ST|ND|RD|TH)\b/g, "$1");
    t = t.replace(/^E /, "EAST ").replace(/^W /, "WEST ").replace(/^N /, "NORTH ").replace(/^S /, "SOUTH ");
    t = t.replace(/ ST$/, " STREET").replace(/ AVE?$/, " AVENUE").replace(/ BLVD$/, " BOULEVARD").replace(/ PL$/, " PLACE");
    t = t.replace(/^AVE /, "AVENUE ").replace(/^SAINT /, "ST ");
    if (/^[A-Z]+$/.test(t) && !BARE.has(t)) t += " STREET"; // "Orchard" -> "ORCHARD STREET"
    return t;
  }

  function corridorOf(street, area) {
    if (area.main.includes(street)) return "main";
    if (area.cross && area.cross(street)) return "cross";
    return null;
  }

  function run(rows, area) {
    const lots = new Map();
    const allYears = new Set();
    for (const r of rows) {
      const y = yearOf(r.reporting_year);
      if (!y || !r.bbl) continue;
      allYears.add(y);
      const street = normStreet(r.property_street);
      const key = r.bbl + "|" + (r.property_number || "") + " " + street;
      let lot = lots.get(key);
      if (!lot) {
        lot = { bbl: r.bbl, number: r.property_number || "", street, nbhd: r.nbhd, corridor: corridorOf(street, area),
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
      if (la && ln) { lot.lat = la; lot.lng = ln; }    // 0,0 rows are dropped here
    }

    const out = [];
    for (const lot of lots.values()) {
      if (lot.construction) continue;       // under construction is not a target
      if (lot.dark.size < 1) continue;
      const dark = [...lot.dark].sort(), filed = [...lot.filed].sort();
      let run = 0, best = 0;                // longest unbroken run of dark filings
      for (const y of filed) { run = lot.dark.has(y) ? run + 1 : 0; best = Math.max(best, run); }
      const latest = filed[filed.length - 1];
      out.push({
        id: lot.bbl + "-" + (lot.number || "x") + "-" + lot.street.replace(/\W+/g, ""),
        address: (lot.number ? lot.number + " " : "") + lot.street,
        street: lot.street, bbl: lot.bbl, nbhd: lot.nbhd, corridor: lot.corridor,
        yearsDark: dark.length, streak: best, yearsFiled: filed.length,
        darkYears: dark, filedYears: filed, darkLatest: lot.dark.has(latest), latestFiled: latest,
        lastLease: lot.lastLease, lastUse: lot.lastUse, units: [...lot.units].slice(0, 6),
        lat: lot.lat, lng: lot.lng
      });
    }
    // Rank: most years dark, then longest streak, then still dark in its latest filing.
    out.sort((a, b) => b.yearsDark - a.yearsDark || b.streak - a.streak || (b.darkLatest - a.darkLatest) || a.address.localeCompare(b.address));
    return { lots: out, years: [...allYears].sort(), rowCount: rows.length };
  }

  async function fetchRows(area, fetchFn, onProgress) {
    const f = fetchFn || fetch;
    const where = "nbhd in(" + area.nbhds.map(n => "'" + n.replace(/'/g, "''") + "'").join(",") + ")";
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

  const api = { run, fetchRows, normStreet, API, AREAS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Pipeline = api;
})(this);
