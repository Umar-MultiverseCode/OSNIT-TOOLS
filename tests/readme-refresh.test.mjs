import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('weekly refresh preserves editorial content, is repeatable and rotates real credited entries', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'osnit-readme-'));
  try {
    await mkdir(path.join(fixture, 'scripts'), { recursive: true });
    await mkdir(path.join(fixture, 'data/tools'), { recursive: true });
    await cp(new URL('../scripts/refresh-readme.mjs', import.meta.url), path.join(fixture, 'scripts/refresh-readme.mjs'));
    const write = (name, value) => writeFile(path.join(fixture, name), JSON.stringify(value));
    await write('data/categories.json', [{ id: 'research', name: 'Research' }]);
    await write('data/resources.json', [{ id: 'one' }, { id: 'two' }]);
    for (const name of ['alpha', 'beta', 'gamma', 'delta']) {
      await write(`data/tools/${name}.json`, { id: name, name, owner: 'creator', categories: ['research'], featured: true });
    }
    const original = 'Editorial header\n<!-- FIELD-NOTES:START -->\nold\n<!-- FIELD-NOTES:END -->\nEditorial footer\n';
    await writeFile(path.join(fixture, 'README.md'), original);
    const run = date => spawnSync(process.execPath, ['scripts/refresh-readme.mjs'], { cwd: fixture, encoding: 'utf8', env: { ...process.env, README_DATE: date } });
    assert.equal(run('2026-10-04').status, 0);
    const first = await readFile(path.join(fixture, 'README.md'), 'utf8');
    assert.ok(first.startsWith('Editorial header\n'));
    assert.ok(first.endsWith('\nEditorial footer\n'));
    assert.equal((first.match(/^\| \[/gm) || []).length, 3);
    assert.match(first, /https:\/\/github.com\/creator/);
    const metrics = await readFile(path.join(fixture, 'assets/catalog-metrics.svg'), 'utf8');
    assert.match(metrics, /1 research areas, 4 repositories, 2 unique links/);
    assert.equal(run('2026-10-04').status, 0);
    assert.equal(await readFile(path.join(fixture, 'README.md'), 'utf8'), first);
    assert.equal(run('2026-10-05').status, 0);
    const next = await readFile(path.join(fixture, 'README.md'), 'utf8');
    assert.notEqual(next, first);
    assert.match(next, /Week of 2026-10-05/);
    await writeFile(path.join(fixture, 'README.md'), 'Missing markers must not be overwritten');
    assert.notEqual(run('2026-10-05').status, 0);
    assert.equal(await readFile(path.join(fixture, 'README.md'), 'utf8'), 'Missing markers must not be overwritten');
  } finally { await rm(fixture, { recursive: true, force: true }); }
});
