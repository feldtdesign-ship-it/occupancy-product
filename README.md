# Keeping the Lights On

Service advisory for dark storefronts. Built for Platform's Edge (PJ O'Rourke II) by Feldt Design. Draft. Not an offer, not legal advice.

One page, six parts:

- **Express**: four tracks to a pop-up by Friday, November 20, 2026, with no panel in the way
- **The pitch**: the occupancy product in plain terms, printable for an owner
- **Other trains**: the programs already running this play, and why we are not waiting on them
- **Markets**: holiday markets, weekend flea markets and the sidewalk rules for selling art
- **The finder**: every NYC storefront vacancy filing for eight areas (Seaport and Lower Manhattan, East Village and Lower East Side, SoHo and the Village, Williamsburg and Greenpoint, Bushwick, DUMBO to Fort Greene, Bed-Stuy and Crown Heights, Park Slope), ranked by years dark, on a map, with a station card per door
- **Targets and station stops**: the first doors and PJ's checklist

Anything flagged orange on the page has not been checked.

## Run it

The page loads `data/targets.json`, so serve the folder instead of double-clicking:

```
python3 -m http.server 8000
```

## Refresh the list

The finder has a "Pull live from the city" button for the area on screen. To update the saved snapshots (all areas, or name some):

```
node build/snapshot.js
node build/snapshot.js lower-manhattan bk-north
```

To add an area, add it to `AREAS` in `pipeline.js` with its neighborhood names and main streets.

## Files

```
index.html          the page
pipeline.js         areas and scoring rules; the page and the snapshot script both use it
build/snapshot.js   pulls the registry, writes data/areas/
build/pull.py       raw pull, for checking by hand
data/areas.json     counts per area
data/areas/*.json   snapshot per area: every lot reported dark in 2 or more filings
```

## Source

NYC Open Data, Storefronts Reported Vacant or Not, Department of Finance, Local Law 157 of 2019, dataset `92iy-9c3n`. Owner names are not in this data. ACRIS has them.
