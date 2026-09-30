/* Palomar Observatory — registry page logic */
let all = [], filtered = [], page = 1, repos = {};
const size = 20;
const $ = s => document.querySelector(s);
const setHTML = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const authors = e => (e.authors || []).map(a => a.name).join(', ') || 'Unknown author';
const cls = e => e.classification || {};
const tags = e => [...(cls(e).arxiv || []), ...(cls(e).msc2020 || [])];

function card(e) {
  const repo = e.source?.repository;
  const m = repo ? repos[repo] || {} : {};
  const slug = (repo || '').replace(/[^A-Za-z0-9_.-]+/g, '_');
  return `<article class="card fade-in">
    <div>
      <a class="title" href="result.html?id=${encodeURIComponent(e.id)}">${esc(e.title)}</a>
      <div class="subtitle">${esc(authors(e))} · <b>${esc(e.trust?.level || 'unrated')}</b> · ${esc(e.status || '')}</div>
      <p class="abstract">${esc(e.abstract || 'No abstract available')}</p>
      <div class="tags">${tags(e).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
    </div>
    <a class="github-card" href="${esc(m.html_url || ('https://github.com/' + repo))}" target="_blank" rel="noopener">
      <img src="data/thumbnails/repos/${slug}.png" alt="GitHub repository preview" onerror="this.remove()">
      <b>${esc(m.full_name || repo || 'GitHub repository')}</b>
      <span>${esc(m.description || 'Source repository')}</span>
      <small>★ ${m.stargazers_count || 0} · Forks ${m.forks_count || 0}</small>
    </a>
  </article>`;
}

function render() {
  const q = $('#q').value.toLowerCase(), a = $('#arxiv').value, m = $('#msc').value, s = $('#sort').value;
  filtered = all.filter(e => {
    const t = JSON.stringify(e).toLowerCase();
    return (!q || t.includes(q)) && (!a || (cls(e).arxiv || []).includes(a)) && (!m || (cls(e).msc2020 || []).includes(m));
  });
  filtered.sort((x, y) =>
    s === 'title' ? x.title.localeCompare(y.title)
    : s === 'version' ? (y.versions || 0) - (x.versions || 0)
    : String(y.published_at).localeCompare(String(x.published_at)));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  page = Math.min(page, pages);
  setHTML('#rows', filtered.slice((page - 1) * size, page * size).map(card).join('')
    || '<div class="empty">No matching results — try clearing the filters.</div>');
  $('#count').textContent = `${filtered.length} results`;
  $('#page').textContent = `Page ${page} / ${pages}`;
  $('#prev').disabled = page === 1;
  $('#next').disabled = page === pages;
}

function fill(id, vals, label) {
  const u = [...new Set(vals)].sort();
  setHTML(id, `<option value="">${label}</option>` + u.map(x => `<option>${esc(x)}</option>`).join(''));
}

/* Animated count-up for hero metrics */
function countUp(el, target) {
  const dur = 900, t0 = performance.now();
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

Promise.all([
  fetch('data/latest.json').then(r => r.json()),
  fetch('data/repository-metadata.json').then(r => r.json()).catch(() => ({}))
]).then(([x, rm]) => {
  repos = rm;
  all = x.results.entries || [];
  const c = x.changes || {};

  $('#status').textContent = `Last successful sync: ${new Date(x.fetched_at).toLocaleString()} · ${x.warnings?.length || 0} warnings`;

  const metrics = [
    ['Results', all.length],
    ['Projects', [...new Set(all.map(e => e.source?.repository).filter(Boolean))].length],
    ['Added', c.added?.length || 0],
    ['Updated', c.updated?.length || 0]
  ];
  setHTML('#metrics', metrics.map(([label]) =>
    `<div class="metric"><b>0</b><span>${label}</span></div>`).join(''));
  document.querySelectorAll('#metrics .metric b').forEach((el, i) => countUp(el, metrics[i][1]));

  fill('#arxiv', all.flatMap(e => cls(e).arxiv || []), 'All arXiv categories');
  fill('#msc', all.flatMap(e => cls(e).msc2020 || []), 'All MSC categories');
  render();
});

let debounce;
['q', 'arxiv', 'msc', 'sort'].forEach(id => $('#' + id).oninput = () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { page = 1; render(); }, 160);
});
$('#reset').onclick = () => { ['q', 'arxiv', 'msc'].forEach(id => $('#' + id).value = ''); page = 1; render(); };
$('#prev').onclick = () => { page--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
$('#next').onclick = () => { page++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
