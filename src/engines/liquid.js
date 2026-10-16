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
    var lastTime = 0;

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
        var jump = Math.abs(state.time - lastTime) > 0.5;
        lastTime = state.time;
        if (jump || ++frame % Math.max(1, Math.round(config.fieldEvery)) === 1 || config.fieldEvery <= 1) {
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
