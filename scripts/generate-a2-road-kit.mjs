import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = process.cwd();
const MAP_DIR = join(ROOT, "public/assets/story-slice/a2-city/map");
const ROAD_KIT_DIR = join(MAP_DIR, "road-kit");
const WIDTH = 256;
const HEIGHT = 128;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const ROAD_HALF_WIDTH = 0.34;
const CURB_WIDTH = 0.035;

const SOURCE_TOP_Y = {
  concrete: 32,
  wasteland: 32,
  road: 30,
};

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function readPng(filePath) {
  const bytes = readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = bytes.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`${filePath} must be 8-bit RGBA PNG`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let targetOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[sourceOffset];
    sourceOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= bytesPerPixel ? pixels[targetOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[targetOffset + x - stride] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? pixels[targetOffset + x - stride - bytesPerPixel]
          : 0;

      let reconstructed = raw;
      if (filterType === 1) {
        reconstructed = raw + left;
      } else if (filterType === 2) {
        reconstructed = raw + up;
      } else if (filterType === 3) {
        reconstructed = raw + Math.floor((left + up) / 2);
      } else if (filterType === 4) {
        const estimate = left + up - upLeft;
        const distanceToLeft = Math.abs(estimate - left);
        const distanceToUp = Math.abs(estimate - up);
        const distanceToUpLeft = Math.abs(estimate - upLeft);
        const predictor =
          distanceToLeft <= distanceToUp && distanceToLeft <= distanceToUpLeft
            ? left
            : distanceToUp <= distanceToUpLeft
              ? up
              : upLeft;
        reconstructed = raw + predictor;
      }

      pixels[targetOffset + x] = reconstructed & 0xff;
    }

    sourceOffset += stride;
    targetOffset += stride;
  }

  return { width, height, pixels };
}

function writePng(filePath, width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  let sourceOffset = 0;
  let targetOffset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[targetOffset] = 0;
    targetOffset += 1;
    pixels.copy(raw, targetOffset, sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    targetOffset += stride;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function mixColor(start, end, amount) {
  const mixAmount = clamp(amount, 0, 1);
  return [
    Math.round(lerp(start[0], end[0], mixAmount)),
    Math.round(lerp(start[1], end[1], mixAmount)),
    Math.round(lerp(start[2], end[2], mixAmount)),
    Math.round(lerp(start[3] ?? 255, end[3] ?? 255, mixAmount)),
  ];
}

function colorWithBrightness(color, amount) {
  return [
    clamp(Math.round(color[0] + amount), 0, 255),
    clamp(Math.round(color[1] + amount), 0, 255),
    clamp(Math.round(color[2] + amount), 0, 255),
    color[3] ?? 255,
  ];
}

function hashUnit(x, y, seed) {
  let hash =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(seed, 1442695041);
  hash = (hash ^ (hash >>> 13)) >>> 0;
  hash = Math.imul(hash, 1274126177) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash / 0xffffffff;
}

function valueNoise(x, y, scale, seed) {
  const scaledX = x / scale;
  const scaledY = y / scale;
  const x0 = Math.floor(scaledX);
  const y0 = Math.floor(scaledY);
  const tx = smoothStep(scaledX - x0);
  const ty = smoothStep(scaledY - y0);

  const top = lerp(hashUnit(x0, y0, seed), hashUnit(x0 + 1, y0, seed), tx);
  const bottom = lerp(
    hashUnit(x0, y0 + 1, seed),
    hashUnit(x0 + 1, y0 + 1, seed),
    tx,
  );
  return lerp(top, bottom, ty);
}

function sample(image, x, y) {
  const sx = clamp(Math.round(x), 0, image.width - 1);
  const sy = clamp(Math.round(y), 0, image.height - 1);
  const index = (sy * image.width + sx) * 4;
  return [
    image.pixels[index],
    image.pixels[index + 1],
    image.pixels[index + 2],
    image.pixels[index + 3],
  ];
}

function setPixel(pixels, x, y, color) {
  const index = (y * WIDTH + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function isYellowLane(color) {
  return color[3] > 80 && color[0] > 120 && color[1] > 95 && color[2] < 95;
}

function neutralizeRoadColor(color, cracked) {
  if (!isYellowLane(color)) {
    const tint = cracked ? 0.92 : 0.98;
    return [
      Math.round(color[0] * tint),
      Math.round(color[1] * tint),
      Math.round(color[2] * tint),
      color[3],
    ];
  }

  return cracked ? [49, 59, 55, color[3]] : [54, 65, 61, color[3]];
}

function isoCoords(x, y) {
  const dx = (x + 0.5 - CENTER_X) / CENTER_X;
  const dy = (y + 0.5 - CENTER_Y) / CENTER_Y;
  return {
    a: dy + dx,
    b: dy - dx,
    edgeDistance: 1 - (Math.abs(dx) + Math.abs(dy)),
  };
}

function edgeAlpha(edgeDistance) {
  if (edgeDistance <= -0.006) return 0;
  return 255;
}

function averageTopColor(source, topY) {
  let count = 0;
  let red = 0;
  let green = 0;
  let blue = 0;

  for (let y = 42; y <= 88; y += 1) {
    for (let x = 52; x <= 204; x += 1) {
      const color = sample(source, x, topY + y);
      if (color[3] < 180) continue;
      red += color[0];
      green += color[1];
      blue += color[2];
      count += 1;
    }
  }

  if (count === 0) return [92, 108, 101, 255];
  return [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
    255,
  ];
}

function makeFlatGroundTexture(source, topY, options) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
  const sourceAverage = averageTopColor(source, topY);
  const baseColor = mixColor(sourceAverage, options.paletteBase, 0.62);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const { edgeDistance } = isoCoords(x, y);
      const alpha = edgeAlpha(edgeDistance);
      if (alpha <= 0) continue;

      const broadNoise = valueNoise(x + 19, y - 31, 96, options.seed) - 0.5;
      const midNoise = valueNoise(x - 73, y + 41, 42, options.seed + 11) - 0.5;
      const fineNoise = hashUnit(x, y, options.seed + 23) - 0.5;
      const stainNoise = valueNoise(x + 211, y + 137, 58, options.seed + 37);
      const pitNoise = valueNoise(x - 17, y + 83, 18, options.seed + 53);

      let color = colorWithBrightness(
        baseColor,
        broadNoise * options.broadContrast +
          midNoise * options.midContrast +
          fineNoise * options.fineContrast,
      );

      const grime = Math.max(0, stainNoise - 0.58) * options.grimeStrength;
      color = mixColor(color, options.grimeColor, grime);

      if (pitNoise > 0.82 && hashUnit(x >> 1, y >> 1, options.seed + 71) > 0.78) {
        color = mixColor(color, options.pitColor, options.pitStrength);
      }

      color[3] = alpha;
      setPixel(pixels, x, y, color);
    }
  }

  return pixels;
}

function lineDistance(value, spacing) {
  const normalized = Math.abs(value / spacing);
  return Math.abs(normalized - Math.round(normalized)) * spacing;
}

function makeFoundationPadTexture(base) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const { a, b, edgeDistance } = isoCoords(x, y);
      const alpha = edgeAlpha(edgeDistance);
      if (alpha <= 0) continue;

      const index = (y * WIDTH + x) * 4;
      let color = [
        base[index],
        base[index + 1],
        base[index + 2],
        alpha,
      ];

      color = mixColor(color, [124, 132, 119, 255], 0.58);
      color = colorWithBrightness(
        color,
        (valueNoise(x + 89, y - 17, 70, 277) - 0.5) * 3.4 +
          (hashUnit(x, y, 293) - 0.5) * 1.6,
      );

      const gridDistance = Math.min(lineDistance(a, 0.5), lineDistance(b, 0.5));
      if (gridDistance < 0.012 && edgeDistance > 0.1) {
        color = mixColor(color, [63, 70, 64, 255], 0.22);
      }

      if (edgeDistance < 0.08) {
        const curbAmount = (0.08 - edgeDistance) / 0.08;
        color = mixColor(color, [90, 97, 88, 255], curbAmount * 0.44);
      }
      if (edgeDistance < 0.035) {
        const shadowAmount = (0.035 - edgeDistance) / 0.035;
        color = mixColor(color, [43, 50, 47, 255], shadowAmount * 0.34);
      }

      const chipNoise = valueNoise(x - 31, y + 57, 16, 311);
      if (chipNoise > 0.86 && edgeDistance > 0.18) {
        color = mixColor(color, [71, 80, 74, 255], 0.18);
      }

      color[3] = alpha;
      setPixel(pixels, x, y, color);
    }
  }

  return pixels;
}

function sampleInsetTop(source, x, y, topY, flipX = false) {
  const inset = 0.82;
  const insetX = CENTER_X + (x + 0.5 - CENTER_X) * inset;
  const insetY = CENTER_Y + (y + 0.5 - CENTER_Y) * inset;
  return sample(source, flipX ? WIDTH - 1 - insetX : insetX, topY + insetY);
}

function hasConnection(connections, connection) {
  return connections.includes(connection);
}

function roadMaskFor(connections, a, b) {
  const center = Math.abs(a) <= ROAD_HALF_WIDTH && Math.abs(b) <= ROAD_HALF_WIDTH;
  const xMinus =
    hasConnection(connections, "xMinus") &&
    a <= ROAD_HALF_WIDTH &&
    Math.abs(b) <= ROAD_HALF_WIDTH;
  const xPlus =
    hasConnection(connections, "xPlus") &&
    a >= -ROAD_HALF_WIDTH &&
    Math.abs(b) <= ROAD_HALF_WIDTH;
  const yMinus =
    hasConnection(connections, "yMinus") &&
    b <= ROAD_HALF_WIDTH &&
    Math.abs(a) <= ROAD_HALF_WIDTH;
  const yPlus =
    hasConnection(connections, "yPlus") &&
    b >= -ROAD_HALF_WIDTH &&
    Math.abs(a) <= ROAD_HALF_WIDTH;

  return center || xMinus || xPlus || yMinus || yPlus;
}

function roadAxisAt(connections, a, b) {
  const xActive =
    Math.abs(b) <= ROAD_HALF_WIDTH &&
    ((a < 0 && hasConnection(connections, "xMinus")) ||
      (a > 0 && hasConnection(connections, "xPlus")) ||
      Math.abs(a) <= ROAD_HALF_WIDTH);
  const yActive =
    Math.abs(a) <= ROAD_HALF_WIDTH &&
    ((b < 0 && hasConnection(connections, "yMinus")) ||
      (b > 0 && hasConnection(connections, "yPlus")) ||
      Math.abs(b) <= ROAD_HALF_WIDTH);

  if (xActive && !yActive) return "x";
  if (yActive && !xActive) return "y";
  return Math.abs(a) > Math.abs(b) ? "x" : "y";
}

function isCurbPixel(connections, a, b) {
  const onXSide =
    ((hasConnection(connections, "xMinus") && a < ROAD_HALF_WIDTH) ||
      (hasConnection(connections, "xPlus") && a > -ROAD_HALF_WIDTH)) &&
    Math.abs(Math.abs(b) - ROAD_HALF_WIDTH) <= CURB_WIDTH;
  const onYSide =
    ((hasConnection(connections, "yMinus") && b < ROAD_HALF_WIDTH) ||
      (hasConnection(connections, "yPlus") && b > -ROAD_HALF_WIDTH)) &&
    Math.abs(Math.abs(a) - ROAD_HALF_WIDTH) <= CURB_WIDTH;

  return onXSide || onYSide;
}

function dashOn(value) {
  const normalized = ((value + 1) * 3.2) % 1;
  return normalized > 0.18 && normalized < 0.48;
}

function isLanePixel(connections, a, b) {
  const xLane =
    Math.abs(b) < 0.018 &&
    Math.abs(a) > 0.28 &&
    ((a < 0 && hasConnection(connections, "xMinus")) ||
      (a > 0 && hasConnection(connections, "xPlus"))) &&
    dashOn(a);
  const yLane =
    Math.abs(a) < 0.018 &&
    Math.abs(b) > 0.28 &&
    ((b < 0 && hasConnection(connections, "yMinus")) ||
      (b > 0 && hasConnection(connections, "yPlus"))) &&
    dashOn(b);

  return xLane || yLane;
}

function makeRoadTile({
  base,
  road,
  crackedRoad,
  connections,
  cracked = false,
}) {
  const pixels = Buffer.from(base);
  const source = cracked ? crackedRoad : road;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const { a, b, edgeDistance } = isoCoords(x, y);
      if (edgeAlpha(edgeDistance) <= 0 || !roadMaskFor(connections, a, b)) {
        continue;
      }

      const axis = roadAxisAt(connections, a, b);
      const sourceColor = neutralizeRoadColor(
        sampleInsetTop(source, x, y, SOURCE_TOP_Y.road, axis === "x"),
        cracked,
      );
      const alpha = edgeAlpha(edgeDistance);
      setPixel(pixels, x, y, [
        sourceColor[0],
        sourceColor[1],
        sourceColor[2],
        Math.min(sourceColor[3], alpha),
      ]);
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const { a, b, edgeDistance } = isoCoords(x, y);
      const alpha = edgeAlpha(edgeDistance);
      if (alpha <= 0) continue;

      if (isCurbPixel(connections, a, b)) {
        setPixel(pixels, x, y, [112, 124, 113, Math.min(alpha, 230)]);
      }
      if (isLanePixel(connections, a, b)) {
        setPixel(pixels, x, y, [198, 166, 94, Math.min(alpha, 210)]);
      }
    }
  }

  return pixels;
}

const concrete = readPng(join(MAP_DIR, "concrete-broken-01.png"));
const wasteland = readPng(join(MAP_DIR, "wasteland-grass-01.png"));
const road = readPng(join(MAP_DIR, "road-straight-01.png"));
const crackedRoad = readPng(join(MAP_DIR, "road-cracked-01.png"));

const concreteFlat = makeFlatGroundTexture(concrete, SOURCE_TOP_Y.concrete, {
  seed: 101,
  paletteBase: [89, 111, 106, 255],
  grimeColor: [61, 91, 82, 255],
  pitColor: [49, 57, 53, 255],
  broadContrast: 2,
  midContrast: 1.2,
  fineContrast: 1.4,
  grimeStrength: 0.1,
  pitStrength: 0.06,
});
const wastelandFlat = makeFlatGroundTexture(wasteland, SOURCE_TOP_Y.wasteland, {
  seed: 173,
  paletteBase: [78, 100, 89, 255],
  grimeColor: [48, 83, 63, 255],
  pitColor: [44, 51, 46, 255],
  broadContrast: 2.2,
  midContrast: 1.4,
  fineContrast: 1.6,
  grimeStrength: 0.14,
  pitStrength: 0.07,
});
const foundationPad = makeFoundationPadTexture(concreteFlat);

writePng(join(MAP_DIR, "ground-concrete-flat-01.png"), WIDTH, HEIGHT, concreteFlat);
writePng(
  join(MAP_DIR, "ground-foundation-pad-01.png"),
  WIDTH,
  HEIGHT,
  foundationPad,
);
writePng(
  join(MAP_DIR, "ground-wasteland-edge-flat-01.png"),
  WIDTH,
  HEIGHT,
  wastelandFlat,
);

const roadTiles = [
  {
    file: "road-straight-x.png",
    connections: ["xMinus", "xPlus"],
  },
  {
    file: "road-straight-y.png",
    connections: ["yMinus", "yPlus"],
  },
  {
    file: "road-cracked-straight-x.png",
    connections: ["xMinus", "xPlus"],
    cracked: true,
  },
  {
    file: "road-cracked-straight-y.png",
    connections: ["yMinus", "yPlus"],
    cracked: true,
  },
  {
    file: "road-intersection.png",
    connections: ["xMinus", "xPlus", "yMinus", "yPlus"],
    cracked: true,
  },
  {
    file: "road-corner-ne.png",
    connections: ["xPlus", "yPlus"],
  },
  {
    file: "road-corner-nw.png",
    connections: ["xMinus", "yPlus"],
  },
  {
    file: "road-corner-se.png",
    connections: ["xPlus", "yMinus"],
  },
  {
    file: "road-corner-sw.png",
    connections: ["xMinus", "yMinus"],
  },
  {
    file: "road-t-north.png",
    connections: ["xMinus", "xPlus", "yPlus"],
    cracked: true,
  },
  {
    file: "road-t-east.png",
    connections: ["xMinus", "yMinus", "yPlus"],
    cracked: true,
  },
  {
    file: "road-t-south.png",
    connections: ["xMinus", "xPlus", "yMinus"],
    cracked: true,
  },
  {
    file: "road-t-west.png",
    connections: ["xPlus", "yMinus", "yPlus"],
    cracked: true,
  },
];

for (const tile of roadTiles) {
  writePng(
    join(ROAD_KIT_DIR, tile.file),
    WIDTH,
    HEIGHT,
    makeRoadTile({
      base: concreteFlat,
      road,
      crackedRoad,
      connections: tile.connections,
      cracked: tile.cracked ?? false,
    }),
  );
}
