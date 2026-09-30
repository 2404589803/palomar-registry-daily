/* Palomar Observatory — changes / archive / about / result pages */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

Promise.all([
  fetch('data/latest.json').then(r => r.json()),
  fetch('data/repository-metadata.json').then(r => r.json()).catch(() => ({}))
]).then(([x, repos]) => {
  const c = $('#content');
  const p = location.pathname.split('/').pop() || 'index.html';
  const entries = x.results.entries || [];

  /* ---------------- Daily Changes ---------------- */
  if (p === 'changes.html') {
    const z = x.changes || {};
    const groups = [['Added', z.added], ['Updated', z.updated], ['Temporarily absent', z.absent]];
    c.innerHTML = `
      <div class="page-eyebrow eyebrow">Daily Changelog</div>
      <h1 class="page-title">Daily Changes</h1>
      <p class="page-lead">Compared with the previous successful sync. Temporarily absent records are not necessarily withdrawn.</p>
      ${groups.map(([n, a]) => `
        <section class="panel">
          <h2>${n} <span class="tag">${(a || []).length}</span></h2>
          <ul>${(a || []).map(id => {
            const e = entries.find(v => v.id === id);
            return `<li><a href="result.html?id=${encodeURIComponent(id)}">${esc(e?.title || id)}</a></li>`;
          }).join('') || '<li>None</li>'}</ul>
        </section>`).join('')}`;

  /* ---------------- Data Archive ---------------- */
  } else if (p === 'archive.html') {
    const history = x.history || [];
    c.innerHTML = `
      <div class="page-eyebrow eyebrow">Open Data</div>
      <h1 class="page-title">Data Archive</h1>
      <p class="page-lead">JSON preserves original fields; CSV is suitable for analysis. Daily snapshots and version history are stored in the GitHub repository.</p>
      <div class="downloads">
        <a href="data/latest.json" download><b>Latest full index</b><small>JSON · complete results index ↓</small></a>
        <a href="data/results.csv" download><b>Latest results</b><small>CSV · analysis-ready table ↓</small></a>
        <a href="data/manifest.json" download><b>Sync manifest</b><small>JSON · pipeline status ↓</small></a>
        <a href="https://github.com/2404589803/palomar-registry-daily/tree/master/data" target="_blank" rel="noopener"><b>Full archive</b><small>Browse the GitHub data directory ↗</small></a>
      </div>
      <div class="section-head"><h2>Historical snapshots</h2><p>${history.length} snapshots on record</p></div>
      <section class="panel">
        ${history.map(h => `<div class="history"><time>${esc(h.date)}</time><a href="data/${esc(h.path)}" download>results snapshot JSON ↓</a></div>`).join('') || '<p>No snapshots recorded yet.</p>'}
      </section>`;

  /* ---------------- Sync Notes ---------------- */
  } else if (p === 'about.html') {
    const warnings = x.warnings || [];
    c.innerHTML = `
      <div class="page-eyebrow eyebrow">About the Archive</div>
      <h1 class="page-title">Sync Notes</h1>
      <section class="panel">
        <h2>Data pipeline</h2>
        <p>GitHub Actions starts a daily sync at 10:15 China Standard Time. It fetches Palomar Registry result pages, recent records, previews, and source availability, then stores version indexes and fixed-version JSON for every result.</p>
        <p>A new index is published only after a complete validated fetch. Failures preserve the last successful data and are recorded in <code>manifest.json</code>.</p>
        <h2>Data boundaries</h2>
        <p>This site stores public metadata and version records. Lean source code and reproducible builds remain with the original projects and pinned commits. This is not the official Palomar website.</p>
        <p><a href="https://github.com/2404589803/palomar-registry-daily/actions" target="_blank" rel="noopener">View sync logs ↗</a></p>
        <h2>Archive warnings</h2>
        ${warnings.map(w => `<div class="warning-item">${esc(w.path || w.id)}: ${esc(w.error)}</div>`).join('') || '<p>No warnings — the last sync was clean.</p>'}
      </section>`;

  /* ---------------- Result detail ---------------- */
  } else {
    const id = new URLSearchParams(location.search).get('id');
    const r = entries.find(v => v.id === id);
    if (!r) {
      c.innerHTML = `<h1 class="page-title">Result not found</h1><p class="page-lead">The requested record does not exist in the latest index. <a href="index.html">Back to the registry</a>.</p>`;
      return;
    }
    const repo = r.source?.repository;
    const m = repo ? (repos[repo] || {}) : {};
    const slug = (repo || '').replace(/[^A-Za-z0-9_.-]+/g, '_');
    const theorems = r.formalization?.theorem_names || [];
    const tagList = [...(r.classification?.arxiv || []), ...(r.classification?.msc2020 || [])];
    document.title = `${r.title} · Palomar Observatory`;
    c.innerHTML = `
      <div class="page-eyebrow eyebrow">${esc(r.id)}</div>
      <h1 class="detail-title">${esc(r.title)}</h1>
      <div class="tags" style="margin:6px 0 28px">${tagList.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <div class="detail-layout">
        <div class="detail-main">
          <section class="panel">
            <h2>Abstract</h2>
            <p class="abstract-full">${esc(r.abstract || 'No abstract available.')}</p>
          </section>
          <section class="panel">
            <h2>Formal theorems <span class="tag">${theorems.length}</span></h2>
            <div class="theorem-list">${theorems.map(t => `<code>${esc(t)}</code>`).join('') || '<p>Not provided.</p>'}</div>
          </section>
          <section class="panel">
            <h2>Source</h2>
            <pre>${esc(JSON.stringify({ source: r.source, preservation: r.preservation, preview: r.preview }, null, 2))}</pre>
          </section>
        </div>
        <aside class="detail-side">
          <div class="panel side-card">
            <div class="side-meta"><small>Authors</small><b>${esc((r.authors || []).map(a => a.name).join(', ') || 'Unknown')}</b></div>
            <div class="side-meta"><small>Version</small><b>${esc(r.version ?? '—')}</b></div>
            <div class="side-meta"><small>Status</small><b>${esc(r.status || '—')}</b></div>
            <div class="side-meta"><small>Trust level</small><b>${esc(r.trust?.level || '—')}</b></div>
            <div class="side-meta"><small>Registered</small><b>${esc(r.published_at || '—')}</b></div>
          </div>
          ${repo ? `<a class="github-card" href="${esc(m.html_url || ('https://github.com/' + repo))}" target="_blank" rel="noopener">
            <img src="data/thumbnails/repos/${slug}.png" alt="GitHub repository preview" onerror="this.remove()">
            <b>${esc(m.full_name || repo)}</b>
            <span>${esc(m.description || 'Source repository')}</span>
            <small>★ ${m.stargazers_count || 0} · Forks ${m.forks_count || 0}</small>
          </a>` : ''}
          <a class="btn-primary download-btn" href="data/${esc(r.path)}" download>Download raw record JSON ↓</a>
          <a class="back-link" href="index.html">← Back to the registry</a>
        </aside>
      </div>`;
  }
}).catch(() => {
  $('#content').innerHTML = `<h1 class="page-title">Failed to load data</h1><p class="page-lead">Could not fetch <code>data/latest.json</code>. Please try again later.</p>`;
});
