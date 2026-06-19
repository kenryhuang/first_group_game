import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  transparentPixelCount: number;
  rgbaPixels: Buffer;
}

interface LuminanceStats {
  average: number;
  standardDeviation: number;
}

interface DiamondFlatnessStats {
  edge: LuminanceStats;
  inner: LuminanceStats;
}

interface RunningFrameMotionStats {
  centerSpread: number;
  opaquePixelSpread: number;
  averageOpaquePixels: number;
}

interface AlphaBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface AlphaComponent {
  pixels: number;
  centerX: number;
  centerY: number;
}

const A2_CITY_EXPECTED_DIMENSIONS: Record<
  string,
  { width: number; height: number }
> = {
  "/assets/story-slice/a2-city/map/road-straight-01.png": {
    width: 256,
    height: 256,
  },
  "/assets/story-slice/a2-city/map/road-cracked-01.png": {
    width: 256,
    height: 256,
  },
  "/assets/story-slice/a2-city/map/concrete-broken-01.png": {
    width: 256,
    height: 256,
  },
  "/assets/story-slice/a2-city/map/wasteland-grass-01.png": {
    width: 256,
    height: 256,
  },
  "/assets/story-slice/a2-city/map/ground-concrete-flat-01.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/ground-foundation-pad-01.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/ground-wasteland-edge-flat-01.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-straight-x.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-straight-y.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-cracked-straight-x.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-cracked-straight-y.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-intersection.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-corner-ne.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-corner-nw.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-corner-se.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-corner-sw.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-t-north.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-t-east.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-t-south.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/road-kit/road-t-west.png": {
    width: 256,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/debris-small-01.png": {
    width: 128,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/debris-small-02.png": {
    width: 128,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/wrecked-car-01.png": {
    width: 256,
    height: 256,
  },
  "/assets/story-slice/a2-city/map/streetlight-broken-01.png": {
    width: 128,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/roadblock-01.png": {
    width: 128,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/signboard-broken-01.png": {
    width: 128,
    height: 128,
  },
  "/assets/story-slice/a2-city/map/building-green-01.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/map/building-ochre-01.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/map/building-teal-01.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-off.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-charging.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png": {
    width: 512,
    height: 512,
  },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-core-glow.png": {
    width: 512,
    height: 512,
  },
};

function publicAssetPath(assetPath: string): string {
  const relativePath = assetPath.replace(/^\//, "");
  return join(
    process.cwd(),
    "public",
    relativePath.replace(/^assets\//, "assets/"),
  );
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distanceToLeft = Math.abs(estimate - left);
  const distanceToUp = Math.abs(estimate - up);
  const distanceToUpLeft = Math.abs(estimate - upLeft);

  if (distanceToLeft <= distanceToUp && distanceToLeft <= distanceToUpLeft) {
    return left;
  }
  if (distanceToUp <= distanceToUpLeft) {
    return up;
  }
  return upLeft;
}

function decodeRgbaScanlines(
  inflated: Buffer,
  width: number,
  height: number,
): Buffer {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  expect(inflated.length).toBe((stride + 1) * height);

  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let targetOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[sourceOffset];
    sourceOffset += 1;
    expect([0, 1, 2, 3, 4]).toContain(filterType);

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
        reconstructed = raw + paethPredictor(left, up, upLeft);
      }

      pixels[targetOffset + x] = reconstructed & 0xff;
    }

    sourceOffset += stride;
    targetOffset += stride;
  }

  return pixels;
}

function readPngInfo(filePath: string): PngInfo {
  const bytes = readFileSync(filePath);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  let offset = 8;
  const firstChunkLength = bytes.readUInt32BE(offset);
  const firstChunkType = bytes.subarray(offset + 4, offset + 8).toString("ascii");
  expect(firstChunkLength).toBe(13);
  expect(firstChunkType).toBe("IHDR");

  const width = bytes.readUInt32BE(offset + 8);
  const height = bytes.readUInt32BE(offset + 12);
  const bitDepth = bytes[offset + 16];
  const colorType = bytes[offset + 17];

  const idatChunks: Buffer[] = [];
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32BE(offset);
    const chunkType = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    expect(dataEnd + 4).toBeLessThanOrEqual(bytes.length);

    if (chunkType === "IDAT") {
      idatChunks.push(bytes.subarray(dataStart, dataEnd));
    }
    if (chunkType === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6);
  expect(idatChunks.length).toBeGreaterThan(0);

  const rgbaPixels = decodeRgbaScanlines(
    inflateSync(Buffer.concat(idatChunks)),
    width,
    height,
  );
  let transparentPixelCount = 0;
  for (let index = 3; index < rgbaPixels.length; index += 4) {
    if (rgbaPixels[index] === 0) {
      transparentPixelCount += 1;
    }
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    transparentPixelCount,
    rgbaPixels,
  };
}

function getDiamondBandLuminanceStats(
  png: PngInfo,
  minDiamondDistance: number,
  maxDiamondDistance: number,
): LuminanceStats {
  const centerX = png.width / 2;
  const centerY = png.height / 2;
  let count = 0;
  let sum = 0;
  let sumSquares = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const normalizedX = Math.abs((x + 0.5 - centerX) / centerX);
      const normalizedY = Math.abs((y + 0.5 - centerY) / centerY);
      const diamondDistance = normalizedX + normalizedY;
      if (
        diamondDistance < minDiamondDistance ||
        diamondDistance > maxDiamondDistance
      ) {
        continue;
      }

      const index = (y * png.width + x) * 4;
      if (png.rgbaPixels[index + 3] < 220) {
        continue;
      }

      const luminance =
        0.2126 * png.rgbaPixels[index] +
        0.7152 * png.rgbaPixels[index + 1] +
        0.0722 * png.rgbaPixels[index + 2];
      count += 1;
      sum += luminance;
      sumSquares += luminance * luminance;
    }
  }

  expect(count).toBeGreaterThan(0);
  const average = sum / count;
  return {
    average,
    standardDeviation: Math.sqrt(sumSquares / count - average * average),
  };
}

function getDiamondFlatnessStats(png: PngInfo): DiamondFlatnessStats {
  return {
    edge: getDiamondBandLuminanceStats(png, 0.78, 0.92),
    inner: getDiamondBandLuminanceStats(png, 0.28, 0.62),
  };
}

function getDiamondQuadrantAverageSpread(png: PngInfo): number {
  const centerX = png.width / 2;
  const centerY = png.height / 2;
  const quadrants = {
    northwest: { count: 0, sum: 0 },
    northeast: { count: 0, sum: 0 },
    southwest: { count: 0, sum: 0 },
    southeast: { count: 0, sum: 0 },
  };

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const normalizedX = (x + 0.5 - centerX) / centerX;
      const normalizedY = (y + 0.5 - centerY) / centerY;
      if (Math.abs(normalizedX) + Math.abs(normalizedY) > 0.86) {
        continue;
      }

      const index = (y * png.width + x) * 4;
      if (png.rgbaPixels[index + 3] < 220) {
        continue;
      }

      const luminance =
        0.2126 * png.rgbaPixels[index] +
        0.7152 * png.rgbaPixels[index + 1] +
        0.0722 * png.rgbaPixels[index + 2];
      const quadrant =
        normalizedY < 0
          ? normalizedX < 0
            ? quadrants.northwest
            : quadrants.northeast
          : normalizedX < 0
            ? quadrants.southwest
            : quadrants.southeast;
      quadrant.count += 1;
      quadrant.sum += luminance;
    }
  }

  const averages = Object.values(quadrants).map((quadrant) => {
    expect(quadrant.count).toBeGreaterThan(0);
    return quadrant.sum / quadrant.count;
  });
  return Math.max(...averages) - Math.min(...averages);
}

function getAlphaBounds(png: PngInfo): AlphaBounds {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (y * png.width + x) * 4;
      if (png.rgbaPixels[index + 3] <= 12) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  expect(maxX).toBeGreaterThanOrEqual(0);
  return { minX, minY, maxX, maxY };
}

function getRunningFrameMotionStats(assetPaths: string[]): RunningFrameMotionStats {
  const centers: Array<{ x: number; y: number }> = [];
  const opaquePixelCounts: number[] = [];

  for (const assetPath of assetPaths) {
    const png = readPngInfo(publicAssetPath(assetPath));
    let weightedX = 0;
    let weightedY = 0;
    let alphaSum = 0;
    let opaquePixelCount = 0;

    for (let y = 0; y < png.height; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        const index = (y * png.width + x) * 4;
        const alpha = png.rgbaPixels[index + 3];
        if (alpha < 150) continue;

        weightedX += (x + 0.5) * alpha;
        weightedY += (y + 0.5) * alpha;
        alphaSum += alpha;
        opaquePixelCount += 1;
      }
    }

    expect(alphaSum).toBeGreaterThan(0);
    centers.push({ x: weightedX / alphaSum, y: weightedY / alphaSum });
    opaquePixelCounts.push(opaquePixelCount);
  }

  const centerDistances = centers.map((center) => {
    const average = centers.reduce(
      (sum, next) => ({ x: sum.x + next.x, y: sum.y + next.y }),
      { x: 0, y: 0 },
    );
    average.x /= centers.length;
    average.y /= centers.length;

    return Math.hypot(center.x - average.x, center.y - average.y);
  });

  return {
    centerSpread: Math.max(...centerDistances) - Math.min(...centerDistances),
    opaquePixelSpread: Math.max(...opaquePixelCounts) - Math.min(...opaquePixelCounts),
    averageOpaquePixels:
      opaquePixelCounts.reduce((sum, count) => sum + count, 0) /
      opaquePixelCounts.length,
  };
}

function getLowerBodyCoverage(assetPaths: string[]): number {
  const coverages: number[] = [];

  for (const assetPath of assetPaths) {
    const png = readPngInfo(publicAssetPath(assetPath));
    const bounds = getAlphaBounds(png);
    const lowerTop = Math.floor(bounds.minY + (bounds.maxY - bounds.minY + 1) * 0.58);
    let opaquePixels = 0;
    let sampledPixels = 0;

    for (let y = lowerTop; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const index = (y * png.width + x) * 4;
        sampledPixels += 1;
        if (png.rgbaPixels[index + 3] > 150) opaquePixels += 1;
      }
    }

    expect(sampledPixels).toBeGreaterThan(0);
    coverages.push(opaquePixels / sampledPixels);
  }

  return coverages.reduce((sum, coverage) => sum + coverage, 0) / coverages.length;
}

function getAlphaComponents(png: PngInfo): AlphaComponent[] {
  const visited = new Uint8Array(png.width * png.height);
  const components: AlphaComponent[] = [];
  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let startY = 0; startY < png.height; startY += 1) {
    for (let startX = 0; startX < png.width; startX += 1) {
      const startIndex = startY * png.width + startX;
      if (visited[startIndex]) continue;

      visited[startIndex] = 1;
      if (png.rgbaPixels[startIndex * 4 + 3] <= 12) continue;

      const queue: Array<[number, number]> = [[startX, startY]];
      let pixels = 0;
      let sumX = 0;
      let sumY = 0;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [x, y] = queue[cursor];
        const index = y * png.width + x;
        if (png.rgbaPixels[index * 4 + 3] <= 12) continue;

        pixels += 1;
        sumX += x + 0.5;
        sumY += y + 0.5;

        for (const [dx, dy] of neighbors) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= png.width ||
            nextY >= png.height
          ) {
            continue;
          }

          const nextIndex = nextY * png.width + nextX;
          if (visited[nextIndex]) continue;
          visited[nextIndex] = 1;
          if (png.rgbaPixels[nextIndex * 4 + 3] <= 12) continue;
          queue.push([nextX, nextY]);
        }
      }

      components.push({
        pixels,
        centerX: sumX / pixels,
        centerY: sumY / pixels,
      });
    }
  }

  return components.sort((a, b) => b.pixels - a.pixels);
}

function getMainComponentCenterSpread(assetPaths: string[]): number {
  const centers = assetPaths.map((assetPath) => {
    const components = getAlphaComponents(readPngInfo(publicAssetPath(assetPath)));
    expect(components.length).toBeGreaterThan(0);
    return components[0];
  });
  const xs = centers.map((center) => center.centerX);
  const ys = centers.map((center) => center.centerY);

  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function getLargestDetachedAlphaComponent(assetPaths: string[]): number {
  return Math.max(
    ...assetPaths.map((assetPath) => {
      const components = getAlphaComponents(readPngInfo(publicAssetPath(assetPath)));
      return components[1]?.pixels ?? 0;
    }),
  );
}

function expectSameAlphaMask(referenceAssetPath: string, candidateAssetPath: string): void {
  const reference = readPngInfo(publicAssetPath(referenceAssetPath));
  const candidate = readPngInfo(publicAssetPath(candidateAssetPath));

  expect(candidate.width).toBe(reference.width);
  expect(candidate.height).toBe(reference.height);

  for (let index = 3; index < reference.rgbaPixels.length; index += 4) {
    expect(candidate.rgbaPixels[index]).toBe(reference.rgbaPixels[index]);
  }
}

function getAverageOpaqueRgb(assetPath: string): { red: number; green: number; blue: number } {
  const png = readPngInfo(publicAssetPath(assetPath));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let index = 0; index < png.rgbaPixels.length; index += 4) {
    if (png.rgbaPixels[index + 3] <= 12) continue;

    red += png.rgbaPixels[index];
    green += png.rgbaPixels[index + 1];
    blue += png.rgbaPixels[index + 2];
    count += 1;
  }

  expect(count).toBeGreaterThan(0);
  return {
    red: red / count,
    green: green / count,
    blue: blue / count,
  };
}

describe("story slice asset files", () => {
  it("has a committed file for every manifest path", () => {
    const missing = getStorySliceAssetPaths(STORY_SLICE_ASSETS).filter((assetPath) => {
      return !existsSync(publicAssetPath(assetPath));
    });

    expect(missing).toEqual([]);
  });

  it("has correctly sized transparent RGBA A2 city PNG assets", () => {
    for (const [assetPath, expected] of Object.entries(
      A2_CITY_EXPECTED_DIMENSIONS,
    )) {
      const png = readPngInfo(publicAssetPath(assetPath));
      expect(png.width).toBe(expected.width);
      expect(png.height).toBe(expected.height);
      expect(png.bitDepth).toBe(8);
      expect(png.colorType).toBe(6);
      expect(png.transparentPixelCount).toBeGreaterThan(0);
    }
  });

  it("keeps the flat A2 ground tiles visually coplanar", () => {
    const flatGroundAssets = [
      "/assets/story-slice/a2-city/map/ground-concrete-flat-01.png",
      "/assets/story-slice/a2-city/map/ground-wasteland-edge-flat-01.png",
    ];

    for (const assetPath of flatGroundAssets) {
      const png = readPngInfo(publicAssetPath(assetPath));
      const flatness = getDiamondFlatnessStats(png);

      expect(flatness.inner.average - flatness.edge.average).toBeLessThan(6);
      expect(flatness.edge.standardDeviation).toBeLessThan(18);
      expect(getDiamondQuadrantAverageSpread(png)).toBeLessThan(2);
    }
  });

  it("gives vanguard 2.5d running frames visible alternating motion", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["up", "down", "left", "right"] as const) {
      const motion = getRunningFrameMotionStats(run[direction].frames);

      expect(motion.centerSpread).toBeGreaterThan(0.35);
      expect(motion.opaquePixelSpread).toBeGreaterThan(18);
    }
  });

  it("keeps vanguard 2.5d running frames transparent and substantial", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["up", "down", "left", "right"] as const) {
      const motion = getRunningFrameMotionStats(run[direction].frames);
      const lowerBodyCoverage = getLowerBodyCoverage(run[direction].frames);

      expect(motion.averageOpaquePixels).toBeGreaterThan(1800);
      expect(lowerBodyCoverage).toBeGreaterThan(0.05);
    }
  });

  it("keeps vanguard upper diagonal running frames centered without detached specks", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["up", "left"] as const) {
      expect(getMainComponentCenterSpread(run[direction].frames)).toBeLessThan(6);
      expect(getLargestDetachedAlphaComponent(run[direction].frames)).toBeLessThan(8);
    }
  });

  it("keeps vanguard idle frames color-matched to the first running frame", () => {
    const animations = STORY_SLICE_ASSETS.characters.vanguard.animations;
    const idle = animations.idle!;
    const run = animations.run!;

    for (const direction of ["up", "down", "left", "right"] as const) {
      const runFirstFrame = readFileSync(publicAssetPath(run[direction].frames[0]));

      for (const idleFrame of idle[direction].frames) {
        expect(readFileSync(publicAssetPath(idleFrame))).toEqual(runFirstFrame);
      }
    }
  });

  it("keeps vanguard attack frames angle-matched to the first running frame", () => {
    const animations = STORY_SLICE_ASSETS.characters.vanguard.animations;
    const attack = animations.attack!;
    const run = animations.run!;

    for (const direction of ["up", "down", "left", "right"] as const) {
      const runFirstFrame = readFileSync(publicAssetPath(run[direction].frames[0]));

      for (const attackFrame of attack[direction].frames) {
        expect(readFileSync(publicAssetPath(attackFrame))).toEqual(runFirstFrame);
      }
    }
  });

  it("keeps vanguard hit frames angle-matched with a visible hit tint", () => {
    const animations = STORY_SLICE_ASSETS.characters.vanguard.animations;
    const hit = animations.hit!;
    const run = animations.run!;

    for (const direction of ["up", "down", "left", "right"] as const) {
      const runFirstFrame = run[direction].frames[0];
      const baseRgb = getAverageOpaqueRgb(runFirstFrame);
      const hitFrameBytes = hit[direction].frames.map((frame) =>
        readFileSync(publicAssetPath(frame)),
      );

      expect(hitFrameBytes[0].equals(hitFrameBytes[1])).toBe(false);

      for (const hitFrame of hit[direction].frames) {
        expectSameAlphaMask(runFirstFrame, hitFrame);
        const hitRgb = getAverageOpaqueRgb(hitFrame);

        expect(hitRgb.red).toBeGreaterThan(baseRgb.red + 8);
      }
    }
  });
});
