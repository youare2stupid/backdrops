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
