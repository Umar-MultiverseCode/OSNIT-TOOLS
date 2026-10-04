import { readFile, readdir, mkdir, cp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const categories = JSON.parse(await readFile(path.join(root, 'data/categories.json'), 'utf8'));
const resources = JSON.parse(await readFile(path.join(root, 'data/resources.json'), 'utf8'));
const tools = [];
for (const filename of (await readdir(path.join(root, 'data/tools'))).sort()) {
  if (filename.endsWith('.json')) tools.push(JSON.parse(await readFile(path.join(root, 'data/tools', filename), 'utf8')));
}
await mkdir(output, { recursive: true });
await cp(path.join(root, 'web'), output, { recursive: true });
await writeFile(path.join(output, 'catalog.json'), JSON.stringify({ categories, resources, tools }));
await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
console.log(`Built OSNIT TOOLS — ${categories.length} categories, ${tools.length} repositories, ${resources.length} unique resources.`);
