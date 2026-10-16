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
