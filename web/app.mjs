import { createEntries, filterEntries, safeURL, typeLabels } from './catalog.mjs';
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const storageKey = 'osnit-saved-v1';
let catalog, entries = [], visible = 24, matched = [], toastTimer, activeEntry;
let saved;
try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); saved = new Set(Array.isArray(value) ? value.filter(v => typeof v === 'string') : []); }
catch { saved = new Set(); }
const parameters = new URLSearchParams(location.search);
const state = { query: parameters.get('q') || '', category: parameters.get('category') || '', type: parameters.get('type') || '', savedOnly: false, saved, sort: parameters.get('sort') === 'az' ? 'az' : 'curated' };
const pretty = id => catalog.categories.find(c => c.id === id)?.name || id;

function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 2600); }
function persistSaved() { try { localStorage.setItem(storageKey, JSON.stringify([...saved])); } catch { toast('Saved for this visit. Browser storage is unavailable.'); } }
function save(id) { saved.has(id) ? saved.delete(id) : saved.add(id); persistSaved(); render(); if ($('#resource-dialog').open && activeEntry) detail(activeEntry, false); }
function updateURL() {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.category) params.set('category', state.category);
  if (state.type) params.set('type', state.type);
  if (state.sort === 'az') params.set('sort', 'az');
  history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : '') + location.hash);
}
function categoryButtons() {
  $('#categories').innerHTML = catalog.categories.map(category => {
    const count = entries.filter(entry => entry.categories.includes(category.id)).length;
    return `<button class="category-button${state.category === category.id ? ' active' : ''}" data-category="${escape(category.id)}"><span>${escape(category.name)}</span><span>${count}</span></button>`;
  }).join('');
  $('.category-button[data-category=""]').classList.toggle('active', !state.category);
  $('#all-count').textContent = entries.length.toLocaleString();
}
function card(entry) {
  const savedClass = saved.has(entry.id) ? ' saved' : '';
  const tag = entry.categories[0] ? pretty(entry.categories[0]) : 'Resource';
  const host = new URL(entry.url).hostname.replace(/^www\./, '');
  const mark = entry.type === 'repository' ? '</>' : entry.type === 'telegram-resource' ? 'TG' : entry.type === 'video-resource' ? '▶' : entry.type === 'browser-extension' ? '[+]' : '↗';
  return `<article class="resource-card${entry.featured ? ' featured' : ''}"><div class="card-top"><span class="resource-icon" aria-hidden="true">${escape(mark)}</span><button class="card-save${savedClass}" data-save="${escape(entry.id)}" aria-label="${saved.has(entry.id) ? 'Unsave' : 'Save'} ${escape(entry.title)}" aria-pressed="${saved.has(entry.id)}">${saved.has(entry.id) ? '▣' : '□'}</button></div><h3><a href="${escape(entry.url)}" target="_blank" rel="noopener noreferrer">${escape(entry.title)}</a></h3><p>${escape(entry.description || `Explore this ${pretty(entry.categories[0]).toLowerCase()} resource at its original source.`)}</p><div class="card-tags"><span>${escape(tag)}</span>${entry.featured ? '<span class="featured-tag">FEATURED</span>' : ''}</div><div class="card-bottom"><span>${escape(host)}</span><button data-detail="${escape(entry.id)}">Field notes ↗</button></div></article>`;
}
function render() {
  matched = filterEntries(entries, state);
  const shown = matched.slice(0, visible);
  $('#results').innerHTML = shown.map(card).join('');
  $('#result-summary').textContent = `${matched.length.toLocaleString()} ${matched.length === 1 ? 'resource' : 'resources'}${state.savedOnly ? ' · saved list' : ''}`;
  $('#page-summary').textContent = `${shown.length} / ${matched.length.toLocaleString()} SHOWN`;
  $('#empty-state').hidden = Boolean(matched.length);
  $('#load-more').hidden = shown.length >= matched.length;
  $('#saved-count').textContent = entries.filter(e => saved.has(e.id)).length;
  $('#saved-toggle').setAttribute('aria-pressed', String(state.savedOnly));
  $('#sort').value = state.sort;
  document.querySelectorAll('[data-type]').forEach(button => { const on = button.dataset.type === state.type; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('[data-category]').forEach(button => button.classList.toggle('active', button.dataset.category === state.category));
  $('#active-filter').hidden = !(state.category || state.type || state.savedOnly || state.query);
  $('#active-filter span').textContent = [state.category && pretty(state.category), state.type && typeLabels[state.type], state.savedOnly && 'Saved', state.query && `“${state.query}”`].filter(Boolean).join(' / ');
  updateURL();
}
function reset() { Object.assign(state, { query: '', category: '', type: '', savedOnly: false }); $('#search').value = ''; visible = 24; render(); }
function detail(entry, open = true) {
  activeEntry = entry;
  const isRepository = entry.type === 'repository';
  const source = safeURL(entry.source || entry.url);
  const license = entry.license?.label || 'Upstream terms apply';
  const clone = isRepository ? `git clone ${entry.repository}.git` : '';
  $('#dialog-content').innerHTML = `<h2>${escape(entry.title)}</h2><p>${escape(entry.description || 'Open the original resource to explore its features and access requirements.')}</p><div class="detail-field"><span>TYPE</span><div>${escape(typeLabels[entry.type] || 'Resource')}</div></div><div class="detail-field"><span>CATEGORIES</span><div>${entry.categories.map(c => escape(pretty(c))).join(' / ')}</div></div>${entry.owner ? `<div class="detail-field"><span>CREATOR</span><div>${escape(entry.owner)}</div></div>` : ''}<div class="detail-field"><span>LICENSE</span><div>${escape(license)}${isRepository ? ' · check upstream before reuse' : ''}</div></div><div class="detail-field"><span>SOURCE</span><div><a href="${escape(source)}" target="_blank" rel="noopener noreferrer">Original collection ↗</a></div></div>${isRepository ? `<div class="clone-box"><span class="eyebrow">GET THE SOURCE</span><p>Clone the repository, then follow its README for setup.</p><code>${escape(clone)}</code><button id="copy-command">COPY COMMAND ↗</button></div>` : '<p>Some resources require an account, API credentials or a paid plan. Check access details on the original website.</p>'}<div class="detail-actions"><a class="button primary" href="${escape(entry.url)}" target="_blank" rel="noopener noreferrer">Open original source <span>↗</span></a><button id="detail-save" class="text-link">${saved.has(entry.id) ? 'Remove from saved −' : 'Save to toolkit +'}</button></div>`;
  $('#detail-save').addEventListener('click', () => save(entry.id));
  if (isRepository) $('#copy-command').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(clone); toast('Clone command copied.'); }
    catch { toast('Clipboard unavailable. Select and copy the command above.'); }
  });
  if (open) $('#resource-dialog').showModal();
}
$('#search-form').addEventListener('submit', event => event.preventDefault());
let searchTimer;
$('#search').addEventListener('input', event => { state.query = event.target.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => { visible = 24; if (catalog) render(); }, 120); });
$('#clear-search').addEventListener('click', () => { clearTimeout(searchTimer); state.query = ''; $('#search').value = ''; visible = 24; if (catalog) render(); $('#search').focus(); });
$('#sidebar').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button || !catalog) return; state.category = button.dataset.category; visible = 24; render(); $('#sidebar').classList.remove('open'); $('#open-categories').setAttribute('aria-expanded', 'false'); });
$('#type-tabs').addEventListener('click', event => { const button = event.target.closest('[data-type]'); if (!button || !catalog) return; state.type = button.dataset.type; visible = 24; render(); });
$('#results').addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save]'); if (saveButton) { save(saveButton.dataset.save); return; }
  const detailButton = event.target.closest('[data-detail]'); if (detailButton) detail(entries.find(entry => entry.id === detailButton.dataset.detail));
});
$('#sort').addEventListener('change', event => { state.sort = event.target.value; visible = 24; if (catalog) render(); });
$('#saved-toggle').addEventListener('click', () => { state.savedOnly = !state.savedOnly; visible = 24; if (catalog) render(); });
$('#load-more').addEventListener('click', () => { visible += 24; if (catalog) render(); });
for (const id of ['reset-filters', 'empty-reset']) $(`#${id}`).addEventListener('click', () => { if (catalog) reset(); });
$('#grid-view').addEventListener('click', () => setView(false)); $('#list-view').addEventListener('click', () => setView(true));
function setView(list) { $('#results').classList.toggle('list-view', list); for (const [id, on] of [['list-view', list], ['grid-view', !list]]) { $(`#${id}`).classList.toggle('active', on); $(`#${id}`).setAttribute('aria-pressed', String(on)); } }
$('#open-categories').setAttribute('aria-expanded', 'false');
$('#open-categories').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#open-categories').setAttribute('aria-expanded', 'true'); $('#close-categories').focus(); });
$('#close-categories').addEventListener('click', closeCategories);
function closeCategories() { $('#sidebar').classList.remove('open'); $('#open-categories').setAttribute('aria-expanded', 'false'); $('#open-categories').focus(); }
$('#close-dialog').addEventListener('click', () => $('#resource-dialog').close());
$('#resource-dialog').addEventListener('click', event => { if (event.target === $('#resource-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('#resource-dialog').open) { event.preventDefault(); $('#search').focus(); }
  if (event.key === 'Escape' && $('#sidebar').classList.contains('open')) closeCategories();
});
$('#export-saved').addEventListener('click', () => {
  const selected = entries.filter(entry => saved.has(entry.id));
  if (!selected.length) { toast('Save a resource first to export your toolkit.'); return; }
  const blob = new Blob([JSON.stringify(selected.map(({ title, url, categories, type }) => ({ title, url, categories, type })), null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'osnit-toolkit.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); toast('Saved toolkit exported.');
});
$('#reload').addEventListener('click', () => location.reload());
try {
  const response = await fetch('./catalog.json'); if (!response.ok) throw new Error('Catalog request failed');
  catalog = await response.json();
  entries = createEntries(catalog).filter(entry => safeURL(entry.url));
  if (!catalog.categories.some(c => c.id === state.category)) state.category = '';
  if (!(state.type in typeLabels)) state.type = '';
  $('#search').value = state.query;
  $('#category-stat').textContent = catalog.categories.length;
  $('#tool-stat').textContent = catalog.tools.length;
  $('#resource-stat').textContent = catalog.resources.length.toLocaleString();
  categoryButtons(); render();
} catch {
  $('#result-summary').textContent = 'Directory unavailable'; $('#load-error').hidden = false; $('#load-more').hidden = true;
}
