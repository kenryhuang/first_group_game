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

interface LowerBodyMotionStats {
  horizontalCenterSpread: number;
  opaquePixelSpread: number;
}

interface LowerBodyLegReadabilityStats {
  averageSideToCenterLuminanceGap: number;
}

interface LowerBodyBulkStats {
  averageOpaqueCoverage: number;
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

function getLowerBodyMotionStats(assetPaths: string[]): LowerBodyMotionStats {
  const centers: number[] = [];
  const opaquePixelCounts: number[] = [];

  for (const assetPath of assetPaths) {
    const png = readPngInfo(publicAssetPath(assetPath));
    let weightedX = 0;
    let alphaSum = 0;
    let opaquePixelCount = 0;
    const top = Math.floor(png.height * 0.76);
    const bottom = Math.floor(png.height * 0.96);

    for (let y = top; y < bottom; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        const index = (y * png.width + x) * 4;
        const alpha = png.rgbaPixels[index + 3];
        if (alpha < 150) continue;

        weightedX += (x + 0.5) * alpha;
        alphaSum += alpha;
        opaquePixelCount += 1;
      }
    }

    expect(alphaSum).toBeGreaterThan(0);
    centers.push(weightedX / alphaSum);
    opaquePixelCounts.push(opaquePixelCount);
  }

  return {
    horizontalCenterSpread: Math.max(...centers) - Math.min(...centers),
    opaquePixelSpread: Math.max(...opaquePixelCounts) - Math.min(...opaquePixelCounts),
  };
}

function getLowerBodyLegReadabilityStats(assetPaths: string[]): LowerBodyLegReadabilityStats {
  const sideToCenterLuminanceGaps: number[] = [];

  for (const assetPath of assetPaths) {
    const png = readPngInfo(publicAssetPath(assetPath));
    let centerSum = 0;
    let centerCount = 0;
    let sideSum = 0;
    let sideCount = 0;

    for (let y = 95; y < 118; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        const index = (y * png.width + x) * 4;
        if (png.rgbaPixels[index + 3] < 150) continue;

        const luminance =
          0.2126 * png.rgbaPixels[index] +
          0.7152 * png.rgbaPixels[index + 1] +
          0.0722 * png.rgbaPixels[index + 2];

        if (x >= 60 && x <= 68) {
          centerSum += luminance;
          centerCount += 1;
        } else if ((x >= 45 && x <= 56) || (x >= 72 && x <= 83)) {
          sideSum += luminance;
          sideCount += 1;
        }
      }
    }

    expect(centerCount).toBeGreaterThan(0);
    expect(sideCount).toBeGreaterThan(0);
    sideToCenterLuminanceGaps.push(sideSum / sideCount - centerSum / centerCount);
  }

  return {
    averageSideToCenterLuminanceGap:
      sideToCenterLuminanceGaps.reduce((sum, gap) => sum + gap, 0) /
      sideToCenterLuminanceGaps.length,
  };
}

function getLowerBodyBulkStats(assetPaths: string[]): LowerBodyBulkStats {
  const opaqueCoverages: number[] = [];

  for (const assetPath of assetPaths) {
    const png = readPngInfo(publicAssetPath(assetPath));
    let opaquePixels = 0;
    let sampledPixels = 0;

    for (let y = 92; y < 118; y += 1) {
      for (let x = 42; x <= 86; x += 1) {
        const index = (y * png.width + x) * 4;
        sampledPixels += 1;
        if (png.rgbaPixels[index + 3] > 150) {
          opaquePixels += 1;
        }
      }
    }

    expect(sampledPixels).toBeGreaterThan(0);
    opaqueCoverages.push(opaquePixels / sampledPixels);
  }

  return {
    averageOpaqueCoverage:
      opaqueCoverages.reduce((sum, coverage) => sum + coverage, 0) /
      opaqueCoverages.length,
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

  it("gives vanguard left and right running frames visible alternating leg motion", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["left", "right"] as const) {
      const motion = getLowerBodyMotionStats(run[direction].frames);

      expect(motion.horizontalCenterSpread).toBeGreaterThan(3.2);
      expect(motion.opaquePixelSpread).toBeGreaterThan(34);
    }
  });

  it("keeps vanguard horizontal running legs free of a harsh center seam", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["left", "right"] as const) {
      const readability = getLowerBodyLegReadabilityStats(run[direction].frames);

      expect(readability.averageSideToCenterLuminanceGap).toBeLessThan(45);
    }
  });

  it("keeps vanguard horizontal running legs close to the idle armored mass", () => {
    const run = STORY_SLICE_ASSETS.characters.vanguard.animations.run!;

    for (const direction of ["left", "right"] as const) {
      const bulk = getLowerBodyBulkStats(run[direction].frames);

      expect(bulk.averageOpaqueCoverage).toBeGreaterThan(0.74);
    }
  });
});
