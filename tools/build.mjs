import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINES = ['src/engines/liquid.js', 'src/engines/goo.js', 'src/engines/grid.js'];
const CORE = 'src/backdrops.js';
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function hashOf(files) {
  const hash = createHash('sha256');
  for (const file of files) hash.update(read(file));
  return hash.digest('hex');
}

export function bundle() {
  const files = ENGINES.concat(CORE);
  const source = files.map(read).join('\n');
  const banner = '/* backdrops v' + pkg.version + ' - BSD-3-Clause - https://github.com/youare2stupid/backdrops */\n';
  const module_ = banner + source.replace(/^\s*import[^;]+;\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
  const global_ =
    banner +
    '(function (root) {\n' +
    source
      .replace(/^\s*import[^;]+;\s*$/gm, '')
      .replace(/^export default\s+/m, 'var Backdrops = ')
      .replace(/^export\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n') +
    '\nroot.Backdrops = Backdrops;\n})(typeof globalThis !== "undefined" ? globalThis : this);\n';
  const hash = hashOf(files);
  return {
    module: module_,
    global: global_,
    manifest: {
      name: pkg.name,
      version: pkg.version,
      hash: hash,
      sources: files,
      bytes: { module: Buffer.byteLength(module_), global: Buffer.byteLength(global_) }
    }
  };
}

const out = bundle();
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/backdrops.mjs'), out.module);
writeFileSync(join(root, 'dist/backdrops.js'), out.global);
writeFileSync(join(root, 'dist/build.json'), JSON.stringify(out.manifest, null, 2) + '\n');
console.log(
  'dist/backdrops.mjs ' + Math.round(statSync(join(root, 'dist/backdrops.mjs')).size / 1024) +
  ' KB, dist/backdrops.js ' + Math.round(statSync(join(root, 'dist/backdrops.js')).size / 1024) +
  ' KB, hash ' + out.manifest.hash.slice(0, 12)
);
