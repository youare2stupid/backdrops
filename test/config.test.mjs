import test from 'node:test';
import assert from 'node:assert/strict';
import { toRgb, stopsOf, normalize, merge, makePalette, darkestOf, luminanceOf, effects, DEFAULTS, VERSION } from '../src/backdrops.js';

const close = (got, want, eps = 0.005) => {
  assert.equal(got.length, want.length);
  got.forEach((value, index) => assert.ok(Math.abs(value - want[index]) < eps, got + ' vs ' + want));
};

test('toRgb reads every common colour form', () => {
  close(toRgb('#fff'), [1, 1, 1]);
  close(toRgb('#1d4f7c'), [29 / 255, 79 / 255, 124 / 255]);
  close(toRgb('#ff000080'), [1, 0, 0]);
  close(toRgb('rgb(255 0 0)'), [1, 0, 0]);
  close(toRgb('rgba(0, 128, 255, 0.5)'), [0, 128 / 255, 1]);
  close(toRgb('hsl(0 100% 50%)'), [1, 0, 0]);
  close(toRgb('hsl(210 100% 50%)'), [0, 128 / 255, 1]);
  close(toRgb([255, 128, 0]), [1, 128 / 255, 0]);
  close(toRgb([0.25, 0.5, 1]), [0.25, 0.5, 1]);
  assert.equal(toRgb('nonsense'), null);
  assert.equal(toRgb(''), null);
  assert.equal(toRgb(null), null);
});

test('stopsOf keeps the palette in order, pads and caps it', () => {
  const two = stopsOf(['#000', '#fff']);
  assert.equal(two.length, 2);
  close(two[0], [0, 0, 0]);
  close(two[1], [1, 1, 1]);
  const three = stopsOf(['#000', '#f00', '#fff']);
  assert.equal(three.length, 3);
  close(three[1], [1, 0, 0]);
  const single = stopsOf(['#123456']);
  assert.equal(single.length, 2);
  close(single[0], single[1], 0.001);
  const broken = stopsOf(['nope', 'also nope']);
  assert.equal(broken.length, 2);
  const many = stopsOf(['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777', '#888', '#999']);
  assert.equal(many.length, 8);
  close(many[7], [0x77 / 255, 0x77 / 255, 0x77 / 255]);
});

test('normalize clamps, rounds and repairs', () => {
  assert.equal(normalize({ scale: 99 }).scale, 12);
  assert.equal(normalize({ scale: 0 }).scale, 0.2);
  assert.equal(normalize({ speed: -3 }).speed, 0);
  assert.equal(normalize({ octaves: 3.7 }).octaves, 4);
  assert.equal(normalize({ octaves: 99 }).octaves, 6);
  assert.equal(normalize({ dots: { pitch: 100 } }).dots.pitch, 24);
  assert.equal(normalize({ dots: { base: -9 } }).dots.base, -2);
  assert.equal(normalize({ maxPixels: 12 }).maxPixels, 50000);
  assert.equal(normalize({ reducedMotion: 'weird' }).reducedMotion, 'still');
  assert.equal(normalize({ themeAttribute: 7 }).themeAttribute, null);
  assert.equal(normalize({ colors: [] }).colors.length, DEFAULTS.colors.length);
  assert.equal(normalize({ dots: null }).dots.on, DEFAULTS.dots.on);
  assert.deepEqual(normalize({ views: { dark: { colors: ['#000'] } } }).views.dark.colors, ['#000']);
});

test('merge is deep for plain objects and replacing for arrays', () => {
  const base = { dots: { on: true, pitch: 3 }, colors: ['a', 'b'], scale: 2 };
  const out = merge(base, { dots: { pitch: 8 }, colors: ['c'] });
  assert.equal(out.dots.on, true);
  assert.equal(out.dots.pitch, 8);
  assert.equal(out.scale, 2);
  assert.deepEqual(out.colors, ['c']);
  assert.deepEqual(base.dots, { on: true, pitch: 3 });
});

test('palette exposes stops and the darkest colour', () => {
  const palette = makePalette(['#ffffff', '#000000']);
  assert.equal(palette.stops.length, 2);
  close(palette.darkest, [0, 0, 0], 0.01);
  close(darkestOf(stopsOf(['#f0f0f0', '#202020'])), [32 / 255, 32 / 255, 32 / 255], 0.01);
  assert.ok(luminanceOf([1, 1, 1]) > luminanceOf([0, 0, 0]));
});

test('normalize caps the palette at eight stops', () => {
  const colors = Array.from({ length: 12 }, (_, i) => '#' + i.toString(16).repeat(6).slice(0, 6));
  assert.equal(normalize({ colors }).colors.length, 8);
});

test('every engine ships with the build', () => {
  assert.deepEqual(effects().sort(), ['aurora', 'goo', 'liquid']);
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
