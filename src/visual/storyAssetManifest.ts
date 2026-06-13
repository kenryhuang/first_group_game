import type { StoryLighthouseVisualState } from "./storyArtDirection";

export type StoryDirection = "down" | "up" | "left" | "right";
export type StoryAnimationName = "idle" | "run" | "attack" | "hit" | "death";

export interface StoryAnimationDefinition {
  frames: string[];
  frameMs: number;
  loop: boolean;
}

export type StoryDirectionalAnimations = Partial<
  Record<StoryAnimationName, Record<StoryDirection, StoryAnimationDefinition>>
>;

export interface StoryCharacterAssetDefinition {
  animations: StoryDirectionalAnimations;
}

export interface StorySliceAssetManifest {
  map: {
    groundTiles: string[];
    decorations: string[];
    buildings: string[];
  };
  lighthouse: {
    states: Record<StoryLighthouseVisualState, string>;
    coreGlow: string;
  };
  effects: {
    scanRing: string;
    fogNoise: string;
    energyBolt: string;
    hitSpark: string;
  };
  characters: {
    vanguard: StoryCharacterAssetDefinition;
    zombie: StoryCharacterAssetDefinition;
  };
}

function sequence(prefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_value, index) => `${prefix}/${String(index).padStart(3, "0")}.png`,
  );
}

function directional(
  prefix: string,
  animation: StoryAnimationName,
  count: number,
  frameMs: number,
  loop: boolean,
) {
  return {
    down: { frames: sequence(`${prefix}/${animation}/down`, count), frameMs, loop },
    up: { frames: sequence(`${prefix}/${animation}/up`, count), frameMs, loop },
    left: { frames: sequence(`${prefix}/${animation}/left`, count), frameMs, loop },
    right: { frames: sequence(`${prefix}/${animation}/right`, count), frameMs, loop },
  };
}

export const STORY_SLICE_ASSETS: StorySliceAssetManifest = {
  map: {
    groundTiles: [
      "/assets/story-slice/map/road-straight-01.png",
      "/assets/story-slice/map/road-cracked-01.png",
      "/assets/story-slice/map/concrete-broken-01.png",
      "/assets/story-slice/map/wasteland-grass-01.png",
    ],
    decorations: [
      "/assets/story-slice/map/debris-small-01.png",
      "/assets/story-slice/map/debris-small-02.png",
      "/assets/story-slice/map/wrecked-car-01.png",
      "/assets/story-slice/map/streetlight-broken-01.png",
      "/assets/story-slice/map/roadblock-01.png",
      "/assets/story-slice/map/signboard-broken-01.png",
    ],
    buildings: [
      "/assets/story-slice/map/building-green-01.png",
      "/assets/story-slice/map/building-ochre-01.png",
      "/assets/story-slice/map/building-teal-01.png",
    ],
  },
  lighthouse: {
    states: {
      off: "/assets/story-slice/lighthouse/lighthouse-off.png",
      charging: "/assets/story-slice/lighthouse/lighthouse-charging.png",
      on: "/assets/story-slice/lighthouse/lighthouse-on.png",
    },
    coreGlow: "/assets/story-slice/lighthouse/lighthouse-core-glow.png",
  },
  effects: {
    scanRing: "/assets/story-slice/effects/scan-ring.png",
    fogNoise: "/assets/story-slice/effects/fog-noise.png",
    energyBolt: "/assets/story-slice/effects/energy-bolt.png",
    hitSpark: "/assets/story-slice/effects/hit-spark.png",
  },
  characters: {
    vanguard: {
      animations: {
        idle: directional(
          "/assets/story-slice/characters/vanguard",
          "idle",
          4,
          130,
          true,
        ),
        run: directional(
          "/assets/story-slice/characters/vanguard",
          "run",
          8,
          80,
          true,
        ),
        attack: directional(
          "/assets/story-slice/characters/vanguard",
          "attack",
          4,
          70,
          false,
        ),
        hit: directional(
          "/assets/story-slice/characters/vanguard",
          "hit",
          2,
          70,
          false,
        ),
      },
    },
    zombie: {
      animations: {
        idle: directional(
          "/assets/story-slice/characters/zombie",
          "idle",
          4,
          150,
          true,
        ),
        run: directional(
          "/assets/story-slice/characters/zombie",
          "run",
          6,
          95,
          true,
        ),
        hit: directional(
          "/assets/story-slice/characters/zombie",
          "hit",
          2,
          70,
          false,
        ),
        death: directional(
          "/assets/story-slice/characters/zombie",
          "death",
          6,
          95,
          false,
        ),
      },
    },
  },
};

export function getStorySliceAssetPaths(
  manifest: StorySliceAssetManifest,
): string[] {
  const paths = [
    ...manifest.map.groundTiles,
    ...manifest.map.decorations,
    ...manifest.map.buildings,
    ...Object.values(manifest.lighthouse.states),
    manifest.lighthouse.coreGlow,
    manifest.effects.scanRing,
    manifest.effects.fogNoise,
    manifest.effects.energyBolt,
    manifest.effects.hitSpark,
  ];

  for (const character of Object.values(manifest.characters)) {
    for (const animation of Object.values(character.animations)) {
      if (!animation) continue;
      for (const directionalAnimation of Object.values(animation)) {
        paths.push(...directionalAnimation.frames);
      }
    }
  }

  return [...new Set(paths)];
}
