import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bundle } from '../tools/build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'dist/build.json'), 'utf8'));

test('the built files match the sources', () => {
  const fresh = bundle();
  assert.equal(manifest.hash, fresh.manifest.hash, 'run npm run build');
  assert.equal(readFileSync(join(root, 'dist/backdrops.mjs'), 'utf8'), fresh.module);
  assert.equal(readFileSync(join(root, 'dist/backdrops.js'), 'utf8'), fresh.global);
});

test('the module build stays importable', () => {
  const text = readFileSync(join(root, 'dist/backdrops.mjs'), 'utf8');
  assert.match(text, /export default \{/);
  assert.match(text, /export const LIQUID/);
  assert.doesNotMatch(text, /^import /m);
});

test('the classic build is a self contained global', () => {
  const text = readFileSync(join(root, 'dist/backdrops.js'), 'utf8');
  assert.match(text, /\n\(function \(root\) \{/);
  assert.ok(text.indexOf('(function (root) {') < 200, 'banner then wrapper');
  assert.match(text, /root\.Backdrops = Backdrops;/);
  assert.equal(manifest.version, JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
});
