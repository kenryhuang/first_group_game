import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

describe("story slice asset files", () => {
  it("has a committed file for every manifest path", () => {
    const missing = getStorySliceAssetPaths(STORY_SLICE_ASSETS).filter((assetPath) => {
      const relativePath = assetPath.replace(/^\//, "");
      return !existsSync(join(process.cwd(), "public", relativePath.replace(/^assets\//, "assets/")));
    });

    expect(missing).toEqual([]);
  });
});
