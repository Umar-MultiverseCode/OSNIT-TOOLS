import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const id = process.argv[2];
if (!id || !/^[a-z0-9][a-z0-9.-]*--[a-z0-9][a-z0-9.-]*$/.test(id)) {
  console.error('Usage — node scripts/get-tool.mjs owner--repository'); process.exit(1);
}
try {
  const tool = JSON.parse(await readFile(path.join(root, 'data/tools', `${id}.json`), 'utf8'));
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(tool.repository)) throw new Error('Manifest repository URL is invalid');
  const directory = path.join(root, '.local/tools', id);
  await mkdir(path.dirname(directory), { recursive: true });
  const result = spawnSync('git', ['clone', '--depth', '1', `${tool.repository}.git`, directory], { stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) throw new Error('Clone failed. Check Git and network access, and inspect any existing destination before retrying.');
  console.log(`Source downloaded to ${directory}. Follow the original README for installation.`);
} catch (error) { console.error(error.message); process.exit(1); }
