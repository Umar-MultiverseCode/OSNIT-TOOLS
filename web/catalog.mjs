export const typeLabels = {
  repository: 'Repositories',
  'web-resource': 'Web resources',
  'browser-extension': 'Extensions',
  'telegram-resource': 'Telegram',
  'video-resource': 'Videos'
};

export function createEntries(catalog) {
  const repositories = catalog.tools.map(tool => ({ ...tool, type: 'repository', title: tool.name, url: tool.repository }));
  return [...repositories, ...catalog.resources.filter(r => r.type !== 'repository-candidate')];
}

export function filterEntries(entries, { query = '', category = '', type = '', savedOnly = false, saved = new Set(), sort = 'curated' }) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = entries.filter(entry => (!category || entry.categories.includes(category)) &&
    (!type || entry.type === type) && (!savedOnly || saved.has(entry.id)) &&
    tokens.every(token => `${entry.title} ${entry.owner || ''} ${entry.description || ''} ${entry.categories.join(' ')} ${entry.url}`.toLowerCase().includes(token)));
  if (sort === 'az') filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'curated') filtered.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.title.localeCompare(b.title));
  return filtered;
}

export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
