import json, os, pathlib, urllib.parse, urllib.request, time, concurrent.futures, csv, hashlib
import html, re
from datetime import datetime, timezone

BASE = os.environ.get("PALOMAR_BASE", "https://data.palomar-registry.org/")
OUT = pathlib.Path(os.environ.get("PALOMAR_OUTPUT", "data"))

def get(path, params=None):
    url = urllib.parse.urljoin(BASE, path)
    if params: url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent":"palomar-daily-dashboard/1.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
        except Exception:
            if attempt == 3: raise
            time.sleep(2 ** attempt)

def results():
    all_rows, cursor, seen, pages, revision = [], None, set(), 0, None
    while True:
        p = {"order":"updated"}
        if cursor: p["cursor"] = cursor
        page = get("api/v1/results", p)
        if not isinstance(page.get('entries'), list): raise ValueError('Invalid result page')
        if pages and page.get('revision') != revision: raise ValueError('Registry changed during scan')
        revision = page.get('revision'); pages += 1
        all_rows.extend(page.get("entries", []))
        cursor = page.get("next")
        if not cursor:
            if not all_rows or len({x['id'] for x in all_rows}) != len(all_rows): raise ValueError('Empty or duplicate results')
            return {**page, "entries": all_rows, "pages_fetched": pages}
        if cursor in seen or pages > 10000: raise ValueError('Pagination cycle')
        seen.add(cursor)

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)

def thumbnail(path, title, subtitle, remote=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if remote:
        try:
            req = urllib.request.Request(remote, headers={'User-Agent':'palomar-daily-dashboard/2.0'})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read()
            if len(data) > 1000:
                path.with_suffix('.png').write_bytes(data)
                # Always create a local SVG fallback; browsers can switch to it
                # when a remote/social preview asset is missing or invalid.
        except Exception: pass
    return None

def make_thumbnails(rows):
    repos = set()
    for row in rows:
        ident = row['id']; repo = row.get('source', {}).get('repository')
        thumbnail(OUT/'thumbnails'/'entries'/(ident+'.svg'), row.get('title', ident), repo or 'Lean formalization')
        if repo: repos.add(repo)
    for repo in repos:
        slug = re.sub(r'[^A-Za-z0-9_.-]+', '_', repo)
        thumbnail(OUT/'thumbnails'/'repos'/(slug+'.svg'), repo, 'GitHub source repository', f'https://opengraph.githubassets.com/1/{repo}')
    metadata = {}
    for repo in repos:
        try:
            req = urllib.request.Request(f'https://api.github.com/repos/{repo}', headers={'User-Agent':'palomar-daily-dashboard/2.0','Accept':'application/vnd.github+json'})
            with urllib.request.urlopen(req, timeout=20) as response: metadata[repo] = json.load(response)
        except Exception as error: metadata[repo] = {'full_name':repo,'html_url':f'https://github.com/{repo}','name':repo.split('/')[-1],'description':'GitHub source repository','avatar_url':'','stargazers_count':0,'forks_count':0,'error':str(error)}
    save(OUT/'repository-metadata.json', metadata)

def archive(row):
    ident = row['id']
    if not ident.startswith('PALOMAR-') or not all(c.isalnum() or c == '-' for c in ident): raise ValueError('Unsafe identifier')
    versions = get(f'versions/{ident}.json')
    save(OUT/'versions'/(ident+'.json'), versions)
    for item in versions.get('entries', []) or [row]:
        path = f'entries/{ident}-v{int(item["version"])}.json'
        if not (OUT/path).exists(): save(OUT/path, get(path))

def main():
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    previous = json.loads((OUT/'latest.json').read_text(encoding='utf-8')) if (OUT/'latest.json').exists() else {}
    snap = OUT / "snapshots" / day; snap.mkdir(parents=True, exist_ok=True)
    payload = {"fetched_at": datetime.now(timezone.utc).isoformat(), "results": results()}
    save(snap/'results.json', payload['results'])
    warnings = []
    for name in ['recent.json','recent-renders.json','source-availability.json']:
        try: save(snap/name, get(name))
        except Exception as error: warnings.append({'path':name, 'error':str(error)})
    rows = payload['results']['entries']
    make_thumbnails(rows)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        tasks = {pool.submit(archive, row):row['id'] for row in rows}
        for task in concurrent.futures.as_completed(tasks):
            try: task.result()
            except Exception as error: warnings.append({'id':tasks[task], 'error':str(error)})
    old = {x['id']:x for x in previous.get('results',{}).get('entries',[])}
    current = {x['id']:x for x in rows}
    changes = {'added':[i for i in current if i not in old], 'updated':[i for i in current if i in old and current[i] != old[i]], 'absent':[i for i in old if i not in current]}
    save(snap/'changes.json',changes)
    payload.update(changes=changes,warnings=warnings)
    save(OUT/'latest.json',payload)
    files = [{'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(snap.glob('*.json'))]
    history = [{'date':p.name,'path':f'snapshots/{p.name}/results.json'} for p in sorted((OUT/'snapshots').iterdir(),reverse=True) if (p/'results.json').exists()]
    save(OUT/'manifest.json',{'updated_at':payload['fetched_at'],'snapshot':day,'count':len(rows),'pages':payload['results']['pages_fetched'],'warnings':warnings,'files':files,'history':history})
    with (OUT/'results.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.writer(f); writer.writerow(['id','title','authors','arxiv','msc2020','version','published_at','repository'])
        for r in rows:
            values=[r['id'],r.get('title',''),'; '.join(a.get('name','') for a in r.get('authors',[])),'; '.join(r.get('classification',{}).get('arxiv',[])),'; '.join(r.get('classification',{}).get('msc2020',[])),r.get('version'),r.get('published_at'),r.get('source',{}).get('repository')]
            writer.writerow(["'"+str(v) if str(v).startswith(('=','+','-','@')) else v for v in values])
    print(f'{len(rows)} results; {len(warnings)} archive warnings')
if __name__ == "__main__": main()
