import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

describe("story slice asset manifest", () => {
  it("lists the required map, lighthouse, and effect assets", () => {
    expect(STORY_SLICE_ASSETS.map.groundTiles).toHaveLength(4);
    expect(STORY_SLICE_ASSETS.map.decorations).toHaveLength(6);
    expect(Object.keys(STORY_SLICE_ASSETS.lighthouse.states)).toEqual([
      "off",
      "charging",
      "on",
    ]);
    expect(STORY_SLICE_ASSETS.effects.scanRing).toBe(
      "/assets/story-slice/effects/scan-ring.png",
    );
    expect(STORY_SLICE_ASSETS.effects.fogNoise).toBe(
      "/assets/story-slice/effects/fog-noise.png",
    );
  });

  it("defines vanguard and zombie animation frame counts", () => {
    expect(
      STORY_SLICE_ASSETS.characters.vanguard.animations.idle!.down.frames,
    ).toHaveLength(4);
    expect(
      STORY_SLICE_ASSETS.characters.vanguard.animations.run!.right.frames,
    ).toHaveLength(8);
    expect(
      STORY_SLICE_ASSETS.characters.vanguard.animations.attack!.down.frames,
    ).toHaveLength(4);
    expect(
      STORY_SLICE_ASSETS.characters.vanguard.animations.hit!.down.frames,
    ).toHaveLength(2);

    expect(
      STORY_SLICE_ASSETS.characters.zombie.animations.idle!.down.frames,
    ).toHaveLength(4);
    expect(
      STORY_SLICE_ASSETS.characters.zombie.animations.run!.right.frames,
    ).toHaveLength(6);
    expect(
      STORY_SLICE_ASSETS.characters.zombie.animations.hit!.down.frames,
    ).toHaveLength(2);
    expect(
      STORY_SLICE_ASSETS.characters.zombie.animations.death!.down.frames,
    ).toHaveLength(6);
  });

  it("can flatten every asset path for file validation and preloading", () => {
    const paths = getStorySliceAssetPaths(STORY_SLICE_ASSETS);

    expect(paths).toContain("/assets/story-slice/map/road-straight-01.png");
    expect(paths).toContain(
      "/assets/story-slice/lighthouse/lighthouse-on.png",
    );
    expect(paths).toContain(
      "/assets/story-slice/characters/vanguard/idle/down/000.png",
    );
    expect(paths).toContain(
      "/assets/story-slice/characters/zombie/death/down/005.png",
    );
    expect(new Set(paths).size).toBe(paths.length);
  });
});
