import test from 'node:test';
import assert from 'node:assert/strict';
import { LIQUID } from '../src/engines/liquid.js';
import { GOO } from '../src/engines/goo.js';
import { AURORA } from '../src/engines/aurora.js';
import { makePalette, normalize } from '../src/backdrops.js';

function stubGradient() {
  return { addColorStop() {} };
}

function stubPattern() {
  return { setTransform() {} };
}

function stub2d(sink) {
  const context = {
    canvas: { width: 32, height: 32 },
    filter: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    createLinearGradient: () => stubGradient(),
    createRadialGradient: () => stubGradient(),
    createPattern: () => stubPattern(),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData() {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    clip() {},
    drawImage() {}
  };
  return new Proxy(context, {
    get(target, key) {
      if (key in target) return target[key];
      sink.calls.add(String(key));
      return () => {};
    }
  });
}

function stubGl() {
  const sink = { calls: new Set() };
  const gl = new Proxy(
    {
      COMPILE_STATUS: 1,
      LINK_STATUS: 1,
      FRAMEBUFFER: 1,
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 1,
      TEXTURE_2D: 1,
      ARRAY_BUFFER: 1,
      STATIC_DRAW: 1,
      FLOAT: 1,
      RGBA: 1,
      UNSIGNED_BYTE: 1,
      TRIANGLES: 1,
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 1,
      NEAREST: 1,
      LINEAR: 1,
      REPEAT: 1,
      CLAMP_TO_EDGE: 1,
      TEXTURE_MIN_FILTER: 1,
      TEXTURE_MAG_FILTER: 1,
      TEXTURE_WRAP_S: 1,
      TEXTURE_WRAP_T: 1,
      TEXTURE0: 1,
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createTexture: () => ({}),
      createFramebuffer: () => ({}),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getShaderInfoLog: () => '',
      getProgramInfoLog: () => '',
      getUniformLocation: () => ({}),
      getAttribLocation: () => 0,
      checkFramebufferStatus: () => 1
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        sink.calls.add(String(key));
        return () => {};
      }
    }
  );
  gl.__sink = sink;
  return gl;
}

const contexts = [];

function stubCanvas() {
  const canvas = {
    width: 32,
    height: 32,
    style: {},
    getContext(type) {
      if (type === 'webgl') {
        const gl = stubGl();
        contexts.push(gl);
        return gl;
      }
      const context = stub2d({ calls: new Set() });
      contexts.push(context);
      return context;
    },
    setAttribute() {},
    appendChild() {}
  };
  return canvas;
}

globalThis.document = { createElement: () => stubCanvas() };
globalThis.DOMMatrix = class {
  constructor() {}
};
globalThis.ImageData = class {
  constructor(w, h) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
};

const engines = [
  ['liquid', LIQUID],
  ['goo', GOO],
  ['aurora', AURORA]
];

for (const [name, engine] of engines) {
  test(name + ' mounts, resizes, redraws and disposes without a browser', () => {
    const canvas = stubCanvas();
    const config = normalize({ effect: name, ...engine.defaults });
    const palette = makePalette(config.colors);
    const logs = [];
    const instance = engine.mount({
      canvas,
      el: canvas,
      config,
      palette,
      log: (message) => logs.push(message)
    });
    assert.ok(instance, name + ' should mount');
    assert.equal(typeof instance.draw, 'function');
    assert.equal(typeof instance.setConfig, 'function');
    assert.deepEqual(logs, []);

    instance.resize({ w: 640, h: 360, dpr: 1 });
    instance.draw({ time: 0, delta: 0, frame: 0, still: false });
    instance.draw({ time: 1.4, delta: 0.016, frame: 1, still: false });
    instance.draw({ time: 9, delta: 0, frame: 2, still: true });

    instance.resize({ w: 320, h: 640, dpr: 2 });
    for (const patch of [
      { colors: ['#000000', '#ffffff'], debug: 'field' },
      { colors: ['#ff0066', '#00ffaa', '#224466'], seed: 0.5 },
      { speed: 0, dots: { on: false }, ribbons: 2, blobCount: 3 }
    ]) {
      const next = normalize({ effect: name, ...engine.defaults, ...patch });
      instance.setConfig(next, makePalette(next.colors));
      instance.draw({ time: 2.5, delta: 0.016, frame: 3, still: false });
    }

    instance.dispose();
    assert.ok(contexts.length > 0);
  });
}
