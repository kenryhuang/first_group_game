import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

interface PngInfo {
  width: number;
  height: number;
  colorType: number;
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
  return join(process.cwd(), "public", relativePath.replace(/^assets\//, "assets/"));
}

function readPngInfo(filePath: string): PngInfo {
  const bytes = readFileSync(filePath);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

describe("story slice asset files", () => {
  it("has a committed file for every manifest path", () => {
    const missing = getStorySliceAssetPaths(STORY_SLICE_ASSETS).filter((assetPath) => {
      return !existsSync(publicAssetPath(assetPath));
    });

    expect(missing).toEqual([]);
  });

  it("has correctly sized alpha-capable A2 city PNG assets", () => {
    for (const [assetPath, expected] of Object.entries(
      A2_CITY_EXPECTED_DIMENSIONS,
    )) {
      const png = readPngInfo(publicAssetPath(assetPath));
      expect(png.width).toBe(expected.width);
      expect(png.height).toBe(expected.height);
      expect([4, 6]).toContain(png.colorType);
    }
  });
});
