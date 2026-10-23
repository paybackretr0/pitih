/**
 * Draws the PITIH app icon set from primitives, so the assets can be rebuilt
 * without a design tool. Run: node scripts/generate-icons.js
 *
 * The mark is a thick P on a yellow tile with the app's hard black shadow.
 */
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const OUT = path.resolve("assets", "images");
const SS = 4;
const W = 1024;

const CREAM = [255, 244, 224, 255];
const YELLOW = [255, 217, 61, 255];
const INK = [17, 17, 17, 255];
const CLEAR = [0, 0, 0, 0];
const WHITE = [255, 255, 255, 255];

// P built from four bars: stem, top, bowl side, bowl bottom.
const P_BARS = [
  [340, 300, 80, 444],
  [340, 300, 320, 80],
  [580, 300, 80, 260],
  [340, 480, 320, 80],
];

function canvas(size, color) {
  const png = new PNG({ width: size, height: size });
  fillRect(png, 0, 0, size, size, color);
  return png;
}

function fillRect(png, x, y, w, h, color) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(png.width, Math.round(x + w));
  const y1 = Math.min(png.height, Math.round(y + h));
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const index = (py * png.width + px) * 4;
      png.data[index] = color[0];
      png.data[index + 1] = color[1];
      png.data[index + 2] = color[2];
      png.data[index + 3] = color[3];
    }
  }
}

function strokeRect(png, x, y, w, h, thickness, color) {
  fillRect(png, x, y, w, thickness, color);
  fillRect(png, x, y + h - thickness, w, thickness, color);
  fillRect(png, x, y, thickness, h, color);
  fillRect(png, x + w - thickness, y, thickness, h, color);
}

/** Draws the tile, shadow, and P in design units (1024 canvas). */
function drawMark(png, scale, originX, originY, options = {}) {
  const { shadow = true, tile = true, color = INK } = options;
  const sx = (x) => originX + x * scale;
  const sy = (y) => originY + y * scale;

  if (shadow) fillRect(png, sx(232), sy(232), 640 * scale, 640 * scale, INK);
  if (tile) {
    fillRect(png, sx(192), sy(192), 640 * scale, 640 * scale, YELLOW);
    strokeRect(
      png,
      sx(192),
      sy(192),
      640 * scale,
      640 * scale,
      24 * scale,
      INK,
    );
  }

  for (const [x, y, w, h] of P_BARS) {
    fillRect(png, sx(x), sy(y), w * scale, h * scale, color);
  }
}

/** Box filter at SS x SS, premultiplied so transparent edges stay clean. */
function downsample(source, size) {
  const png = new PNG({ width: size, height: size });
  const block = SS;
  const area = block * block;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let by = 0; by < block; by += 1) {
        for (let bx = 0; bx < block; bx += 1) {
          const index =
            ((y * block + by) * source.width + (x * block + bx)) * 4;
          const alpha = source.data[index + 3] / 255;
          r += source.data[index] * alpha;
          g += source.data[index + 1] * alpha;
          b += source.data[index + 2] * alpha;
          a += alpha;
        }
      }
      const index = (y * size + x) * 4;
      const alpha = a / area;
      if (alpha === 0) {
        png.data[index] = 0;
        png.data[index + 1] = 0;
        png.data[index + 2] = 0;
        png.data[index + 3] = 0;
      } else {
        png.data[index] = Math.round(r / a);
        png.data[index + 1] = Math.round(g / a);
        png.data[index + 2] = Math.round(b / a);
        png.data[index + 3] = Math.round(alpha * 255);
      }
    }
  }
  return png;
}

function save(name, png) {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log(`wrote assets/images/${name} (${png.width}x${png.height})`);
}

function make(size, draw) {
  const png = canvas(size * SS, CLEAR);
  draw(png, (size * SS) / W);
  return downsample(png, size);
}

// iOS/Android legacy icon: cream field, centered mark, no transparency.
save(
  "icon.png",
  make(1024, (png) => {
    fillRect(png, 0, 0, png.width, png.height, CREAM);
    const scale = (png.width / W) * 0.98;
    const origin = (png.width - W * scale) / 2;
    drawMark(png, scale, origin, origin);
  }),
);

// Adaptive foreground: mark only, inside the 66% safe area.
save(
  "android-icon-foreground.png",
  make(1024, (png) => {
    const scale = (png.width / W) * 0.62;
    const origin = (png.width - W * scale) / 2;
    drawMark(png, scale, origin, origin);
  }),
);

// Adaptive background: flat cream.
save(
  "android-icon-background.png",
  make(1024, (png) => {
    fillRect(png, 0, 0, png.width, png.height, CREAM);
  }),
);

// Themed icon: the P alone, as a white mask.
save(
  "android-icon-monochrome.png",
  make(1024, (png) => {
    const scale = (png.width / W) * 1.3;
    const centerX = 500;
    const centerY = 522;
    const originX = png.width / 2 - centerX * scale;
    const originY = png.height / 2 - centerY * scale;
    for (const [x, y, w, h] of P_BARS) {
      fillRect(
        png,
        originX + x * scale,
        originY + y * scale,
        w * scale,
        h * scale,
        WHITE,
      );
    }
  }),
);

// Splash mark on the cream splash background.
save(
  "splash-icon.png",
  make(512, (png) => {
    const scale = (png.width / W) * 0.92;
    const origin = (png.width - W * scale) / 2;
    drawMark(png, scale, origin, origin);
  }),
);

// Favicon: only the P reads at 48px, so skip the tile and shadow.
save(
  "favicon.png",
  make(48, (png) => {
    fillRect(png, 0, 0, png.width, png.height, YELLOW);
    const scale = (png.width / W) * 1.8;
    const centerX = 500;
    const centerY = 522;
    const originX = png.width / 2 - centerX * scale;
    const originY = png.height / 2 - centerY * scale;
    for (const [x, y, w, h] of P_BARS) {
      fillRect(
        png,
        originX + x * scale,
        originY + y * scale,
        w * scale,
        h * scale,
        INK,
      );
    }
  }),
);
