/* backdrops v0.1.0 - BSD-3-Clause - https://github.com/youare2stupid/backdrops */
export const LIQUID = {
  id: 'liquid',
  api: 'webgl',
  defaults: {
    scale: 2.25,
    speed: 1,
    contrast: 1.25,
    warp: 3,
    octaves: 4,
    grain: 0.85,
    debug: null,
    dots: { on: true, pitch: 3.2, size: 1.35, jitter: 0.5, base: 0.74, gain: 0.6, color: null, shade: 0.86 },
    fieldScale: 0.125,
    fieldMaxWidth: 256,
    fieldEvery: 2
  },
  mount: function (ctx) {
    var gl = ctx.canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) return null;

    var VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

    var FIELD_FRAG = [
      'precision highp float;',
      'uniform vec2 uRes;',
      'uniform float uTime;',
      'uniform float uScale;',
      'uniform float uContrast;',
      'uniform float uWarp;',
      'uniform float uOctaves;',
      'float hash21(vec2 p){',
      '  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.11;',
      '  p += dot(p, p.yx + 19.19);',
      '  return fract((p.x + p.y) * p.x);',
      '}',
      'float vnoise(vec2 x){',
      '  vec2 i = floor(x);',
      '  vec2 f = fract(x);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  float a = hash21(i);',
      '  float b = hash21(i + vec2(1.0, 0.0));',
      '  float c = hash21(i + vec2(0.0, 1.0));',
      '  float d = hash21(i + vec2(1.0, 1.0));',
      '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
      '}',
      'float fbm(vec2 p, float oct, float gain){',
      '  float s = 0.0;',
      '  float a = 1.0;',
      '  float norm = 0.0;',
      '  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
      '  for (int i = 0; i < 6; i++) {',
      '    if (float(i) > oct - 0.5) break;',
      '    s += a * vnoise(p);',
      '    norm += a;',
      '    p = m * p;',
      '    a *= gain;',
      '  }',
      '  return s / max(norm, 0.0001);',
      '}',
      'void main(){',
      '  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * uScale;',
      '  float t = uTime * 0.016;',
      '  vec2 q = vec2(fbm(p + vec2(0.3, 7.1) + t, uOctaves, 0.5), fbm(p + vec2(3.7, 1.3) - t, uOctaves, 0.5));',
      '  vec2 r = vec2(fbm(p + uWarp * q + vec2(1.7, 9.2) + 0.6 * t, uOctaves, 0.5),',
      '                fbm(p + uWarp * q + vec2(8.3, 2.8) - 0.5 * t, uOctaves, 0.5));',
      '  float f = fbm(p + 0.867 * uWarp * r, uOctaves, 0.5);',
      '  float n = clamp(0.5 + (f - 0.5) * uContrast, 0.0, 1.0);',
      '  gl_FragColor = vec4(n, n, n, 1.0);',
      '}'
    ].join('\n');

    var MAIN_FRAG = [
      'precision highp float;',
      'uniform vec2 uRes;',
      'uniform float uTime;',
      'uniform float uDpr;',
      'uniform sampler2D uField;',
      'uniform vec3 uStops[8];',
      'uniform float uStopCount;',
      'uniform sampler2D uCells;',
      'uniform float uCellTile;',
      'uniform float uSeed;',
      'uniform float uPitch;',
      'uniform float uDots;',
      'uniform float uDotSize;',
      'uniform float uDotJitter;',
      'uniform float uDotBase;',
      'uniform float uDotGain;',
      'uniform vec3 uDotColor;',
      'uniform float uGrain;',
      'uniform float uDebug;',
      'float hash21(vec2 p){',
      '  p = fract(p * vec2(0.3183099, 0.3678794)) + 0.11;',
      '  p += dot(p, p.yx + 19.19);',
      '  return fract((p.x + p.y) * p.x);',
      '}',
      'vec3 ramp(float x){',
      '  float t = clamp(x, 0.0, 1.0) * (uStopCount - 1.0);',
      '  vec3 col = uStops[0];',
      '  for (int k = 1; k < 8; k++) {',
      '    float weight = clamp(t - float(k - 1), 0.0, 1.0);',
      '    if (float(k) > uStopCount - 0.5) weight = 0.0;',
      '    col = mix(col, uStops[k], weight);',
      '  }',
      '  return col;',
      '}',
      'void main(){',
      '  vec2 frag = gl_FragCoord.xy;',
      '  float n = texture2D(uField, frag / uRes).r;',
      '  vec3 col = ramp(n);',
      '  if (uDebug > 0.5) { gl_FragColor = vec4(vec3(n), 1.0); return; }',
      '  float pitch = max(uPitch, 1.0) * uDpr;',
      '  vec2 gp = frag / pitch;',
      '  gp.x += mod(floor(gp.y), 2.0) * 0.5;',
      '  vec2 cell = floor(gp);',
      '  vec2 cellPos = fract((cell + uSeed * 37.0) / uCellTile) * uCellTile;',
      '  vec4 cp = texture2D(uCells, (floor(cellPos) + 0.5) / uCellTile);',
      '  float amt = clamp(uDotBase + (0.52 - n) * uDotGain, 0.0, 1.0);',
      '  float unit = pitch / 3.2;',
      '  vec2 rel = (fract(gp) - 0.5) * pitch;',
      '  rel += (cp.yz - 0.5) * 0.5 * unit * uDotJitter;',
      '  float rad = (0.52 + 0.42 * cp.w) * unit * uDotSize;',
      '  float dm = 1.0 - smoothstep(rad * 0.55, rad * 1.35, length(rel));',
      '  col = mix(col, uDotColor, amt * dm * uDots);',
      '  float g = hash21(frag + floor(uTime * 14.0) * 53.7) - 0.5;',
      '  float gs = hash21(frag * 0.71 + 11.3) - 0.5;',
      '  col += (g * 0.028 + gs * 0.016) * uGrain;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        ctx.log('liquid: shader failed - ' + gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    function build(fragSrc, names) {
      var vs = compile(gl.VERTEX_SHADER, VERT);
      var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
      if (!vs || !fs) return null;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        ctx.log('liquid: link failed - ' + gl.getProgramInfoLog(prog));
        return null;
      }
      var loc = {};
      for (var i = 0; i < names.length; i++) loc[names[i]] = gl.getUniformLocation(prog, names[i]);
      return { program: prog, loc: loc };
    }

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var field = build(FIELD_FRAG, ['uRes', 'uTime', 'uScale', 'uContrast', 'uWarp', 'uOctaves']);
    var main = build(MAIN_FRAG, ['uRes', 'uTime', 'uDpr', 'uField', 'uStops', 'uStopCount', 'uCells', 'uCellTile', 'uSeed', 'uPitch', 'uDots', 'uDotSize', 'uDotJitter', 'uDotBase', 'uDotGain', 'uDotColor', 'uGrain', 'uDebug']);
    if (!field || !main) return null;

    var cells = gl.createTexture();
    var tile = 128;
    var data = new Uint8Array(tile * tile * 4);
    var s = 20240419;
    for (var i = 0; i < data.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = Math.floor((s / 0x7fffffff) * 256);
    }
    gl.bindTexture(gl.TEXTURE_2D, cells);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tile, tile, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    var fieldTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    function bindQuad(prog) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      var aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }

    var fw = 0;
    var fh = 0;
    var config = null;
    var palette = null;

    function toRgbPair(value, fallback) {
      if (!value) return fallback;
      if (Array.isArray(value)) return value.slice(0, 3).map(Number);
      var hex = String(value).replace('#', '');
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var int = parseInt(hex.slice(0, 6), 16);
      if (isNaN(int)) return fallback;
      return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
    }
    var dotColor = [0, 0, 0];
    var stopData = new Float32Array(24);
    var stopCount = 2;
    var size = { w: 2, h: 2, dpr: 1 };
    var frame = 0;

    function uploadStops(pal) {
      var stops = pal.stops;
      var count = Math.min(8, stops.length);
      for (var i = 0; i < 8; i++) {
        var source = stops[Math.min(i, count - 1)];
        stopData[i * 3] = source[0];
        stopData[i * 3 + 1] = source[1];
        stopData[i * 3 + 2] = source[2];
      }
      stopCount = count;
    }

    return {
      draw: function (state) {
        if (!config) return;
        if (++frame % Math.max(1, Math.round(config.fieldEvery)) === 1 || config.fieldEvery <= 1) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.viewport(0, 0, fw, fh);
          gl.useProgram(field.program);
          bindQuad(field.program);
          gl.uniform2f(field.loc.uRes, fw, fh);
          gl.uniform1f(field.loc.uTime, state.time * config.speed);
          gl.uniform1f(field.loc.uScale, config.scale);
          gl.uniform1f(field.loc.uContrast, config.contrast);
          gl.uniform1f(field.loc.uWarp, config.warp);
          gl.uniform1f(field.loc.uOctaves, config.octaves);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, size.w, size.h);
        gl.useProgram(main.program);
        bindQuad(main.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fieldTex);
        gl.uniform1i(main.loc.uField, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, cells);
        gl.uniform1i(main.loc.uCells, 1);
        gl.uniform3fv(main.loc.uStops, stopData);
        gl.uniform1f(main.loc.uStopCount, stopCount);
        gl.uniform1f(main.loc.uCellTile, tile);
        gl.uniform2f(main.loc.uRes, size.w, size.h);
        gl.uniform1f(main.loc.uTime, state.time * config.speed);
        gl.uniform1f(main.loc.uDpr, size.dpr);
        gl.uniform1f(main.loc.uSeed, config.seed);
        gl.uniform1f(main.loc.uPitch, config.dots.pitch);
        gl.uniform1f(main.loc.uDots, config.dots.on ? 1 : 0);
        gl.uniform1f(main.loc.uDotSize, config.dots.size);
        gl.uniform1f(main.loc.uDotJitter, config.dots.jitter);
        gl.uniform1f(main.loc.uDotBase, config.dots.base);
        gl.uniform1f(main.loc.uDotGain, config.dots.gain);
        gl.uniform3fv(main.loc.uDotColor, dotColor);
        gl.uniform1f(main.loc.uGrain, config.grain);
        gl.uniform1f(main.loc.uDebug, config.debug === 'field' ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      resize: function (next) {
        size = next;
        var f = Math.max(2, Math.min(config ? config.fieldMaxWidth : 256, Math.round(size.w * (config ? config.fieldScale : 0.125))));
        var h = Math.max(2, Math.round((f * size.h) / Math.max(1, size.w)));
        if (f !== fw || h !== fh) {
          fw = f;
          fh = h;
          gl.bindTexture(gl.TEXTURE_2D, fieldTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
      },
      setConfig: function (next, pal) {
        config = next;
        palette = pal;
        var base = config.dots.color ? toRgbPair(config.dots.color, pal.stops[0]) : pal.darkest;
        var shade = config.dots.shade;
        dotColor = [base[0] * shade, base[1] * shade, base[2] * shade];
        uploadStops(pal);
      },
      dispose: function () {
        gl.deleteBuffer(quad);
        gl.deleteTexture(cells);
        gl.deleteTexture(fieldTex);
        gl.deleteFramebuffer(fbo);
        gl.deleteProgram(field.program);
        gl.deleteProgram(main.program);
      }
    };
  }
};

export const GOO = {
  id: 'goo',
  api: '2d',
  defaults: {
    speed: 1,
    blobCount: 18,
    blobSize: 0.16,
    spread: 0.55,
    wobble: 0.45,
    softness: 0.2,
    blur: 24,
    threshold: 10,
    background: null,
    grain: 0.35,
    seed: 0,
    renderScale: 0.6,
    debug: null
  },
  mount: function (ctx) {
    var canvas = ctx.canvas;
    var out = canvas.getContext('2d', { alpha: false });
    if (!out) return null;
    var layer = document.createElement('canvas');
    var stage = layer.getContext('2d');
    if (!stage) return null;
    var hasFilter = 'filter' in out && 'filter' in stage;

    var config = null;
    var palette = null;
    var stops = [];
    var backgroundCss = '#000';
    var size = { w: 2, h: 2, dpr: 1 };
    var lw = 2;
    var lh = 2;
    var blobs = [];
    var grainTile = null;
    var grainSource = null;
    var seedUsed = null;

    function mulberry(seed) {
      var state = (seed * 4294967296) % 4294967296;
      return function () {
        state = (state + 0x6d2b79f5) % 4294967296;
        var t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function build() {
      var random = mulberry((config.seed % 1) + 1.7);
      var count = Math.max(1, Math.round(config.blobCount));
      blobs = [];
      for (var i = 0; i < count; i++) {
        blobs.push({
          ax: random(),
          ay: random(),
          speedX: 0.12 + random() * 0.3,
          speedY: 0.1 + random() * 0.28,
          phaseX: random() * Math.PI * 2,
          phaseY: random() * Math.PI * 2,
          size: 0.6 + random() * 0.8,
          orbit: 0.1 + random() * 0.3,
          pulse: random(),
          color: random()
        });
      }
      buildGrain();
    }

    function buildGrain() {
      grainTile = null;
      grainSource = null;
      if (!config.grain) return;
      var tile = 128;
      grainTile = document.createElement('canvas');
      grainTile.width = tile;
      grainTile.height = tile;
      var g = grainTile.getContext('2d');
      var image = g.createImageData(tile, tile);
      var random = mulberry((config.seed % 1) + 9.13);
      for (var i = 0; i < image.data.length; i += 4) {
        var value = random() * 255;
        image.data[i] = value;
        image.data[i + 1] = value;
        image.data[i + 2] = value;
        image.data[i + 3] = 42 + random() * 46;
      }
      g.putImageData(image, 0, 0);
      grainSource = grainTile;
      seedUsed = config.seed;
    }

    function css(rgb) {
      return 'rgb(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ')';
    }

    function resize(next) {
      size = next;
      lw = Math.max(2, Math.round(size.w * config.renderScale));
      lh = Math.max(2, Math.round(size.h * config.renderScale));
      if (layer.width !== lw || layer.height !== lh) {
        layer.width = lw;
        layer.height = lh;
      }
    }

    function draw(state) {
      if (!config || !stops.length) return;
      var t = state.time * config.speed;
      var unit = Math.min(lw, lh);
      var radius = 0;
      var i;

      stage.setTransform(1, 0, 0, 1, 0, 0);
      stage.filter = 'none';
      stage.globalCompositeOperation = 'source-over';
      stage.globalAlpha = 1;
      stage.fillStyle = backgroundCss;
      stage.fillRect(0, 0, lw, lh);

      stage.globalCompositeOperation = 'source-over';
      for (i = 0; i < blobs.length; i++) {
        var blob = blobs[i];
        var x = lw * (0.5 + (blob.ax - 0.5) * config.spread * 1.6 + Math.cos(t * blob.speedX * 6.283 + blob.phaseX) * blob.orbit * config.spread * 1.5);
        var y = lh * (0.5 + (blob.ay - 0.5) * config.spread * 1.6 + Math.sin(t * blob.speedY * 6.283 + blob.phaseY) * blob.orbit * config.spread * 1.5);
        radius = unit * config.blobSize * blob.size * (1 + Math.sin(t * (0.4 + blob.pulse) * 6.283 + blob.phaseX) * config.wobble * 0.22);
        if (radius < 1) continue;
        stage.fillStyle = css(stops[Math.min(stops.length - 1, Math.round((0.3 + blob.color * 0.7) * (stops.length - 1)))]);
        stage.beginPath();
        stage.arc(x, y, radius, 0, Math.PI * 2);
        stage.fill();
        if (config.softness > 0) {
          stage.globalAlpha = 1 - config.softness;
          stage.beginPath();
          stage.arc(x, y, radius * (0.55 + config.softness * 0.45), 0, Math.PI * 2);
          stage.fill();
          stage.globalAlpha = 1;
        }
      }

      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalCompositeOperation = 'source-over';
      out.globalAlpha = 1;
      out.filter = 'none';
      if (hasFilter && config.debug !== 'raw') {
        out.filter = 'blur(' + (config.blur * size.dpr).toFixed(2) + 'px) contrast(' + config.threshold.toFixed(2) + ')';
      }
      out.drawImage(layer, 0, 0, lw, lh, 0, 0, size.w, size.h);
      out.filter = 'none';

      if (grainSource && config.grain > 0) {
        if (seedUsed !== config.seed) buildGrain();
        var pattern = out.createPattern(grainSource, 'repeat');
        if (pattern) {
          var random = mulberry((state.frame % 12) + 0.37);
          pattern.setTransform(new DOMMatrix([1, 0, 0, 1, random() * 128 - 64, random() * 128 - 64]));
          out.globalCompositeOperation = 'overlay';
          out.globalAlpha = Math.min(1, config.grain);
          out.fillStyle = pattern;
          out.fillRect(0, 0, size.w, size.h);
          out.globalAlpha = 1;
          out.globalCompositeOperation = 'source-over';
        }
      }
    }

    return {
      draw: draw,
      resize: resize,
      setConfig: function (next, pal) {
        config = next;
        palette = pal;
        stops = pal.stops;
        backgroundCss = config.background ? config.background : css(pal.darkest);
        if (seedUsed !== config.seed || !blobs.length) build();
        else buildGrain();
      },
      dispose: function () {
        stage.setTransform(1, 0, 0, 1, 0, 0);
        stage.clearRect(0, 0, lw, lh);
        blobs = [];
        grainTile = null;
        grainSource = null;
      }
    };
  }
};

export const GRID = {
  id: 'grid',
  api: '2d',
  defaults: {
    speed: 1,
    horizon: 0.62,
    spacing: 78,
    depth: 30,
    vertical: 13,
    lineWidth: 2,
    glow: 0.85,
    fade: 0.55,
    horizonGlow: 0.6,
    sun: 0.55,
    sunSize: 0.24,
    scanlines: 0.25,
    sway: 0.35,
    background: null,
    renderScale: 1,
    debug: null
  },
  mount: function (ctx) {
    var canvas = ctx.canvas;
    var out = canvas.getContext('2d', { alpha: false });
    if (!out) return null;

    var config = null;
    var palette = null;
    var stops = [];
    var backgroundCss = '#000';
    var lineGradient = null;
    var brightCss = '#fff';
    var midCss = '#888';
    var size = { w: 2, h: 2, dpr: 1 };
    var scale = 1;
    var scroll = 0;
    var lastFrame = -1;

    function css(rgb, alpha) {
      var base = Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255);
      return alpha === undefined ? 'rgb(' + base + ')' : 'rgba(' + base + ',' + alpha + ')';
    }

    function pick(t) {
      return stops[Math.max(0, Math.min(stops.length - 1, Math.round(t * (stops.length - 1))))];
    }

    function prepare() {
      brightCss = css(pick(1));
      midCss = css(pick(0.6));
      backgroundCss = config.background || css(palette.darkest);
      lineGradient = null;
    }

    function draw(state) {
      if (!config || !stops.length) return;
      var w = size.w;
      var h = size.h;
      var dpr = size.dpr;
      var horizonY = h * config.horizon;
      var span = Math.max(1, h - horizonY);
      var cx = w * 0.5;
      var time = state.time * config.speed;

      if (state.frame !== lastFrame && !state.still) {
        lastFrame = state.frame;
      }
      scroll = time * 0.6;

      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalCompositeOperation = 'source-over';
      out.globalAlpha = 1;
      out.shadowBlur = 0;
      out.fillStyle = backgroundCss;
      out.fillRect(0, 0, w, h);

      if (!lineGradient) {
        lineGradient = out.createLinearGradient(0, horizonY, 0, h);
        lineGradient.addColorStop(0, midCss);
        lineGradient.addColorStop(0.45, css(pick(0.8)));
        lineGradient.addColorStop(1, brightCss);
      }

      if (config.horizonGlow > 0) {
        var band = span * 0.5;
        var glowGradient = out.createLinearGradient(0, horizonY - band * 0.6, 0, horizonY + band);
        glowGradient.addColorStop(0, css(pick(0.9), 0));
        glowGradient.addColorStop(0.55, css(pick(0.9), 0.55 * config.horizonGlow));
        glowGradient.addColorStop(1, css(pick(0.9), 0));
        out.globalCompositeOperation = 'lighter';
        out.fillStyle = glowGradient;
        out.fillRect(0, horizonY - band * 0.6, w, band * 1.6);
        out.globalCompositeOperation = 'source-over';
      }

      if (config.sun > 0) {
        var radius = Math.max(4, config.sunSize * h * 0.5);
        var sunY = horizonY - radius * 0.42;
        out.save();
        out.beginPath();
        out.arc(cx, sunY, radius, Math.PI, Math.PI * 2);
        out.closePath();
        out.clip();
        var sunGradient = out.createLinearGradient(0, sunY - radius, 0, sunY);
        sunGradient.addColorStop(0, css(pick(0.85), 0.95 * config.sun));
        sunGradient.addColorStop(1, css(pick(0.45), 0.85 * config.sun));
        out.fillStyle = sunGradient;
        out.fillRect(cx - radius, sunY - radius, radius * 2, radius);
        out.fillStyle = backgroundCss;
        var bands = 7;
        for (var band_ = 0; band_ < bands; band_++) {
          var cut = radius * 0.06 + (band_ / bands) * (band_ / bands) * radius * 0.36;
          var y = sunY - radius * 0.42 + (band_ / bands) * radius * 0.42;
          out.fillRect(cx - radius, y, radius * 2, cut * 0.5);
        }
        out.restore();
      }

      out.lineCap = 'round';
      out.lineWidth = Math.max(1, config.lineWidth * dpr);
      out.strokeStyle = lineGradient;
      if (config.glow > 0) {
        out.shadowColor = css(pick(0.9), 0.95);
        out.shadowBlur = config.glow * 22 * dpr;
      }

      var sway = config.sway;
      var count = Math.max(0, Math.round(config.vertical));
      if (count > 0) {
        out.beginPath();
        for (var k = -count; k <= count; k++) {
          var u = k / count;
          var bottomX = cx + u * w * 0.95 + Math.sin(time * 0.35 + u * 2.4) * w * 0.035 * sway;
          var topX = cx + u * w * 0.04;
          out.moveTo(bottomX, h + 2);
          out.lineTo(topX, horizonY);
        }
        out.stroke();
      }

      var phase = scroll % 1;
      var compress = Math.max(0.5, Math.min(8, config.spacing / 30));
      for (var i = 0; i < config.depth; i++) {
        var d = i - phase;
        if (d < 0) continue;
        var t = compress / (d + compress);
        var y = horizonY + span * t;
        out.globalAlpha = Math.max(0, Math.min(1, 1 - config.fade * (1 - t)));
        out.beginPath();
        out.moveTo(0, y);
        out.lineTo(w, y);
        out.stroke();
      }
      out.globalAlpha = 1;
      out.shadowBlur = 0;

      if (config.scanlines > 0) {
        var step = Math.max(2, Math.round(3 * dpr));
        out.globalAlpha = Math.min(1, config.scanlines) * 0.4;
        out.fillStyle = '#000';
        for (var y2 = 0; y2 < h; y2 += step) out.fillRect(0, y2, w, 1);
        out.globalAlpha = 1;
      }

      if (config.debug === 'lines') {
        out.globalAlpha = 0.25;
        out.fillStyle = '#fff';
        out.fillRect(0, horizonY - 1, w, 2);
        out.globalAlpha = 1;
      }
    }

    return {
      draw: draw,
      resize: function (next) {
        size = next;
        scale = config ? config.renderScale : 1;
        if (scale < 1) {
          out.setTransform(scale, 0, 0, scale, 0, 0);
          size = { w: Math.round(next.w / scale), h: Math.round(next.h / scale), dpr: next.dpr * scale };
        }
      },
      setConfig: function (next, pal) {
        config = next;
        palette = pal;
        stops = pal.stops;
        lineGradient = null;
        prepare();
      },
      dispose: function () {
        out.setTransform(1, 0, 0, 1, 0, 0);
        out.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }
};

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

var registry = { liquid: LIQUID, goo: GOO, grid: GRID };

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
    var delta = 0;
    if (lastStamp) {
      delta = Math.min(0.1, (now - lastStamp) / 1000);
      time += delta;
    }
    lastStamp = now;
    stepFade(now);
    draw.resize(measure());
    draw.draw({ time: still ? (applied || base).stillFrame : time, delta: delta, frame: frames, still: still });
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
