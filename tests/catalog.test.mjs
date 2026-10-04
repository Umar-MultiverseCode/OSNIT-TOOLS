import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createEntries, filterEntries, safeURL } from '../web/catalog.mjs';
const categories = JSON.parse(await readFile(new URL('../data/categories.json', import.meta.url), 'utf8'));
const resources = JSON.parse(await readFile(new URL('../data/resources.json', import.meta.url), 'utf8'));
const tools = [];
for (const filename of await readdir(new URL('../data/tools/', import.meta.url))) {
  tools.push(JSON.parse(await readFile(new URL(`../data/tools/${filename}`, import.meta.url), 'utf8')));
}
const catalog = { categories, resources, tools };
const entries = createEntries(catalog);

test('all catalogue records reference valid categories and safe original URLs', () => {
  const categoryIDs = new Set(categories.map(category => category.id));
  assert.equal(categoryIDs.size, categories.length);
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  assert.equal(new Set(resources.map(entry => entry.url)).size, resources.length);
  for (const entry of entries) {
    assert.ok(safeURL(entry.url), entry.id);
    assert.ok(entry.categories.length, entry.id);
    assert.ok(entry.categories.every(id => categoryIDs.has(id)), entry.id);
    assert.ok(safeURL(entry.source), entry.id);
  }
});

test('every repository has creator credit, license status and a guide', async () => {
  for (const tool of tools) {
    assert.ok(tool.owner && tool.name && tool.description);
    assert.ok(safeURL(tool.license.reference));
    assert.equal(typeof tool.license.verified, 'boolean');
    assert.ok((await stat(new URL(`../docs/tools/${tool.id}.md`, import.meta.url))).isFile());
  }
});

test('combined keyword, category and resource type filters find Sherlock', () => {
  const matches = filterEntries(entries, { query: 'sherlock username', category: 'Email-Username-OSINT', type: 'repository' });
  assert.ok(matches.some(entry => entry.id === 'sherlock-project--sherlock'));
  assert.ok(matches.every(entry => entry.type === 'repository' && entry.categories.includes('Email-Username-OSINT')));
  assert.deepEqual(filterEntries(entries, { query: 'no-such-resource-3b879cf' }), []);
});

test('saved filters and sorting work without changing the source catalogue', () => {
  const before = entries.map(entry => entry.id);
  const saved = new Set(['sherlock-project--sherlock']);
  assert.equal(filterEntries(entries, { savedOnly: true, saved }).length, 1);
  const sorted = filterEntries(entries, { sort: 'az' });
  assert.ok(sorted.every((entry, index) => index === 0 || sorted[index - 1].title.localeCompare(entry.title) <= 0));
  assert.deepEqual(entries.map(entry => entry.id), before);
});

test('unsafe schemes and credential-bearing URLs are rejected', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///C:/Users/test', 'https://user:password@example.org', 'invalid']) assert.equal(safeURL(value), null);
  assert.equal(safeURL('https://github.com/sherlock-project/sherlock'), 'https://github.com/sherlock-project/sherlock');
});

test('public catalogue carries no local environment or result fields', () => {
  for (const tool of tools) for (const field of ['environment', 'launcher', 'folder', 'checks', 'test_status', 'install_status']) assert.equal(field in tool, false);
  const json = JSON.stringify(catalog);
  assert.ok(!json.includes('C:\\Users\\'));
  assert.ok(!json.includes('umarmulla.ai.txt'));
  assert.ok(!json.includes('umarmulla7700@gmail.com'));
});
