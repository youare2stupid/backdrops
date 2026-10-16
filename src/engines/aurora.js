export const AURORA = {
  id: 'aurora',
  api: '2d',
  defaults: {
    speed: 1,
    fps: 30,
    ribbons: 5,
    ribbonWidth: 0.34,
    amplitude: 0.16,
    frequency: 0.55,
    base: 0.3,
    spread: 0.42,
    blur: 14,
    striation: 0.75,
    maxPixels: 650000,
    glow: 1,
    stars: 90,
    starSize: 1.6,
    twinkle: 0.35,
    background: null,
    layerScale: 0.45,
    seed: 0,
    debug: null
  },
  mount: function (ctx) {
    var canvas = ctx.canvas;
    var out = canvas.getContext('2d', { alpha: false });
    if (!out) return null;
    var layer = document.createElement('canvas');
    var lc = layer.getContext('2d');
    var soft = document.createElement('canvas');
    var sc = soft.getContext('2d');
    var sky = document.createElement('canvas');
    var skyc = sky.getContext('2d');
    if (!lc || !sc || !skyc) return null;
    var hasFilter = 'filter' in out;

    var config = null;
    var palette = null;
    var stops = [];
    var backgroundCss = '#000';
    var size = { w: 2, h: 2, dpr: 1 };
    var lw = 2;
    var lh = 2;
    var ribbons = [];
    var stars = [];
    var gradients = [];
    var patternA = null;
    var patternB = null;
    var skyKey = '';
    var seedUsed = null;
    var signature = '';

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

    function rgb(value, alpha) {
      var base = Math.round(value[0] * 255) + ',' + Math.round(value[1] * 255) + ',' + Math.round(value[2] * 255);
      return alpha === undefined ? 'rgb(' + base + ')' : 'rgba(' + base + ',' + alpha + ')';
    }

    function pick(t) {
      return stops[Math.max(0, Math.min(stops.length - 1, Math.round(t * (stops.length - 1))))];
    }

    function buildStriation() {
      var random = mulberry((config.seed % 1) + 7.7);
      var width = 160;
      var tile = document.createElement('canvas');
      tile.width = width;
      tile.height = 1;
      var tc = tile.getContext('2d');
      var profile = new Float32Array(width);
      var i;
      for (i = 0; i < width; i++) profile[i] = random();
      for (var pass = 0; pass < 3; pass++) {
        var smooth = new Float32Array(width);
        for (i = 0; i < width; i++) {
          smooth[i] = (profile[(i + width - 1) % width] + profile[i] * 2 + profile[(i + 1) % width]) / 4;
        }
        profile = smooth;
      }
      var image = tc.createImageData(width, 1);
      for (i = 0; i < width; i++) {
        var value = Math.max(0, Math.min(255, Math.round(profile[i] * 255)));
        image.data[i * 4] = value;
        image.data[i * 4 + 1] = value;
        image.data[i * 4 + 2] = value;
        image.data[i * 4 + 3] = value;
      }
      tc.putImageData(image, 0, 0);
      patternA = lc.createPattern(tile, 'repeat');
      patternB = lc.createPattern(tile, 'repeat');
      if (patternA) {
        patternA.setTransform(new DOMMatrix([1 + config.striation * 0.6, 0, 0, 1, 0, 0]));
        patternB.setTransform(new DOMMatrix([0.6, 0, 0.35, 1, 37, 0]));
      }
    }

    function build() {
      var random = mulberry((config.seed % 1) + 3.3);
      var count = Math.max(1, Math.round(config.ribbons));
      ribbons = [];
      var i;
      for (i = 0; i < count; i++) {
        ribbons.push({
          offset: i / count + (random() - 0.5) * 0.16,
          width: 0.55 + random() * 0.9,
          speed: 0.16 + random() * 0.26,
          swing: 0.6 + random() * 0.9,
          phase: random() * Math.PI * 2,
          drift: random() * Math.PI * 2,
          tone: 0.55 + random() * 0.45
        });
      }
      ribbons.sort(function (a, b) {
        return a.tone - b.tone;
      });
      var starCount = Math.max(0, Math.round(config.stars));
      stars = [];
      for (i = 0; i < starCount; i++) {
        stars.push({ x: random(), y: random() * 0.85, size: 0.4 + random() * 1.2, tone: random() * 0.6 + 0.4 });
      }
      buildStriation();
      layout();
      seedUsed = config.seed;
      skyKey = '';
    }

    function layout() {
      gradients = [];
      for (var i = 0; i < ribbons.length; i++) {
        var ribbon = ribbons[i];
        var centerY = lh * (config.base + (ribbon.offset - 0.5) * config.spread * 2);
        var halfWidth = Math.max(2, lh * config.ribbonWidth * ribbon.width * 0.5);
        var tone = pick(ribbon.tone);
        var gradient = lc.createLinearGradient(0, centerY - halfWidth, 0, centerY + halfWidth);
        gradient.addColorStop(0, rgb(tone, 0));
        gradient.addColorStop(0.28, rgb(tone, 0.72 * config.glow));
        gradient.addColorStop(0.55, rgb(tone, 0.5 * config.glow));
        gradient.addColorStop(0.82, rgb(tone, 0.22 * config.glow));
        gradient.addColorStop(1, rgb(tone, 0));
        gradients.push(gradient);
        ribbon.centerY = centerY;
        ribbon.halfWidth = halfWidth;
        ribbon.swingPixels = lh * config.amplitude * ribbon.swing;
      }
      gradients.ready = true;
    }

    function buildSky() {
      var key = stars.length + '|' + size.w + 'x' + size.h + '|' + stops.length + '|' + palette.colors.join(',');
      if (key === skyKey) return;
      skyKey = key;
      sky.width = Math.max(1, size.w);
      sky.height = Math.max(1, size.h);
      skyc.setTransform(1, 0, 0, 1, 0, 0);
      skyc.clearRect(0, 0, sky.width, sky.height);
      skyc.globalCompositeOperation = 'lighter';
      for (var i = 0; i < stars.length; i++) {
        var star = stars[i];
        skyc.fillStyle = rgb(pick(star.tone));
        skyc.beginPath();
        skyc.arc(star.x * sky.width, star.y * sky.height, Math.max(0.3, star.size * config.starSize * size.dpr * 0.5), 0, Math.PI * 2);
        skyc.fill();
      }
    }

    function drawRibbons(time) {
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      lc.clearRect(0, 0, lw, lh);
      lc.globalCompositeOperation = 'lighter';
      var step = Math.max(6, Math.round(lw / 90));
      var x;
      for (var i = 0; i < ribbons.length; i++) {
        var ribbon = ribbons[i];
        if (!gradients[i]) continue;
        lc.fillStyle = gradients[i];
        lc.beginPath();
        var first = true;
        for (x = 0; x <= lw + step; x += step) {
          var u = x / lw;
          var wave =
            Math.sin(u * config.frequency * 12.566 + time * ribbon.speed * 2 + ribbon.phase) * ribbon.swingPixels +
            Math.sin(u * config.frequency * 3.4 - time * ribbon.speed * 1.3 + ribbon.drift) * ribbon.swingPixels * 0.45;
          var y = ribbon.centerY + wave - ribbon.halfWidth;
          if (first) {
            lc.moveTo(x, y);
            first = false;
          } else {
            lc.lineTo(x, y);
          }
        }
        for (x = lw + step; x >= 0; x -= step) {
          var u2 = x / lw;
          var wave2 =
            Math.sin(u2 * config.frequency * 12.566 + time * ribbon.speed * 2 + ribbon.phase) * ribbon.swingPixels +
            Math.sin(u2 * config.frequency * 3.4 - time * ribbon.speed * 1.3 + ribbon.drift) * ribbon.swingPixels * 0.45;
          lc.lineTo(x, ribbon.centerY + wave2 + ribbon.halfWidth * 0.85);
        }
        lc.closePath();
        lc.fill();
      }
      if (config.striation > 0 && patternA) {
        lc.globalCompositeOperation = 'destination-out';
        lc.fillStyle = patternA;
        lc.globalAlpha = Math.min(1, config.striation) * 0.55;
        lc.fillRect(0, 0, lw, lh);
        lc.globalAlpha = 1;
      }
      lc.globalCompositeOperation = 'source-over';
    }

    return {
      draw: function (state) {
        if (!config || !stops.length || !gradients.ready) return;
        var time = state.time * config.speed;
        out.setTransform(1, 0, 0, 1, 0, 0);
        out.globalCompositeOperation = 'source-over';
        out.globalAlpha = 1;
        out.filter = 'none';
        out.fillStyle = backgroundCss;
        out.fillRect(0, 0, size.w, size.h);

        buildSky();
        out.globalCompositeOperation = 'lighter';
        out.globalAlpha = 1 - config.twinkle * 0.5 + config.twinkle * 0.5 * (0.5 + 0.5 * Math.sin(time * 0.9));
        out.drawImage(sky, 0, 0);
        out.globalAlpha = 1;

        drawRibbons(time);

        if (hasFilter && config.blur > 0 && config.debug !== 'raw') {
          var radius = config.blur * size.dpr * config.layerScale;
          sc.setTransform(1, 0, 0, 1, 0, 0);
          sc.globalCompositeOperation = 'source-over';
          sc.clearRect(0, 0, lw, lh);
          sc.filter = 'blur(' + radius.toFixed(2) + 'px)';
          sc.drawImage(layer, 0, 0);
          sc.filter = 'none';
          out.drawImage(soft, 0, 0, lw, lh, 0, 0, size.w, size.h);
        } else {
          out.drawImage(layer, 0, 0, lw, lh, 0, 0, size.w, size.h);
        }
        out.globalCompositeOperation = 'source-over';
      },
      resize: function (next) {
        size = next;
        if (!config) return;
        lw = Math.max(2, Math.round(size.w * config.layerScale));
        lh = Math.max(2, Math.round(size.h * config.layerScale));
        if (layer.width !== lw || layer.height !== lh) {
          layer.width = lw;
          layer.height = lh;
          soft.width = lw;
          soft.height = lh;
          layout();
          skyKey = '';
        }
      },
      setConfig: function (next, pal) {
        config = next;
        palette = pal;
        stops = pal.stops;
        backgroundCss = config.background ? config.background : rgb(pal.darkest);
        var key = lw + 'x' + lh + '|' + config.ribbons + '|' + config.ribbonWidth + '|' + config.spread + '|' + config.base + '|' + config.amplitude + '|' + config.glow;
        if (seedUsed !== config.seed || !ribbons.length) build();
        else if (key !== signature) layout();
        signature = key;
        skyKey = '';
      },
      dispose: function () {
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.clearRect(0, 0, lw, lh);
        sc.clearRect(0, 0, lw, lh);
        ribbons = [];
        stars = [];
        gradients = [];
        patternA = null;
        patternB = null;
      }
    };
  }
};
