import json, os, pathlib, urllib.parse, urllib.request
from datetime import datetime, timezone

BASE = os.environ.get("PALOMAR_BASE", "https://data.palomar-registry.org/")
OUT = pathlib.Path(os.environ.get("PALOMAR_OUTPUT", "data"))

def get(path, params=None):
    url = urllib.parse.urljoin(BASE, path)
    if params: url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent":"palomar-daily-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)

def results():
    all_rows, cursor = [], None
    while True:
        p = {"order":"updated"}
        if cursor: p["cursor"] = cursor
        page = get("api/v1/results", p)
        all_rows.extend(page.get("entries", []))
        cursor = page.get("next")
        if not cursor: return {**page, "entries": all_rows, "pages_fetched": len(all_rows)}

def main():
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snap = OUT / "snapshots" / day; snap.mkdir(parents=True, exist_ok=True)
    payload = {"fetched_at": datetime.now(timezone.utc).isoformat(), "results": results()}
    for name, value in [("results.json", payload["results"]), ("recent.json", get("recent.json")), ("recent-renders.json", get("recent-renders.json"))]:
        (snap / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "latest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "manifest.json").write_text(json.dumps({"updated_at":payload["fetched_at"],"snapshot":day,"count":len(payload["results"].get("entries",[]))}, indent=2), encoding="utf-8")
if __name__ == "__main__": main()
