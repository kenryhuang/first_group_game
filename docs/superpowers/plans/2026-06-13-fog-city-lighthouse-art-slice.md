# Fog City Lighthouse Art Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable art slice for story mode: a bright cartoon fog-city lighthouse scene with blue-green tech beacon visuals, asset manifest support, story-map sprites, and visible lighthouse activation feedback.

**Architecture:** Keep current story-mode gameplay in `PixiWastelandGame` and add a focused visual layer under `src/visual`. The first pass uses an explicit asset manifest, Pixi `Sprite`/`AnimatedSprite` helpers, a story-slice renderer for map/lighthouse visuals, and debug metrics so e2e can verify the new art path without brittle pixel comparisons.

**Tech Stack:** TypeScript, PixiJS v8, Vue/Pinia, Vite static assets, Vitest/jsdom, Playwright.

---

## Scope Boundary

This plan implements the approved spec in `docs/superpowers/specs/2026-06-13-fog-city-lighthouse-art-slice-design.md`.

In scope:

- Story mode center lighthouse art slice only.
- Blue-green tech beacon mood.
- Bright cartoon wasteland palette.
- Asset manifest and first asset file checks.
- Static story slice map sprites and lighthouse state sprites.
- Player and zombie visual adapters that can coexist with existing `Graphics` actors.
- Lighthouse activation pulse tied to existing `E` interaction.
- E2E assertions through `window.__prototypeDebug`.

Out of scope:

- Full story map asset conversion.
- Classic mode visual conversion.
- Boss Rush visual conversion.
- Spine or skeletal animation.
- Map chunk streaming.
- Shader-heavy fog.

## File Structure

- `public/assets/story-slice/README.md`: asset naming, AI prompt, and export rules for the first art pack.
- `public/assets/story-slice/**`: committed PNG files for the first art slice.
- `src/visual/storyArtDirection.ts`: palette, layer names, and lighthouse visual state constants.
- `src/visual/storyArtDirection.test.ts`: tests for the art direction contract.
- `src/visual/storyAssetManifest.ts`: typed manifest for all story-slice PNGs and animation frames.
- `src/visual/storyAssetManifest.test.ts`: tests for manifest structure and animation frame counts.
- `src/visual/storyAssetFiles.test.ts`: tests that every manifest path has a real file in `public/`.
- `src/visual/storySliceRenderer.ts`: Pixi renderer for the center street slice, map props, lighthouse state, and scan pulse.
- `src/visual/storySliceRenderer.test.ts`: tests renderer layer creation, lighthouse state updates, and pulse creation.
- `src/visual/storyActorVisuals.ts`: sprite/animated-sprite adapters attached to existing actor `Graphics` containers.
- `src/visual/storyActorVisuals.test.ts`: tests actor visual adapters without running the whole game loop.
- `src/app/gameStore.ts`: extend `GameMetrics` with story art-slice debug fields.
- `src/game/PixiWastelandGame.ts`: preload assets, create story renderer, attach actor visuals in story mode, and emit debug metrics.
- `tests/e2e/prototype.spec.ts`: extend the existing story-mode test to assert the art slice path is active.

---

### Task 1: Art Direction Contract And Manifest

**Files:**
- Create: `src/visual/storyArtDirection.test.ts`
- Create: `src/visual/storyArtDirection.ts`
- Create: `src/visual/storyAssetManifest.test.ts`
- Create: `src/visual/storyAssetManifest.ts`

- [ ] **Step 1: Write failing tests for the palette, layers, and lighthouse states**

Create `src/visual/storyArtDirection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  STORY_ART_PALETTE,
  STORY_LIGHTHOUSE_VISUAL_STATES,
  STORY_SLICE_LAYER_NAMES,
} from "./storyArtDirection";

describe("story art direction", () => {
  it("defines the bright cartoon wasteland palette", () => {
    expect(STORY_ART_PALETTE.backgroundDarkGreen).toBe(0x202822);
    expect(STORY_ART_PALETTE.roadGreyGreen).toBe(0x2e3630);
    expect(STORY_ART_PALETTE.mechCyan).toBe(0x68e1fd);
    expect(STORY_ART_PALETTE.beaconHighlight).toBe(0xb9fff0);
    expect(STORY_ART_PALETTE.monsterYellowGreen).toBe(0x9ecb62);
  });

  it("keeps the renderer layers stable and ordered", () => {
    expect(STORY_SLICE_LAYER_NAMES).toEqual([
      "ground",
      "decal",
      "prop",
      "lighthouse",
      "effect",
      "worldUi",
    ]);
  });

  it("defines the three lighthouse visual states", () => {
    expect(STORY_LIGHTHOUSE_VISUAL_STATES).toEqual(["off", "charging", "on"]);
  });
});
```

- [ ] **Step 2: Run the art direction test and confirm it fails**

Run:

```bash
npm test -- src/visual/storyArtDirection.test.ts
```

Expected:

```text
FAIL src/visual/storyArtDirection.test.ts
Cannot find module './storyArtDirection'
```

- [ ] **Step 3: Implement the art direction constants**

Create `src/visual/storyArtDirection.ts`:

```ts
export const STORY_ART_PALETTE = {
  backgroundDarkGreen: 0x202822,
  roadGreyGreen: 0x2e3630,
  wastelandOchre: 0x746b58,
  buildingLightGreen: 0x61745e,
  mechCyan: 0x68e1fd,
  techDeepTeal: 0x2c453f,
  beaconHighlight: 0xb9fff0,
  warningOrange: 0xff9f1c,
  monsterYellowGreen: 0x9ecb62,
  hitRed: 0xff5b5b,
} as const;

export const STORY_SLICE_LAYER_NAMES = [
  "ground",
  "decal",
  "prop",
  "lighthouse",
  "effect",
  "worldUi",
] as const;

export type StorySliceLayerName = (typeof STORY_SLICE_LAYER_NAMES)[number];

export const STORY_LIGHTHOUSE_VISUAL_STATES = ["off", "charging", "on"] as const;

export type StoryLighthouseVisualState = (typeof STORY_LIGHTHOUSE_VISUAL_STATES)[number];
```

- [ ] **Step 4: Re-run the art direction test and confirm it passes**

Run:

```bash
npm test -- src/visual/storyArtDirection.test.ts
```

Expected:

```text
PASS src/visual/storyArtDirection.test.ts
```

- [ ] **Step 5: Write failing manifest tests**

Create `src/visual/storyAssetManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "./storyAssetManifest";

describe("story slice asset manifest", () => {
  it("lists the required map, lighthouse, and effect assets", () => {
    expect(STORY_SLICE_ASSETS.map.groundTiles).toHaveLength(4);
    expect(STORY_SLICE_ASSETS.map.decorations).toHaveLength(6);
    expect(Object.keys(STORY_SLICE_ASSETS.lighthouse.states)).toEqual(["off", "charging", "on"]);
    expect(STORY_SLICE_ASSETS.effects.scanRing).toBe("/assets/story-slice/effects/scan-ring.png");
    expect(STORY_SLICE_ASSETS.effects.fogNoise).toBe("/assets/story-slice/effects/fog-noise.png");
  });

  it("defines vanguard and zombie animation frame counts", () => {
    expect(STORY_SLICE_ASSETS.characters.vanguard.animations.idle!.down.frames).toHaveLength(4);
    expect(STORY_SLICE_ASSETS.characters.vanguard.animations.run!.right.frames).toHaveLength(8);
    expect(STORY_SLICE_ASSETS.characters.vanguard.animations.attack!.down.frames).toHaveLength(4);
    expect(STORY_SLICE_ASSETS.characters.vanguard.animations.hit!.down.frames).toHaveLength(2);

    expect(STORY_SLICE_ASSETS.characters.zombie.animations.idle!.down.frames).toHaveLength(4);
    expect(STORY_SLICE_ASSETS.characters.zombie.animations.run!.right.frames).toHaveLength(6);
    expect(STORY_SLICE_ASSETS.characters.zombie.animations.hit!.down.frames).toHaveLength(2);
    expect(STORY_SLICE_ASSETS.characters.zombie.animations.death!.down.frames).toHaveLength(6);
  });

  it("can flatten every asset path for file validation and preloading", () => {
    const paths = getStorySliceAssetPaths(STORY_SLICE_ASSETS);

    expect(paths).toContain("/assets/story-slice/map/road-straight-01.png");
    expect(paths).toContain("/assets/story-slice/lighthouse/lighthouse-on.png");
    expect(paths).toContain("/assets/story-slice/characters/vanguard/idle/down/000.png");
    expect(paths).toContain("/assets/story-slice/characters/zombie/death/down/005.png");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
```

- [ ] **Step 6: Run the manifest test and confirm it fails**

Run:

```bash
npm test -- src/visual/storyAssetManifest.test.ts
```

Expected:

```text
FAIL src/visual/storyAssetManifest.test.ts
Cannot find module './storyAssetManifest'
```

- [ ] **Step 7: Implement the manifest**

Create `src/visual/storyAssetManifest.ts`:

```ts
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
  return Array.from({ length: count }, (_value, index) => `${prefix}/${String(index).padStart(3, "0")}.png`);
}

function directional(prefix: string, animation: StoryAnimationName, count: number, frameMs: number, loop: boolean) {
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
        idle: directional("/assets/story-slice/characters/vanguard", "idle", 4, 130, true),
        run: directional("/assets/story-slice/characters/vanguard", "run", 8, 80, true),
        attack: directional("/assets/story-slice/characters/vanguard", "attack", 4, 70, false),
        hit: directional("/assets/story-slice/characters/vanguard", "hit", 2, 70, false),
      },
    },
    zombie: {
      animations: {
        idle: directional("/assets/story-slice/characters/zombie", "idle", 4, 150, true),
        run: directional("/assets/story-slice/characters/zombie", "run", 6, 95, true),
        hit: directional("/assets/story-slice/characters/zombie", "hit", 2, 70, false),
        death: directional("/assets/story-slice/characters/zombie", "death", 6, 95, false),
      },
    },
  },
};

export function getStorySliceAssetPaths(manifest: StorySliceAssetManifest): string[] {
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
```

- [ ] **Step 8: Re-run manifest tests and commit Task 1**

Run:

```bash
npm test -- src/visual/storyArtDirection.test.ts src/visual/storyAssetManifest.test.ts
```

Expected:

```text
PASS src/visual/storyArtDirection.test.ts
PASS src/visual/storyAssetManifest.test.ts
```

Commit:

```bash
git add src/visual/storyArtDirection.ts src/visual/storyArtDirection.test.ts src/visual/storyAssetManifest.ts src/visual/storyAssetManifest.test.ts
git commit -m "feat: add story art asset manifest"
```

---

### Task 2: First Story-Slice Asset Pack

**Files:**
- Create: `public/assets/story-slice/README.md`
- Create: `public/assets/story-slice/map/*.png`
- Create: `public/assets/story-slice/lighthouse/*.png`
- Create: `public/assets/story-slice/effects/*.png`
- Create: `public/assets/story-slice/characters/vanguard/**/**/*.png`
- Create: `public/assets/story-slice/characters/zombie/**/**/*.png`
- Create: `src/visual/storyAssetFiles.test.ts`

- [ ] **Step 1: Write a failing file-existence test**

Create `src/visual/storyAssetFiles.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the file test and confirm it fails**

Run:

```bash
npm test -- src/visual/storyAssetFiles.test.ts
```

Expected:

```text
FAIL src/visual/storyAssetFiles.test.ts
expected [ ...missing paths... ] to deeply equal []
```

- [ ] **Step 3: Create the asset directory guide**

Create `public/assets/story-slice/README.md`:

```md
# Story Slice Asset Pack

This folder contains the first art-slice assets for the story-mode fog city lighthouse scene.

## Style

- Top-down or slightly top-down 2D game asset.
- Bright cartoon wasteland.
- Clean chunky outline.
- Clear readable silhouette.
- Stylized hand-painted detail.
- Blue-green sci-fi energy accents.
- Transparent background for characters, lighthouse states, props, and effects.
- No text, no watermark, no random symbols.
- Not isometric.

## Base Prompt

top-down 2D game asset, bright cartoon wasteland, clean chunky outline, clear readable shape, stylized hand-painted, high detail but simple silhouette, blue-green sci-fi energy accents, transparent background when applicable, no text, no watermark, consistent camera angle, not isometric, readable for action roguelite

## Export Rules

- PNG format.
- Transparent background for actors, props, lighthouse, and effects.
- Tile textures use 128x128 or 256x256.
- Every frame in one animation keeps the same canvas size and pivot center.
- Character frame files use three-digit indexes such as `000.png`.
```

- [ ] **Step 4: Generate and save the exact map, lighthouse, and effect PNGs**

Generate images using the README base prompt plus each specific prompt below. Save the files exactly at these paths:

```text
public/assets/story-slice/map/road-straight-01.png
Prompt suffix: seamless top-down cracked grey-green city road tile, yellow worn lane stripe fragments, 256x256

public/assets/story-slice/map/road-cracked-01.png
Prompt suffix: seamless top-down cracked asphalt road tile with broken concrete edges, 256x256

public/assets/story-slice/map/concrete-broken-01.png
Prompt suffix: seamless top-down broken concrete plaza tile with warm dust and small cracks, 256x256

public/assets/story-slice/map/wasteland-grass-01.png
Prompt suffix: seamless top-down wasteland grass and dirt tile, warm green and ochre, 256x256

public/assets/story-slice/map/debris-small-01.png
Prompt suffix: transparent top-down small rubble pile, chunky cartoon outline, 128x128

public/assets/story-slice/map/debris-small-02.png
Prompt suffix: transparent top-down small scrap metal and stone debris, chunky cartoon outline, 128x128

public/assets/story-slice/map/wrecked-car-01.png
Prompt suffix: transparent top-down small wrecked car, bright cartoon wasteland, readable silhouette, 256x256

public/assets/story-slice/map/streetlight-broken-01.png
Prompt suffix: transparent top-down broken streetlight prop with blue-green damaged lamp, 128x128

public/assets/story-slice/map/roadblock-01.png
Prompt suffix: transparent top-down cartoon roadblock barricade with warning orange accents, 128x128

public/assets/story-slice/map/signboard-broken-01.png
Prompt suffix: transparent top-down broken signboard with no readable text, 128x128

public/assets/story-slice/map/building-green-01.png
Prompt suffix: transparent slightly top-down small ruined green city building roof, chunky outline, 512x512

public/assets/story-slice/map/building-ochre-01.png
Prompt suffix: transparent slightly top-down small ruined ochre apartment building roof, chunky outline, 512x512

public/assets/story-slice/map/building-teal-01.png
Prompt suffix: transparent slightly top-down small ruined teal tech building roof, chunky outline, 512x512

public/assets/story-slice/lighthouse/lighthouse-off.png
Prompt suffix: transparent top-down sci-fi city beacon tower inactive, dark teal metal, weak cyan indicator lights, 512x512

public/assets/story-slice/lighthouse/lighthouse-charging.png
Prompt suffix: transparent top-down sci-fi city beacon tower charging, blue-green energy segments lighting up, 512x512

public/assets/story-slice/lighthouse/lighthouse-on.png
Prompt suffix: transparent top-down sci-fi city beacon tower fully active, bright cyan core, chunky cartoon outline, 512x512

public/assets/story-slice/lighthouse/lighthouse-core-glow.png
Prompt suffix: transparent circular cyan glow core for sci-fi beacon, soft edge, 512x512

public/assets/story-slice/effects/scan-ring.png
Prompt suffix: transparent top-down blue-green expanding scan ring, clean sci-fi game effect, 512x512

public/assets/story-slice/effects/fog-noise.png
Prompt suffix: seamless semi-transparent pale cyan fog noise texture, soft cartoon mist, 512x512

public/assets/story-slice/effects/energy-bolt.png
Prompt suffix: transparent top-down small blue-green energy bullet projectile, chunky cartoon style, 128x128

public/assets/story-slice/effects/hit-spark.png
Prompt suffix: transparent cartoon impact spark, blue-green and warm white, 128x128
```

- [ ] **Step 5: Generate and save vanguard frames**

For each path produced by `STORY_SLICE_ASSETS.characters.vanguard`, generate or derive a frame using this base prompt:

```text
transparent top-down 2D game sprite frame, bright cartoon vanguard mech, clean chunky outline, cyan energy core, readable silhouette, same canvas and pivot for every frame, no text, no watermark
```

Use these motion suffixes:

```text
idle/down: front-facing idle stance
idle/up: back-facing idle stance
idle/left: left-facing idle stance
idle/right: right-facing idle stance
run/down: front-facing running motion
run/up: back-facing running motion
run/left: left-facing running motion
run/right: right-facing running motion
attack/down: front-facing firing motion
attack/up: back-facing firing motion
attack/left: left-facing firing motion
attack/right: right-facing firing motion
hit/down: front-facing hit reaction
hit/up: back-facing hit reaction
hit/left: left-facing hit reaction
hit/right: right-facing hit reaction
```

Save frame files using the exact manifest paths, such as:

```text
public/assets/story-slice/characters/vanguard/idle/down/000.png
public/assets/story-slice/characters/vanguard/run/right/007.png
public/assets/story-slice/characters/vanguard/hit/up/001.png
```

- [ ] **Step 6: Generate and save zombie frames**

For each path produced by `STORY_SLICE_ASSETS.characters.zombie`, generate or derive a frame using this base prompt:

```text
transparent top-down 2D game sprite frame, bright cartoon mutant zombie, yellow-green body, clean chunky outline, readable silhouette, same canvas and pivot for every frame, no text, no watermark
```

Use these motion suffixes:

```text
idle/down: front-facing shambling idle
idle/up: back-facing shambling idle
idle/left: left-facing shambling idle
idle/right: right-facing shambling idle
run/down: front-facing chase run
run/up: back-facing chase run
run/left: left-facing chase run
run/right: right-facing chase run
hit/down: front-facing hit reaction
hit/up: back-facing hit reaction
hit/left: left-facing hit reaction
hit/right: right-facing hit reaction
death/down: front-facing collapse
death/up: back-facing collapse
death/left: left-facing collapse
death/right: right-facing collapse
```

Save frame files using the exact manifest paths, such as:

```text
public/assets/story-slice/characters/zombie/idle/down/000.png
public/assets/story-slice/characters/zombie/run/left/005.png
public/assets/story-slice/characters/zombie/death/down/005.png
```

- [ ] **Step 7: Run file and manifest tests**

Run:

```bash
npm test -- src/visual/storyAssetManifest.test.ts src/visual/storyAssetFiles.test.ts
```

Expected:

```text
PASS src/visual/storyAssetManifest.test.ts
PASS src/visual/storyAssetFiles.test.ts
```

- [ ] **Step 8: Commit Task 2**

Commit:

```bash
git add public/assets/story-slice src/visual/storyAssetFiles.test.ts
git commit -m "feat: add story art slice assets"
```

---

### Task 3: Story Slice Renderer

**Files:**
- Create: `src/visual/storySliceRenderer.test.ts`
- Create: `src/visual/storySliceRenderer.ts`

- [ ] **Step 1: Write failing renderer tests**

Create `src/visual/storySliceRenderer.test.ts`:

```ts
import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_SLICE_LAYER_NAMES } from "./storyArtDirection";
import { createStorySliceRenderer } from "./storySliceRenderer";

describe("story slice renderer", () => {
  it("creates stable named layers under one root", () => {
    const world = new Container();
    const renderer = createStorySliceRenderer({
      world,
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    expect(world.children).toContain(renderer.root);
    expect(Object.keys(renderer.layers)).toEqual([...STORY_SLICE_LAYER_NAMES]);
    expect(renderer.debugSpriteCount()).toBeGreaterThanOrEqual(18);
  });

  it("updates lighthouse visual state", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    expect(renderer.getLighthouseVisualState()).toBe("off");

    renderer.setLighthouseCharging();
    expect(renderer.getLighthouseVisualState()).toBe("charging");

    renderer.setLighthouseLit(true);
    expect(renderer.getLighthouseVisualState()).toBe("on");

    renderer.setLighthouseLit(false);
    expect(renderer.getLighthouseVisualState()).toBe("off");
  });

  it("adds a scan pulse to the effect layer", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });
    const beforeCount = renderer.layers.effect.children.length;

    renderer.playScanPulse(STORY_CENTER_LIGHTHOUSE.position);

    expect(renderer.layers.effect.children.length).toBe(beforeCount + 1);
  });
});
```

- [ ] **Step 2: Run renderer tests and confirm they fail**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
FAIL src/visual/storySliceRenderer.test.ts
Cannot find module './storySliceRenderer'
```

- [ ] **Step 3: Implement the renderer**

Create `src/visual/storySliceRenderer.ts`:

```ts
import { Container, Sprite } from "pixi.js";
import { gsap } from "gsap";
import {
  STORY_ART_PALETTE,
  STORY_LIGHTHOUSE_VISUAL_STATES,
  STORY_SLICE_LAYER_NAMES,
  type StoryLighthouseVisualState,
  type StorySliceLayerName,
} from "./storyArtDirection";
import { STORY_SLICE_ASSETS } from "./storyAssetManifest";

export interface StorySliceRendererOptions {
  world: Container;
  center: { x: number; y: number };
  lit: boolean;
}

export interface StorySliceRenderer {
  root: Container;
  layers: Record<StorySliceLayerName, Container>;
  setLighthouseCharging(): void;
  setLighthouseLit(lit: boolean): void;
  getLighthouseVisualState(): StoryLighthouseVisualState;
  playScanPulse(origin: { x: number; y: number }): void;
  debugSpriteCount(): number;
  destroy(): void;
}

function createLayers(root: Container): Record<StorySliceLayerName, Container> {
  const entries = STORY_SLICE_LAYER_NAMES.map((name) => {
    const layer = new Container();
    layer.label = `story-${name}-layer`;
    root.addChild(layer);
    return [name, layer] as const;
  });

  return Object.fromEntries(entries) as Record<StorySliceLayerName, Container>;
}

function makeSprite(path: string, x: number, y: number, scale = 1): Sprite {
  const sprite = Sprite.from(path);
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  sprite.scale.set(scale);
  return sprite;
}

function addGround(layers: Record<StorySliceLayerName, Container>, center: { x: number; y: number }): void {
  const tileSize = 256;
  const [road, cracked, concrete, grass] = STORY_SLICE_ASSETS.map.groundTiles;
  for (let ix = -4; ix <= 4; ix += 1) {
    for (let iy = -3; iy <= 3; iy += 1) {
      const isRoad = Math.abs(iy) <= 1 || Math.abs(ix) <= 1;
      const asset = isRoad ? (Math.abs(ix + iy) % 2 === 0 ? road : cracked) : (Math.abs(ix) % 2 === 0 ? concrete : grass);
      layers.ground.addChild(makeSprite(asset, center.x + ix * tileSize, center.y + iy * tileSize, 1));
    }
  }
}

function addProps(layers: Record<StorySliceLayerName, Container>, center: { x: number; y: number }): void {
  const [buildingGreen, buildingOchre, buildingTeal] = STORY_SLICE_ASSETS.map.buildings;
  layers.prop.addChild(makeSprite(buildingGreen, center.x - 520, center.y - 390, 0.72));
  layers.prop.addChild(makeSprite(buildingOchre, center.x + 540, center.y - 360, 0.7));
  layers.prop.addChild(makeSprite(buildingTeal, center.x - 440, center.y + 430, 0.66));

  const [debrisOne, debrisTwo, wreckedCar, streetlight, roadblock, signboard] = STORY_SLICE_ASSETS.map.decorations;
  layers.decal.addChild(makeSprite(debrisOne, center.x - 180, center.y + 140, 0.78));
  layers.decal.addChild(makeSprite(debrisTwo, center.x + 230, center.y - 110, 0.78));
  layers.prop.addChild(makeSprite(wreckedCar, center.x + 360, center.y + 190, 0.72));
  layers.prop.addChild(makeSprite(streetlight, center.x - 250, center.y - 245, 0.78));
  layers.prop.addChild(makeSprite(roadblock, center.x + 85, center.y + 310, 0.82));
  layers.prop.addChild(makeSprite(signboard, center.x - 20, center.y - 335, 0.82));
}

export function createStorySliceRenderer(options: StorySliceRendererOptions): StorySliceRenderer {
  const root = new Container();
  root.label = "story-art-slice-root";
  options.world.addChild(root);

  const layers = createLayers(root);
  addGround(layers, options.center);
  addProps(layers, options.center);

  let lighthouseState: StoryLighthouseVisualState = options.lit ? "on" : "off";
  const lighthouse = makeSprite(STORY_SLICE_ASSETS.lighthouse.states[lighthouseState], options.center.x, options.center.y, 0.82);
  lighthouse.label = "story-center-lighthouse-sprite";
  layers.lighthouse.addChild(lighthouse);

  const coreGlow = makeSprite(STORY_SLICE_ASSETS.lighthouse.coreGlow, options.center.x, options.center.y, 0.72);
  coreGlow.label = "story-center-lighthouse-core-glow";
  coreGlow.alpha = options.lit ? 0.82 : 0.16;
  layers.effect.addChild(coreGlow);

  const setState = (state: StoryLighthouseVisualState): void => {
    lighthouseState = state;
    lighthouse.texture = Sprite.from(STORY_SLICE_ASSETS.lighthouse.states[state]).texture;
    coreGlow.alpha = state === "on" ? 0.82 : state === "charging" ? 0.46 : 0.16;
  };

  return {
    root,
    layers,
    setLighthouseCharging: () => setState("charging"),
    setLighthouseLit: (lit: boolean) => setState(lit ? "on" : "off"),
    getLighthouseVisualState: () => lighthouseState,
    playScanPulse(origin: { x: number; y: number }): void {
      const pulse = makeSprite(STORY_SLICE_ASSETS.effects.scanRing, origin.x, origin.y, 0.22);
      pulse.tint = STORY_ART_PALETTE.mechCyan;
      pulse.alpha = 0.82;
      layers.effect.addChild(pulse);
      gsap.to(pulse.scale, { x: 3.4, y: 3.4, duration: 0.72, ease: "power2.out" });
      gsap.to(pulse, {
        alpha: 0,
        duration: 0.72,
        ease: "power2.out",
        onComplete: () => pulse.destroy(),
      });
    },
    debugSpriteCount(): number {
      let count = 0;
      for (const layer of Object.values(layers)) {
        count += layer.children.length;
      }
      return count;
    },
    destroy(): void {
      root.destroy({ children: true });
    },
  };
}

export function isStoryLighthouseVisualState(value: string): value is StoryLighthouseVisualState {
  return STORY_LIGHTHOUSE_VISUAL_STATES.includes(value as StoryLighthouseVisualState);
}
```

- [ ] **Step 4: Run renderer tests and commit Task 3**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
PASS src/visual/storySliceRenderer.test.ts
```

Commit:

```bash
git add src/visual/storySliceRenderer.ts src/visual/storySliceRenderer.test.ts
git commit -m "feat: render story lighthouse art slice"
```

---

### Task 4: Actor Sprite Visual Adapters

**Files:**
- Create: `src/visual/storyActorVisuals.test.ts`
- Create: `src/visual/storyActorVisuals.ts`

- [ ] **Step 1: Write failing actor adapter tests**

Create `src/visual/storyActorVisuals.test.ts`:

```ts
import { Graphics } from "pixi.js";
import { describe, expect, it } from "vitest";
import {
  attachStoryActorVisual,
  getStoryActorDirection,
} from "./storyActorVisuals";

describe("story actor visuals", () => {
  it("chooses a cardinal direction from movement", () => {
    expect(getStoryActorDirection({ x: 1, y: 0 })).toBe("right");
    expect(getStoryActorDirection({ x: -1, y: 0 })).toBe("left");
    expect(getStoryActorDirection({ x: 0, y: -1 })).toBe("up");
    expect(getStoryActorDirection({ x: 0, y: 1 })).toBe("down");
    expect(getStoryActorDirection({ x: 0.1, y: 0.8 })).toBe("down");
  });

  it("attaches an animated sprite child to an existing graphics actor", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "idle", "down");

    expect(view.children).toContain(visual.sprite);
    expect(visual.character).toBe("vanguard");
    expect(visual.animation).toBe("idle");
    expect(visual.direction).toBe("down");
  });

  it("updates animation and flashes without removing the actor view", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "zombie", "run", "left");

    visual.play("hit", "left");
    visual.flash(0xff5b5b);

    expect(visual.animation).toBe("hit");
    expect(visual.direction).toBe("left");
    expect(view.destroyed).toBe(false);
  });
});
```

- [ ] **Step 2: Run actor adapter tests and confirm they fail**

Run:

```bash
npm test -- src/visual/storyActorVisuals.test.ts
```

Expected:

```text
FAIL src/visual/storyActorVisuals.test.ts
Cannot find module './storyActorVisuals'
```

- [ ] **Step 3: Implement actor visual adapters**

Create `src/visual/storyActorVisuals.ts`:

```ts
import { AnimatedSprite, Graphics, Texture } from "pixi.js";
import { STORY_SLICE_ASSETS, type StoryAnimationName, type StoryDirection } from "./storyAssetManifest";
import { STORY_ART_PALETTE } from "./storyArtDirection";

export type StoryActorCharacter = "vanguard" | "zombie";

export interface StoryActorVisual {
  character: StoryActorCharacter;
  animation: StoryAnimationName;
  direction: StoryDirection;
  sprite: AnimatedSprite;
  play(animation: StoryAnimationName, direction: StoryDirection): void;
  flash(tint?: number): void;
  destroy(): void;
}

export function getStoryActorDirection(vector: { x: number; y: number }): StoryDirection {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x >= 0 ? "right" : "left";
  }
  return vector.y >= 0 ? "down" : "up";
}

function getTextures(character: StoryActorCharacter, animation: StoryAnimationName, direction: StoryDirection): Texture[] {
  const definition = STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction];
  if (!definition) {
    return [Texture.WHITE];
  }
  return definition.frames.map((frame) => Texture.from(frame));
}

function getFrameMs(character: StoryActorCharacter, animation: StoryAnimationName, direction: StoryDirection): number {
  return STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]?.frameMs ?? 120;
}

function shouldLoop(character: StoryActorCharacter, animation: StoryAnimationName, direction: StoryDirection): boolean {
  return STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]?.loop ?? true;
}

export function attachStoryActorVisual(
  view: Graphics,
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): StoryActorVisual {
  view.clear();

  const sprite = new AnimatedSprite(getTextures(character, animation, direction));
  sprite.anchor.set(0.5);
  sprite.scale.set(character === "vanguard" ? 0.44 : 0.34);
  sprite.animationSpeed = 1000 / getFrameMs(character, animation, direction) / 60;
  sprite.loop = shouldLoop(character, animation, direction);
  sprite.play();
  view.addChild(sprite);

  const visual: StoryActorVisual = {
    character,
    animation,
    direction,
    sprite,
    play(nextAnimation: StoryAnimationName, nextDirection: StoryDirection): void {
      visual.animation = nextAnimation;
      visual.direction = nextDirection;
      sprite.textures = getTextures(character, nextAnimation, nextDirection);
      sprite.animationSpeed = 1000 / getFrameMs(character, nextAnimation, nextDirection) / 60;
      sprite.loop = shouldLoop(character, nextAnimation, nextDirection);
      sprite.gotoAndPlay(0);
    },
    flash(tint = STORY_ART_PALETTE.hitRed): void {
      const previousTint = sprite.tint;
      sprite.tint = tint;
      window.setTimeout(() => {
        if (sprite.destroyed) return;
        sprite.tint = previousTint;
      }, 80);
    },
    destroy(): void {
      sprite.destroy();
    },
  };

  return visual;
}
```

- [ ] **Step 4: Run actor visual tests and commit Task 4**

Run:

```bash
npm test -- src/visual/storyActorVisuals.test.ts
```

Expected:

```text
PASS src/visual/storyActorVisuals.test.ts
```

Commit:

```bash
git add src/visual/storyActorVisuals.ts src/visual/storyActorVisuals.test.ts
git commit -m "feat: add story actor sprite visuals"
```

---

### Task 5: Integrate Story Art Slice Into Game Runtime

**Files:**
- Modify: `src/app/gameStore.ts`
- Modify: `src/game/PixiWastelandGame.ts`

- [ ] **Step 1: Extend metrics with art-slice debug fields**

Modify `GameMetrics` in `src/app/gameStore.ts`:

```ts
export interface GameMetrics {
  enemyCount: number;
  bossCount: number;
  bulletCount: number;
  buildingCount: number;
  mapWidth: number;
  mapHeight: number;
  attackMode: "auto" | "manual";
  bossName: string | null;
  bossNames: string[];
  insideBuilding: boolean;
  currentBuildingId: string | null;
  playerHealth: number;
  storyVisionRadius?: number;
  storyLitLighthouseCount?: number;
  storyMonsterPressureMultiplier?: number;
  selectedStoryMechId?: StoryMechId | null;
  storyArtSliceEnabled?: boolean;
  storyLighthouseVisualState?: "off" | "charging" | "on";
  storyArtSpriteCount?: number;
}
```

Add these defaults in `createInitialMetrics()`:

```ts
storyArtSliceEnabled: false,
storyLighthouseVisualState: undefined,
storyArtSpriteCount: undefined,
```

Add assignments in `syncMetrics(metrics: GameMetrics)`:

```ts
this.storyArtSliceEnabled = metrics.storyArtSliceEnabled;
this.storyLighthouseVisualState = metrics.storyLighthouseVisualState;
this.storyArtSpriteCount = metrics.storyArtSpriteCount;
```

- [ ] **Step 2: Import visual modules in `PixiWastelandGame.ts`**

Add imports near the existing imports:

```ts
import { Assets, Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
} from "../visual/storyAssetManifest";
import {
  attachStoryActorVisual,
  getStoryActorDirection,
  type StoryActorVisual,
} from "../visual/storyActorVisuals";
import {
  createStorySliceRenderer,
  type StorySliceRenderer,
} from "../visual/storySliceRenderer";
```

Replace the existing Pixi import line instead of adding a second Pixi import.

- [ ] **Step 3: Add story visual fields to the class**

Add private fields near other class fields:

```ts
private storySliceRenderer?: StorySliceRenderer;
private playerStoryVisual?: StoryActorVisual;
private readonly enemyStoryVisuals = new WeakMap<EnemyActor, StoryActorVisual>();
```

- [ ] **Step 4: Preload story assets before drawing the world**

In `start()`, before `this.drawWorld();`, add:

```ts
if (this.isStoryMode()) {
  await Assets.load(getStorySliceAssetPaths(STORY_SLICE_ASSETS));
}
```

- [ ] **Step 5: Create the renderer at the end of `drawStoryCity()`**

At the end of `drawStoryCity()`, after `subLabel` is added, add:

```ts
this.storySliceRenderer = createStorySliceRenderer({
  world: this.world,
  center: STORY_CENTER_LIGHTHOUSE.position,
  lit: this.litStoryLighthouseIds.has(STORY_CENTER_LIGHTHOUSE.id),
});
```

- [ ] **Step 6: Attach the vanguard visual in story mode**

In `createPlayer()`, replace:

```ts
const view = new Graphics();
this.drawPlayerMech(view);
```

with:

```ts
const view = new Graphics();
if (this.isStoryMode()) {
  this.playerStoryVisual = attachStoryActorVisual(view, "vanguard", "idle", "down");
} else {
  this.drawPlayerMech(view);
}
```

In `movePlayer(deltaMs: number)`, after updating `this.movementDirection`, add:

```ts
if (this.playerStoryVisual) {
  const direction = getStoryActorDirection(this.movementDirection);
  const moving = dx !== 0 || dy !== 0;
  const nextAnimation = moving ? "run" : "idle";
  if (this.playerStoryVisual.animation !== nextAnimation || this.playerStoryVisual.direction !== direction) {
    this.playerStoryVisual.play(nextAnimation, direction);
  }
}
```

- [ ] **Step 7: Attach zombie visuals in story mode**

In `spawnEnemyActor(...)`, after the enemy object is created and pushed, add:

```ts
if (this.isStoryMode() && kind === "zombie") {
  const visual = attachStoryActorVisual(view, "zombie", "run", "down");
  this.enemyStoryVisuals.set(enemy, visual);
}
```

Place that block before `return enemy;`.

In `updateEnemies(deltaMs: number)`, inside the loop after enemy movement direction is known, add this minimal animation update using current player direction:

```ts
const storyVisual = this.enemyStoryVisuals.get(enemy);
if (storyVisual && this.player) {
  const direction = getStoryActorDirection({ x: this.player.x - enemy.x, y: this.player.y - enemy.y });
  if (storyVisual.animation !== "run" || storyVisual.direction !== direction) {
    storyVisual.play("run", direction);
  }
}
```

- [ ] **Step 8: Route hit flashes through sprite visuals**

In `flashEnemy(enemy: EnemyActor)`, add this at the top:

```ts
const storyVisual = this.enemyStoryVisuals.get(enemy);
if (storyVisual) {
  storyVisual.flash();
  return;
}
```

In `flashPlayerMech()`, replace the method body with:

```ts
if (!this.player) return;
if (this.playerStoryVisual) {
  this.playerStoryVisual.flash();
  return;
}
this.drawPlayerMech(this.player.view, 0xff4d6d);
window.setTimeout(() => {
  if (!this.player || this.player.view.destroyed) return;
  this.drawPlayerMech(this.player.view);
}, 80);
```

- [ ] **Step 9: Trigger lighthouse visuals on interaction**

In `tryActivateStoryLighthouse()`, before `this.litStoryLighthouseIds.add(...)`, add:

```ts
this.storySliceRenderer?.setLighthouseCharging();
```

After `this.litStoryLighthouseIds.add(...)`, add:

```ts
this.storySliceRenderer?.setLighthouseLit(true);
this.storySliceRenderer?.playScanPulse(STORY_CENTER_LIGHTHOUSE.position);
```

- [ ] **Step 10: Clean up renderer and emit metrics**

In `destroy()`, before `this.app.destroy(...)`, add:

```ts
this.storySliceRenderer?.destroy();
this.storySliceRenderer = undefined;
this.playerStoryVisual = undefined;
```

In `emitMetrics()`, add these properties to the `metrics` object:

```ts
storyArtSliceEnabled: this.isStoryMode() && Boolean(this.storySliceRenderer),
storyLighthouseVisualState: this.storySliceRenderer?.getLighthouseVisualState(),
storyArtSpriteCount: this.storySliceRenderer?.debugSpriteCount(),
```

- [ ] **Step 11: Run focused tests and fix type errors**

Run:

```bash
npm test -- src/app/gameStore.test.ts src/visual/storyArtDirection.test.ts src/visual/storyAssetManifest.test.ts src/visual/storyActorVisuals.test.ts src/visual/storySliceRenderer.test.ts
npm run build
```

Expected:

```text
PASS src/app/gameStore.test.ts
PASS src/visual/storyArtDirection.test.ts
PASS src/visual/storyAssetManifest.test.ts
PASS src/visual/storyActorVisuals.test.ts
PASS src/visual/storySliceRenderer.test.ts
✓ built
```

- [ ] **Step 12: Commit Task 5**

Commit:

```bash
git add src/app/gameStore.ts src/game/PixiWastelandGame.ts
git commit -m "feat: enable story art slice runtime"
```

---

### Task 6: E2E Coverage For The Art Slice

**Files:**
- Modify: `tests/e2e/prototype.spec.ts`

- [ ] **Step 1: Extend the existing story e2e test**

In `tests/e2e/prototype.spec.ts`, inside `test("story mode first phase starts through intro, mech select, and fog lighthouse", ...)`, after the canvas visible-pixel assertion and before pressing `E`, add:

```ts
await expect
  .poll(() => page.evaluate(() => window.__prototypeDebug?.storyArtSliceEnabled ?? false))
  .toBe(true);
await expect
  .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLighthouseVisualState ?? null))
  .toBe("off");
await expect
  .poll(() => page.evaluate(() => window.__prototypeDebug?.storyArtSpriteCount ?? 0))
  .toBeGreaterThanOrEqual(18);
```

After the existing assertion that `storyMonsterPressureMultiplier` is greater than 1, add:

```ts
await expect
  .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLighthouseVisualState ?? null))
  .toBe("on");
```

- [ ] **Step 2: Run e2e and confirm story art path passes**

Run:

```bash
npm run e2e
```

Expected:

```text
5 passed
2 skipped
```

- [ ] **Step 3: Commit Task 6**

Commit:

```bash
git add tests/e2e/prototype.spec.ts
git commit -m "test: cover story art slice e2e"
```

---

### Task 7: Full Verification And Review

**Files:**
- Test: existing test suite
- Test: production build
- Test: e2e suite

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm test
```

Expected:

```text
Test Files 34 passed
Tests pass with 0 failed
```

The exact file count may be higher if more tests were added. The required condition is 0 failed tests.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
✓ built
```

The existing large chunk warning can remain unless it changes into an error.

- [ ] **Step 3: Run Playwright e2e**

Run:

```bash
npm run e2e
```

Expected:

```text
5 passed
2 skipped
```

- [ ] **Step 4: Manual browser smoke check**

Run:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5317/
```

Check:

```text
1. Main menu renders.
2. Click 剧情模式.
3. Click 选择机甲.
4. Click 先锋机甲.
5. Canvas renders a brighter story start area with new map/lighthouse art.
6. Press E near the lighthouse.
7. Lighthouse switches to the lit state and a blue-green scan pulse appears.
8. HUD still shows 灯塔 1/1 and monster pressure greater than x1.
9. Return to main menu still removes the canvas.
```

- [ ] **Step 5: Review final diff**

Run:

```bash
git status --short
git log --oneline -7
```

Expected:

```text
git status --short
# no uncommitted files

git log --oneline -7
# includes the task commits from this plan
```
