import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = await mkdtemp(join(tmpdir(), 'pinnata-pi-pocket-'));
const output = resolve(root, 'release-artifacts');
const archive = resolve(output, 'pinnata-pi-pocket-prebuilt.tar.gz');
await mkdir(output, { recursive: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'dist'), resolve(stage, 'dist'), { recursive: true });
await cp(resolve(root, 'README.md'), resolve(stage, 'README.md'));
await cp(resolve(root, 'LICENSE'), resolve(stage, 'LICENSE'));
await build({
  entryPoints: [resolve(root, 'tools/runtime-host.ts')],
  outfile: resolve(stage, 'runtime-host.cjs'),
  bundle: true,
  packages: 'bundle',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
});
await writeFile(resolve(stage, 'MANIFEST.json'), `${JSON.stringify({
  name: 'pinnata-pi-pocket',
  contents: ['dist/', 'runtime-host.cjs', 'README.md', 'LICENSE'],
  runtime: 'Node.js 20+',
  releaseVersion: 'Use the enclosing GitHub release tag',
}, null, 2)}\n`);
const tar = spawnSync('tar', ['-czf', archive, '-C', stage, '.'], { stdio: 'inherit' });
if (tar.error) throw tar.error;
if (tar.status !== 0) throw new Error(`tar exited with status ${tar.status}`);
const checksum = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(`${archive}.sha256`, `${checksum}  ${archive.split('/').at(-1)}\n`);
await rm(stage, { recursive: true, force: true });
console.log(`Created ${archive}\nSHA-256 ${checksum}`);
