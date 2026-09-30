"""Upsert Palomar result versions into the Notion database created by MCP."""
import json, os, pathlib, urllib.request, urllib.error

TOKEN = os.environ['NOTION_TOKEN']
DATABASE = os.environ['NOTION_DATABASE_ID']
BASE = 'https://api.notion.com/v1'
STATE_PATH = pathlib.Path('data/notion-sync-state.json')

def request(method, path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(BASE + path, data=body, method=method, headers={
        'Authorization': f'Bearer {TOKEN}', 'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json', 'User-Agent': 'palomar-registry-daily/1.0'})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)

def rich(value): return [{'type':'text','text':{'content':str(value)[:2000]}}]
def props(row, day):
    ident, version = row['id'], int(row.get('version', 1)); title = row.get('title') or ident
    repo = row.get('source', {}).get('repository')
    return {'Name':{'title':rich(title)},'Result ID':{'rich_text':rich(ident)},'Authors':{'rich_text':rich(', '.join(a.get('name','') for a in row.get('authors',[])))},'Status':{'select':{'name':row.get('status','registered')}},'Version':{'number':version},'Published':{'date':{'start':row.get('published_at','')[:10] or None}},'Repository':{'url':f'https://github.com/{repo}' if repo else None},'Palomar URL':{'url':f'https://palomar-registry.org/entry/{ident}'},'Snapshot Date':{'date':{'start':day}},'Abstract':{'rich_text':rich(row.get('abstract',''))},'Data JSON':{'url':f'https://2404589803.github.io/palomar-registry-daily/data/entries/{ident}-v{version}.json'}}

def main():
    latest = json.loads(pathlib.Path('data/latest.json').read_text(encoding='utf-8'))
    state = json.loads(STATE_PATH.read_text(encoding='utf-8')) if STATE_PATH.exists() else {}
    day = latest['fetched_at'][:10]
    for row in latest['results']['entries']:
        key = f"{row['id']}:v{row.get('version',1)}"; payload = {'parent':{'database_id':DATABASE},'properties':props(row,day)}
        if key in state:
            try: request('PATCH', f"/pages/{state[key]}", {'properties':payload['properties']})
            except urllib.error.HTTPError as error:
                if error.code != 404: raise
                page = request('POST','/pages',payload); state[key] = page['id']
        else:
            page = request('POST','/pages',payload); state[key] = page['id']
    STATE_PATH.parent.mkdir(exist_ok=True); STATE_PATH.write_text(json.dumps(state, indent=2),encoding='utf-8')
    print(f'Synced {len(latest["results"]["entries"])} result versions to Notion')
if __name__ == '__main__': main()
