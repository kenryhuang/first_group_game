import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

const A2_CITY_GROUND_TILES = [
  "/assets/story-slice/a2-city/map/road-straight-01.png",
  "/assets/story-slice/a2-city/map/road-cracked-01.png",
  "/assets/story-slice/a2-city/map/concrete-broken-01.png",
  "/assets/story-slice/a2-city/map/wasteland-grass-01.png",
];

const A2_CITY_DECORATIONS = [
  "/assets/story-slice/a2-city/map/debris-small-01.png",
  "/assets/story-slice/a2-city/map/debris-small-02.png",
  "/assets/story-slice/a2-city/map/wrecked-car-01.png",
  "/assets/story-slice/a2-city/map/streetlight-broken-01.png",
  "/assets/story-slice/a2-city/map/roadblock-01.png",
  "/assets/story-slice/a2-city/map/signboard-broken-01.png",
];

const A2_CITY_BUILDINGS = [
  "/assets/story-slice/a2-city/map/building-green-01.png",
  "/assets/story-slice/a2-city/map/building-ochre-01.png",
  "/assets/story-slice/a2-city/map/building-teal-01.png",
];

describe("story slice asset manifest", () => {
  it("lists the required map, lighthouse, and effect assets", () => {
    expect(STORY_SLICE_ASSETS.map.groundTiles).toEqual(A2_CITY_GROUND_TILES);
    expect(STORY_SLICE_ASSETS.map.decorations).toEqual(A2_CITY_DECORATIONS);
    expect(STORY_SLICE_ASSETS.map.buildings).toEqual(A2_CITY_BUILDINGS);
    expect(STORY_SLICE_ASSETS.lighthouse.states).toEqual({
      off: "/assets/story-slice/a2-city/lighthouse/lighthouse-off.png",
      charging:
        "/assets/story-slice/a2-city/lighthouse/lighthouse-charging.png",
      on: "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png",
    });
    expect(STORY_SLICE_ASSETS.lighthouse.coreGlow).toBe(
      "/assets/story-slice/a2-city/lighthouse/lighthouse-core-glow.png",
    );
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

    expect(paths).toContain(
      "/assets/story-slice/a2-city/map/road-straight-01.png",
    );
    expect(paths).toContain(
      "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png",
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
