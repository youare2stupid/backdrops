import { LIQUID } from './engines/liquid.js';
import { GOO } from './engines/goo.js';

export const VERSION = '0.1.0';

export const DEFAULTS = {
  effect: 'liquid',
  colors: ['#072563', '#133f8b', '#3e7bcd', '#5f9dea'],
  background: '#0d1114',
  scale: 2.25,
  speed: 1,
  contrast: 1.4,
  warp: 3,
  octaves: 4,
  grain: 0.85,
  seed: 0,
  quality: 1.25,
  maxPixels: 1300000,
  vignette: 0.12,
  dots: { on: true, pitch: 3.2, size: 1.35, jitter: 0.5, base: 0.74, gain: 0.6, color: null, shade: 0.86 },
  views: {},
  theme: null,
  themeAttribute: 'data-theme',
  themeFade: 700,
  stillFrame: 12,
  pauseWhenHidden: true,
  reducedMotion: 'still',
  autoplay: true,
  fallback: 'gradient'
};

export const RANGES = {
  scale: [0.2, 12],
  speed: [0, 4],
  contrast: [0.2, 4],
  warp: [0, 8],
  octaves: [1, 6],
  grain: [0, 3],
  quality: [0.5, 2],
  maxPixels: [50000, 8000000],
  vignette: [0, 1],
  themeFade: [0, 4000],
  stillFrame: [0, 600],
  'dots.pitch': [1, 24],
  'dots.size': [0, 4],
  'dots.jitter': [0, 2],
  'dots.base': [-2, 2],
  'dots.gain': [-2, 2],
  'dots.shade': [0, 1.5]
};

var registry = { liquid: LIQUID, goo: GOO };

export function register(engine) {
  if (!engine || !engine.id || typeof engine.mount !== 'function') {
    throw new Error('backdrops: an engine needs an id and a mount function');
  }
  registry[engine.id] = engine;
  return engine.id;
}

export function effects() {
  return Object.keys(registry);
}

export function engineDefaults(id) {
  var engine = registry[id];
  return engine && engine.defaults ? engine.defaults : {};
}

export function isPlain(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function merge(base, patch) {
  var out = {};
  var key;
  for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
  if (!patch) return out;
  for (key in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    var value = patch[key];
    if (value === undefined) continue;
    if (isPlain(value) && isPlain(out[key])) out[key] = merge(out[key], value);
    else out[key] = value;
  }
  return out;
}

function clampTo(value, range) {
  return Math.min(range[1], Math.max(range[0], value));
}

export function normalize(input) {
  var config = merge(DEFAULTS, input);
  var key;
  for (key in RANGES) {
    var parts = key.split('.');
    if (parts.length === 1) {
      if (typeof config[key] === 'number') config[key] = clampTo(config[key], RANGES[key]);
    } else if (isPlain(config[parts[0]]) && typeof config[parts[0]][parts[1]] === 'number') {
      config[parts[0]][parts[1]] = clampTo(config[parts[0]][parts[1]], RANGES[key]);
    }
  }
  config.octaves = Math.round(config.octaves);
  config.maxPixels = Math.round(config.maxPixels);
  if (!Array.isArray(config.colors) || !config.colors.length) config.colors = DEFAULTS.colors.slice();
  config.colors = config.colors.slice(0, 8);
  if (typeof config.fallback !== 'string') config.fallback = 'none';
  if (typeof config.themeAttribute !== 'string') config.themeAttribute = null;
  if (['still', 'slow', 'ignore'].indexOf(config.reducedMotion) === -1) config.reducedMotion = 'still';
  if (!isPlain(config.views)) config.views = {};
  if (!isPlain(config.dots)) config.dots = merge(DEFAULTS.dots, {});
  return config;
}

function hexToRgb(text) {
  var hex = text.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map(function (part) {
        return part + part;
      })
      .join('');
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  var value = parseInt(hex.slice(0, 6), 16);
  if (isNaN(value)) return null;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function rgbFnToRgb(text) {
  var match = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (!match) return null;
  var parts = match[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  var out = [];
  for (var i = 0; i < 3; i++) {
    var value = parts[i].indexOf('%') !== -1 ? parseFloat(parts[i]) / 100 : parseFloat(parts[i]) / 255;
    if (isNaN(value)) return null;
    out.push(Math.min(1, Math.max(0, value)));
  }
  return out;
}

function hslFnToRgb(text) {
  var match = /^hsla?\(([^)]+)\)$/i.exec(text);
  if (!match) return null;
  var parts = match[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  var hue = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360;
  var sat = parts[1].indexOf('%') !== -1 ? parseFloat(parts[1]) / 100 : parseFloat(parts[1]);
  var lum = parts[2].indexOf('%') !== -1 ? parseFloat(parts[2]) / 100 : parseFloat(parts[2]);
  if (isNaN(hue) || isNaN(sat) || isNaN(lum)) return null;
  if (sat === 0) return [lum, lum, lum];
  var q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  var p = 2 * lum - q;
  function channel(offset) {
    var t = hue + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  return [channel(1 / 3), channel(0), channel(-1 / 3)];
}

var probe = null;

export function toRgb(value) {
  if (Array.isArray(value)) {
    var nums = value.slice(0, 3).map(Number);
    if (nums.length < 3 || nums.some(isNaN)) return null;
    var scale = Math.max.apply(
      null,
      nums.map(function (n) {
        return Math.abs(n);
      })
    ) > 1
      ? 255
      : 1;
    return nums.map(function (n) {
      return Math.min(1, Math.max(0, n / scale));
    });
  }
  if (typeof value !== 'string') return null;
  var text = value.trim();
  if (!text) return null;
  if (text.charAt(0) === '#') return hexToRgb(text);
  if (/^rgba?\(/i.test(text)) return rgbFnToRgb(text);
  if (/^hsla?\(/i.test(text)) return hslFnToRgb(text);
  if (typeof document === 'undefined') return null;
  if (!probe) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  probe.fillStyle = '#000000';
  probe.fillStyle = text;
  var resolved = probe.fillStyle;
  if (resolved.charAt(0) !== '#') return null;
  return hexToRgb(resolved);
}

export function stopsOf(colors) {
  var list = Array.isArray(colors) && colors.length ? colors : DEFAULTS.colors;
  var stops = [];
  for (var i = 0; i < list.length; i++) {
    var rgb = toRgb(list[i]);
    if (rgb) stops.push(rgb);
  }
  if (!stops.length) stops = [[0, 0, 0], [1, 1, 1]];
  if (stops.length === 1) stops = [stops[0], stops[0].slice()];
  return stops.slice(0, 8);
}

export function luminanceOf(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function darkestOf(stops) {
  var best = stops[0];
  var bestLum = Infinity;
  for (var i = 0; i < stops.length; i++) {
    var value = luminanceOf(stops[i]);
    if (value < bestLum) {
      bestLum = value;
      best = stops[i];
    }
  }
  return best.slice(0, 3);
}

export function makePalette(colors) {
  var stops = stopsOf(colors);
  return { colors: colors || DEFAULTS.colors, stops: stops, darkest: darkestOf(stops) };
}

function lerpStops(from, to, k) {
  if (from.length !== to.length) return to;
  var out = [];
  for (var i = 0; i < to.length; i++) {
    out.push([
      from[i][0] + (to[i][0] - from[i][0]) * k,
      from[i][1] + (to[i][1] - from[i][1]) * k,
      from[i][2] + (to[i][2] - from[i][2]) * k
    ]);
  }
  return out;
}

function lerpConfig(from, to, k) {
  var out = merge(from, to);
  var key;
  for (key in to) {
    if (!Object.prototype.hasOwnProperty.call(to, key)) continue;
    if (typeof to[key] === 'number' && typeof from[key] === 'number') out[key] = from[key] + (to[key] - from[key]) * k;
    else if (isPlain(to[key]) && isPlain(from[key])) out[key] = lerpConfig(from[key], to[key], k);
  }
  return out;
}

function setPath(target, path, value) {
  var parts = path.split('-');
  var node = target;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!isPlain(node[parts[i]])) node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

function coerce(value, base, key) {
  if (key === 'colors') {
    return String(value)
      .split(',')
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  var head = key.split('-')[0];
  if (value !== '' && !isNaN(Number(value)) && typeof (base ? base[head] : undefined) !== 'string') return Number(value);
  return value;
}

export function readAttributes(el, base) {
  var patch = {};
  var attributes = el.attributes;
  for (var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    if (attribute.name.indexOf('data-backdrop-') !== 0) continue;
    var key = attribute.name.slice('data-backdrop-'.length);
    if (key === 'options') continue;
    setPath(patch, key, coerce(attribute.value, base, key));
  }
  var raw = el.getAttribute('data-backdrop-options');
  if (raw) {
    try {
      patch = merge(patch, JSON.parse(raw));
    } catch (error) {
      if (typeof console !== 'undefined') console.warn('backdrops: bad data-backdrop-options', error);
    }
  }
  return patch;
}

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
}

function systemTheme() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function create(target, options) {
  var pageMode = target === null || target === undefined || target === 'page';
  var optionsPatch = options ? merge({}, options) : {};
  var el = null;
  var attributePatch = {};

  if (!pageMode) {
    el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el || !el.nodeType) throw new Error('backdrops: target not found - ' + target);
    attributePatch = readAttributes(el, merge(DEFAULTS, optionsPatch));
    var declared = el.getAttribute('data-backdrop');
    if (declared) attributePatch.effect = declared;
  } else {
    var rootEffect = document.documentElement.getAttribute('data-backdrop');
    if (rootEffect) attributePatch.effect = rootEffect;
  }

  var base = normalize(merge(engineDefaults(attributePatch.effect || optionsPatch.effect || DEFAULTS.effect), merge(attributePatch, optionsPatch)));
  var engine = registry[base.effect];
  if (!engine) throw new Error('backdrops: unknown effect - ' + base.effect);

  var holder = pageMode ? document.createElement('div') : el;
  var created = [];

  if (pageMode) {
    holder.setAttribute('data-backdrop-layer', '');
    holder.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:-1';
    document.body.appendChild(holder);
    created.push(holder);
  } else {
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.isolation = 'isolate';
  }

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:-1';
  canvas.setAttribute('aria-hidden', 'true');
  if (pageMode) holder.appendChild(canvas);
  else holder.insertBefore(canvas, holder.firstChild);
  created.push(canvas);

  var shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:-1';
  holder.appendChild(shade);
  created.push(shade);

  var logs = [];
  function log(message) {
    logs.push(message);
    if (typeof console !== 'undefined') console.warn(message);
  }

  if (pageMode) {
    document.documentElement.style.backgroundColor = base.background;
    var bodyBackground = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBackground && bodyBackground !== 'transparent' && bodyBackground !== 'rgba(0, 0, 0, 0)') {
      document.body.style.backgroundColor = 'transparent';
      log('backdrops: cleared the body background so the layer shows through');
    }
  }

  var mode = 'idle';
  var frames = 0;
  var fps = 0;
  var fpsFrames = 0;
  var fpsStamp = 0;
  var still = false;
  var reduced = base.reducedMotion === 'ignore' ? false : prefersReduced();
  var quality = base.quality;
  var qualityLocked = typeof optionsPatch.quality === 'number';
  var costSum = 0;
  var costSamples = 0;
  var lastStamp = 0;
  var time = 0;
  var size = { w: 2, h: 2, dpr: 1 };
  var draw = null;
  var raf = 0;
  var running = false;
  var disposed = false;
  var activeView = null;
  var fade = null;
  var applied = null;
  var palette = makePalette(base.colors);

  function viewPatch(name) {
    return name && base.views[name] ? base.views[name] : {};
  }

  function effective(name) {
    var patch = viewPatch(name);
    var merged = normalize(merge(base, patch));
    var colors = patch.colors || base.colors;
    return { config: merged, palette: makePalette(colors) };
  }

  function apply(state) {
    applied = state.config;
    palette = state.palette;
    shade.style.background =
      state.config.vignette > 0
        ? 'radial-gradient(120% 90% at 50% 40%, rgba(0,0,0,0) 45%, rgba(0,0,0,' + state.config.vignette + ') 100%)'
        : 'none';
    if (draw) draw.setConfig(state.config, state.palette);
  }

  function measure() {
    var width = holder.clientWidth || 1;
    var height = holder.clientHeight || 1;
    var cap = Math.min(window.devicePixelRatio || 1, quality);
    var w = Math.max(1, Math.round(width * cap));
    var h = Math.max(1, Math.round(height * cap));
    var config = applied || base;
    if (w * h > config.maxPixels) {
      var k = Math.sqrt(config.maxPixels / (w * h));
      w = Math.max(1, Math.round(w * k));
      h = Math.max(1, Math.round(h * k));
      cap = cap * k;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    size = { w: w, h: h, dpr: cap };
    return size;
  }

  function render() {
    if (!draw) return;
    draw.resize(measure());
    draw.draw({ time: still ? (applied || base).stillFrame : time, delta: 0, frame: frames, still: still });
    frames++;
  }

  function stepFade(now) {
    if (!fade) return;
    var k = Math.min(1, (now - fade.start) / fade.duration);
    var eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var stops = lerpStops(fade.fromPalette.stops, fade.toPalette.stops, eased);
    apply({
      config: lerpConfig(fade.fromConfig, fade.toConfig, eased),
      palette: { colors: fade.toPalette.colors, stops: stops, darkest: darkestOf(stops) }
    });
    if (k >= 1) fade = null;
  }

  function schedule() {
    if (disposed || !running || still || raf) return;
    raf = window.requestAnimationFrame(tick);
  }

  function tick(now) {
    raf = 0;
    if (disposed || !running || still) return;
    if (lastStamp && frames > 25 && !qualityLocked) {
      costSum += now - lastStamp;
      costSamples++;
      if (costSamples >= 40) {
        var avg = costSum / costSamples;
        if (avg > 30) quality = Math.max(0.8, quality * 0.85);
        else if (avg < 15) quality = Math.min((applied || base).quality, quality * 1.08);
        costSum = 0;
        costSamples = 0;
      }
    }
    if (lastStamp) time += Math.min(0.1, (now - lastStamp) / 1000);
    lastStamp = now;
    stepFade(now);
    draw.resize(measure());
    draw.draw({ time: still ? (applied || base).stillFrame : time, delta: time, frame: frames, still: still });
    frames++;
    fpsFrames++;
    if (!fpsStamp) fpsStamp = now;
    if (now - fpsStamp >= 1000) {
      fps = Math.round((fpsFrames * 1000) / (now - fpsStamp));
      fpsFrames = 0;
      fpsStamp = now;
    }
    schedule();
  }

  function start() {
    if (disposed || !draw) return;
    running = true;
    lastStamp = 0;
    fpsStamp = 0;
    schedule();
  }

  function pause() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function cssFallback() {
    mode = 'css';
    canvas.style.display = 'none';
    if (base.fallback === 'none') return;
    var parts = [];
    var list = palette.stops;
    for (var i = 0; i < list.length; i++) {
      parts.push(
        'rgb(' +
          Math.round(list[i][0] * 255) +
          ' ' +
          Math.round(list[i][1] * 255) +
          ' ' +
          Math.round(list[i][2] * 255) +
          ') ' +
          Math.round((i / (list.length - 1)) * 100) +
          '%'
      );
    }
    holder.style.background = 'linear-gradient(135deg,' + parts.join(',') + ')';
  }

  function onResize() {
    if (disposed) return;
    render();
    if (draw) schedule();
  }

  function onVisibility() {
    if (disposed || !(applied || base).pauseWhenHidden) return;
    if (document.hidden) pause();
    else start();
  }

  function resolveView() {
    var views = base.views || {};
    var names = Object.keys(views);
    if (!names.length) return null;
    if (base.theme && views[base.theme]) return base.theme;
    if (base.themeAttribute) {
      var declared = document.documentElement.getAttribute(base.themeAttribute);
      if (declared && views[declared]) return declared;
    }
    if (base.theme === null || base.theme === 'auto') {
      var system = systemTheme();
      if (views[system]) return system;
    }
    return names[0];
  }

  function goToView(name, fadeMs) {
    activeView = name;
    var next = effective(name);
    var duration = fadeMs === undefined ? base.themeFade : fadeMs;
    if (!draw || !duration || !applied) {
      fade = null;
      apply(next);
      render();
      return;
    }
    fade = { fromConfig: applied, toConfig: next.config, fromPalette: palette, toPalette: next.palette, start: performance.now(), duration: duration };
    if (!running && !still) start();
  }

  function set(patch) {
    base = normalize(merge(base, patch));
    if (activeView && base.views[activeView]) base.views[activeView] = merge(base.views[activeView], patch);
    var next = effective(activeView);
    fade = null;
    apply(next);
    var config = next.config;
    still = config.speed === 0 || (reduced && config.reducedMotion === 'still');
    if (still) {
      pause();
      render();
    } else {
      render();
      start();
    }
  }

  apply(effective(null));
  try {
    draw = engine.mount({ canvas: canvas, config: applied, palette: palette, log: log });
  } catch (error) {
    log('backdrops: ' + base.effect + ' failed - ' + (error && error.message));
    draw = null;
  }

  if (!draw) {
    cssFallback();
  } else {
    draw.setConfig(applied, palette);
    mode = engine.api === '2d' ? '2d' : 'canvas';
    if (reduced && base.reducedMotion === 'slow') {
      base = merge(base, { speed: base.speed * 0.15 });
    }
    still = applied.speed === 0 || (reduced && base.reducedMotion === 'still');
    render();
    if (base.autoplay) start();
  }

  var observer = null;
  if (base.themeAttribute && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(function () {
      if (disposed) return;
      var name = resolveView();
      if (name !== activeView) goToView(name);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [base.themeAttribute] });
  }

  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var onSystemTheme = function () {
    if (disposed) return;
    if (base.theme !== null && base.theme !== 'auto') return;
    var name = resolveView();
    if (name !== activeView) goToView(name);
  };
  if (media) {
    if (media.addEventListener) media.addEventListener('change', onSystemTheme);
    else if (media.addListener) media.addListener(onSystemTheme);
  }

  var onReducedChange = function () {
    if (disposed) return;
    reduced = base.reducedMotion === 'ignore' ? false : prefersReduced();
    set({});
  };
  var reducedMedia = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (reducedMedia) {
    if (reducedMedia.addEventListener) reducedMedia.addEventListener('change', onReducedChange);
    else if (reducedMedia.addListener) reducedMedia.addListener(onReducedChange);
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  activeView = resolveView();
  if (activeView) goToView(activeView, 0);

  var api = {
    el: holder,
    canvas: canvas,
    effect: base.effect,
    get mode() {
      return mode;
    },
    get running() {
      return running;
    },
    get config() {
      return applied || base;
    },
    get palette() {
      return palette;
    },
    set: function (patch) {
      set(patch);
      return api;
    },
    colors: function (list) {
      return api.set({ colors: list });
    },
    view: function (name, fadeMs) {
      goToView(name, fadeMs);
      return api;
    },
    play: function () {
      still = false;
      start();
      if (!running) render();
      return api;
    },
    pause: function () {
      pause();
      return api;
    },
    redraw: function () {
      render();
      return api;
    },
    stats: function () {
      return {
        effect: base.effect,
        mode: mode,
        fps: fps,
        frames: frames,
        quality: quality,
        still: still,
        reduced: reduced,
        view: activeView,
        size: { w: size.w, h: size.h, dpr: size.dpr },
        colors: palette.colors,
        logs: logs.slice()
      };
    },
    destroy: function () {
      if (disposed) return;
      disposed = true;
      pause();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) observer.disconnect();
      if (media && media.removeEventListener) media.removeEventListener('change', onSystemTheme);
      if (reducedMedia && reducedMedia.removeEventListener) reducedMedia.removeEventListener('change', onReducedChange);
      if (draw && draw.dispose) draw.dispose();
      draw = null;
      for (var i = 0; i < created.length; i++) {
        if (created[i] === el) continue;
        if (created[i].parentNode) created[i].parentNode.removeChild(created[i]);
      }
      if (el && el.__backdrops === api) delete el.__backdrops;
      if (pageMode) {
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
      }
      if (holder.style) holder.style.background = '';
    }
  };
  return api;
}

export function page(options) {
  return create('page', options);
}

export function autoMount(root) {
  var scope = root || document;
  var nodes = scope.querySelectorAll('[data-backdrop]');
  var mounted = [];
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].__backdrops) continue;
    var instance = create(nodes[i]);
    nodes[i].__backdrops = instance;
    mounted.push(instance);
  }
  return mounted;
}

export function ready() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      autoMount();
    });
    return null;
  }
  return autoMount();
}

export default {
  create: create,
  page: page,
  autoMount: autoMount,
  ready: ready,
  register: register,
  effects: effects,
  merge: merge,
  normalize: normalize,
  stopsOf: stopsOf,
  makePalette: makePalette,
  toRgb: toRgb,
  DEFAULTS: DEFAULTS,
  VERSION: VERSION
};
