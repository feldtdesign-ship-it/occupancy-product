# Pull Local Law 157 storefront filings for the target neighborhoods. Raw rows to data/raw.json.
import json, urllib.request, urllib.parse
BASE = "https://data.cityofnewyork.us/resource/92iy-9c3n.json"
NBHDS = ["East Village", "Lower East Side"]
rows, off = [], 0
where = "nbhd in(" + ",".join("'%s'" % n for n in NBHDS) + ")"
while True:
    q = urllib.parse.urlencode({"$where": where, "$limit": 5000, "$offset": off, "$order": ":id"})
    batch = json.load(urllib.request.urlopen(BASE + "?" + q, timeout=60))
    rows += batch
    if len(batch) < 5000: break
    off += 5000
json.dump(rows, open("data/raw.json", "w"))
print(len(rows), "rows")
