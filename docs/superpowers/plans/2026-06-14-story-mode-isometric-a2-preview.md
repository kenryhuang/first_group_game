# Story Mode Isometric A2 Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable A2 preview slice for story mode: a true tile-authored isometric city plaza with diagonal roads, building footprints, prop occlusion metadata, and debug/screenshot verification.

**Architecture:** Keep A1 projection math unchanged and add a data-driven isometric map layer above it. Story gameplay continues in current world coordinates; the renderer converts tile coordinates into world anchor points and then projects them through existing story projection helpers. The first pass focuses on visual structure, depth, metrics, and verification, not full tile movement or pathfinding.

**Tech Stack:** TypeScript, PixiJS v8 `Container`/`Graphics`/`Sprite`, Pinia store metrics, Vitest/jsdom, Playwright, Vite.

---

## Scope Boundary

This plan implements `docs/superpowers/specs/2026-06-14-story-mode-isometric-a2-preview-design.md`.

In scope:

- Story mode only.
- A compact A2 preview map around the starting lighthouse.
- Tile-authored ground: plaza, road, cracked road, curb, concrete, stain, rubble, blocked.
- Tile-authored props with footprints and depth metadata.
- Renderer debug accessors for tile map stats and blocked footprints.
- Store, e2e, and inspection script metrics proving A2 preview is active.
- Visual screenshot inspection.

Out of scope:

- Rewriting movement into tile-grid movement.
- Full pathfinding rewrite.
- Full story region replacement.
- Classic mode and Boss Rush visual changes.
- Final full hand-painted isometric asset generation.

## File Structure

- Create `src/visual/storyIsoMap.ts`: focused A2 preview map data, tile/prop types, tile-to-world helpers, map stats helpers.
- Create `src/visual/storyIsoMap.test.ts`: validates map mode, counts, road lanes, prop footprints, and lighthouse anchor.
- Modify `src/visual/storySliceRenderer.ts`: consumes `StoryIsoMapDefinition`, renders map-driven diamond ground and map-driven volume props, exposes debug stats.
- Modify `src/visual/storySliceRenderer.test.ts`: updates ground/prop tests to assert A2 tile map output.
- Modify `src/app/gameStore.ts`: adds A2 preview metric fields to the debug/store contract.
- Modify `src/app/gameStore.test.ts`: verifies A2 preview metric defaults and sync behavior.
- Modify `src/game/PixiWastelandGame.ts`: emits A2 preview metrics from the story slice renderer.
- Modify `tests/e2e/prototype.spec.ts`: asserts A2 preview mode and stable tile/prop counts in real browser story mode.
- Modify `scripts/inspect-story-2-5d.mjs`: prints A2 preview metrics and saves `/tmp/story-isometric-a2-preview.png` when requested.

---

### Task 1: Story Isometric Map Data

**Files:**
- Create: `src/visual/storyIsoMap.test.ts`
- Create: `src/visual/storyIsoMap.ts`

- [ ] **Step 1: Write the failing map data tests**

Create `src/visual/storyIsoMap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_2_5D_CONFIG } from "./story2_5dProjection";
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoBlockedFootprints,
  getStoryIsoMapStats,
  getStoryIsoPropBasePoint,
  getStoryIsoTileWorldPoint,
  isStoryIsoRoadTile,
} from "./storyIsoMap";

describe("story isometric preview map", () => {
  it("defines a compact A2 preview map around the lighthouse", () => {
    const stats = getStoryIsoMapStats(STORY_A2_PREVIEW_MAP);

    expect(STORY_A2_PREVIEW_MAP.mode).toBe("a2-preview");
    expect(STORY_A2_PREVIEW_MAP.tileSize).toBe(
      STORY_2_5D_CONFIG.isoLogicalTileSize,
    );
    expect(stats).toEqual({
      mode: "a2-preview",
      tileCount: 143,
      roadTileCount: 25,
      propCount: 8,
      blockedFootprintCount: 6,
    });
    expect(STORY_A2_PREVIEW_MAP.tiles[0]).toEqual({
      x: -6,
      y: -5,
      kind: "curb",
    });
  });

  it("places the lighthouse on the center tile and maps tile anchors to world points", () => {
    const center = STORY_CENTER_LIGHTHOUSE.position;
    const lighthouse = STORY_A2_PREVIEW_MAP.props.find(
      (prop) => prop.role === "lighthouse",
    );

    expect(lighthouse?.tile).toEqual({ x: 0, y: 0 });
    expect(lighthouse?.footprint).toEqual({ x: -1, y: -1, width: 2, height: 2 });
    expect(getStoryIsoTileWorldPoint({ x: 0, y: 0 }, center)).toEqual(center);
    expect(getStoryIsoTileWorldPoint({ x: -3, y: -3 }, center)).toEqual({
      x: center.x - 768,
      y: center.y - 768,
    });
  });

  it("marks diagonal roads and blocked footprints for the preview slice", () => {
    const roadTiles = STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile);
    const blockedFootprints = getStoryIsoBlockedFootprints(STORY_A2_PREVIEW_MAP);
    const firstBuilding = STORY_A2_PREVIEW_MAP.props[0];

    expect(roadTiles).toHaveLength(25);
    expect(roadTiles).toContainEqual({ x: -5, y: -5, kind: "road" });
    expect(roadTiles).toContainEqual({ x: 5, y: -5, kind: "road" });
    expect(roadTiles).toContainEqual({ x: 1, y: 0, kind: "roadCracked" });
    expect(blockedFootprints).toHaveLength(6);
    expect(blockedFootprints).toContainEqual({
      x: -4,
      y: -4,
      width: 2,
      height: 2,
    });
    expect(getStoryIsoPropBasePoint(firstBuilding, STORY_CENTER_LIGHTHOUSE.position))
      .toEqual({ x: 19232, y: 19032 });
  });
});
```

- [ ] **Step 2: Run the map test and verify the expected failure**

Run:

```bash
npm test -- src/visual/storyIsoMap.test.ts
```

Expected:

```text
FAIL src/visual/storyIsoMap.test.ts
Error: Failed to resolve import "./storyIsoMap"
```

- [ ] **Step 3: Add the A2 preview map module**

Create `src/visual/storyIsoMap.ts`:

```ts
import { STORY_SLICE_ASSETS } from "./storyAssetManifest";
import {
  STORY_2_5D_CONFIG,
  type StoryPoint,
} from "./story2_5dProjection";

export type StoryIsoTileKind =
  | "plaza"
  | "road"
  | "roadCracked"
  | "curb"
  | "concrete"
  | "stain"
  | "rubble"
  | "blocked";

export interface StoryIsoTileCoord {
  x: number;
  y: number;
}

export interface StoryIsoTileDefinition extends StoryIsoTileCoord {
  kind: StoryIsoTileKind;
}

export type StoryIsoPropRole =
  | "building"
  | "vehicle"
  | "streetlight"
  | "roadblock"
  | "sign"
  | "lighthouse";

export interface StoryIsoFootprint {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoryIsoPropDefinition {
  label: string;
  role: StoryIsoPropRole;
  tile: StoryIsoTileCoord;
  footprint: StoryIsoFootprint;
  texturePath: string;
  scale: number;
  visualHeight: number;
  depthOffset: number;
  shadowScaleX: number;
  shadowScaleY: number;
  blocksMovement: boolean;
}

export interface StoryIsoMapDefinition {
  mode: "a2-preview";
  tileSize: number;
  tiles: StoryIsoTileDefinition[];
  props: StoryIsoPropDefinition[];
}

export interface StoryIsoMapStats {
  mode: StoryIsoMapDefinition["mode"];
  tileCount: number;
  roadTileCount: number;
  propCount: number;
  blockedFootprintCount: number;
}

function getPreviewTileKind(x: number, y: number): StoryIsoTileKind {
  const isDiagonalRoad = x === y || x === -y || (Math.abs(x) <= 1 && Math.abs(y) <= 1);
  if (isDiagonalRoad) {
    return Math.abs(x + y) % 2 === 0 ? "road" : "roadCracked";
  }

  const isCurb =
    Math.abs(x - y) === 1 ||
    Math.abs(x + y) === 1 ||
    (Math.abs(x) <= 2 && Math.abs(y) <= 2);
  if (isCurb) return "curb";

  if (
    (x === -5 && y === 3) ||
    (x === -4 && y === 4) ||
    (x === 4 && y === 2) ||
    (x === 5 && y === 3)
  ) {
    return "rubble";
  }

  if (
    (x === -2 && y === 5) ||
    (x === 3 && y === -4) ||
    (x === 6 && y === -2)
  ) {
    return "stain";
  }

  return Math.abs(x + y) % 3 === 0 ? "plaza" : "concrete";
}

function createStoryIsoPreviewTiles(): StoryIsoTileDefinition[] {
  const tiles: StoryIsoTileDefinition[] = [];

  for (let x = -6; x <= 6; x += 1) {
    for (let y = -5; y <= 5; y += 1) {
      tiles.push({ x, y, kind: getPreviewTileKind(x, y) });
    }
  }

  return tiles;
}

const [buildingGreen, buildingOchre, buildingTeal] =
  STORY_SLICE_ASSETS.map.buildings;
const [, , wreckedCar, streetlight, roadblock, signboard] =
  STORY_SLICE_ASSETS.map.decorations;

export const STORY_A2_PREVIEW_MAP: StoryIsoMapDefinition = {
  mode: "a2-preview",
  tileSize: STORY_2_5D_CONFIG.isoLogicalTileSize,
  tiles: createStoryIsoPreviewTiles(),
  props: [
    {
      label: "story-a2-building-green",
      role: "building",
      tile: { x: -3, y: -3 },
      footprint: { x: -4, y: -4, width: 2, height: 2 },
      texturePath: buildingGreen,
      scale: 0.78,
      visualHeight: 170,
      depthOffset: 90,
      shadowScaleX: 1.55,
      shadowScaleY: 0.38,
      blocksMovement: true,
    },
    {
      label: "story-a2-building-ochre",
      role: "building",
      tile: { x: 4, y: -2 },
      footprint: { x: 3, y: -3, width: 2, height: 2 },
      texturePath: buildingOchre,
      scale: 0.76,
      visualHeight: 158,
      depthOffset: 88,
      shadowScaleX: 1.5,
      shadowScaleY: 0.36,
      blocksMovement: true,
    },
    {
      label: "story-a2-building-teal",
      role: "building",
      tile: { x: -4, y: 3 },
      footprint: { x: -5, y: 2, width: 2, height: 2 },
      texturePath: buildingTeal,
      scale: 0.72,
      visualHeight: 148,
      depthOffset: 84,
      shadowScaleX: 1.42,
      shadowScaleY: 0.34,
      blocksMovement: true,
    },
    {
      label: "story-a2-wrecked-car",
      role: "vehicle",
      tile: { x: 2, y: 2 },
      footprint: { x: 2, y: 2, width: 1, height: 1 },
      texturePath: wreckedCar,
      scale: 0.78,
      visualHeight: 48,
      depthOffset: 42,
      shadowScaleX: 1.12,
      shadowScaleY: 0.24,
      blocksMovement: true,
    },
    {
      label: "story-a2-streetlight",
      role: "streetlight",
      tile: { x: -2, y: -1 },
      footprint: { x: -2, y: -1, width: 1, height: 1 },
      texturePath: streetlight,
      scale: 0.82,
      visualHeight: 144,
      depthOffset: 88,
      shadowScaleX: 0.72,
      shadowScaleY: 0.18,
      blocksMovement: false,
    },
    {
      label: "story-a2-roadblock",
      role: "roadblock",
      tile: { x: 0, y: 3 },
      footprint: { x: 0, y: 3, width: 1, height: 1 },
      texturePath: roadblock,
      scale: 0.9,
      visualHeight: 38,
      depthOffset: 42,
      shadowScaleX: 1,
      shadowScaleY: 0.22,
      blocksMovement: true,
    },
    {
      label: "story-a2-signboard",
      role: "sign",
      tile: { x: 1, y: -3 },
      footprint: { x: 1, y: -3, width: 1, height: 1 },
      texturePath: signboard,
      scale: 0.88,
      visualHeight: 96,
      depthOffset: 82,
      shadowScaleX: 0.78,
      shadowScaleY: 0.2,
      blocksMovement: false,
    },
    {
      label: "story-a2-lighthouse",
      role: "lighthouse",
      tile: { x: 0, y: 0 },
      footprint: { x: -1, y: -1, width: 2, height: 2 },
      texturePath: STORY_SLICE_ASSETS.lighthouse.states.off,
      scale: 0.88,
      visualHeight: 205,
      depthOffset: 105,
      shadowScaleX: 1.18,
      shadowScaleY: 0.3,
      blocksMovement: true,
    },
  ],
};

export function isStoryIsoRoadTile(tile: StoryIsoTileDefinition): boolean {
  return tile.kind === "road" || tile.kind === "roadCracked";
}

export function getStoryIsoTileWorldPoint(
  tile: StoryIsoTileCoord,
  center: StoryPoint,
): StoryPoint {
  return {
    x: center.x + tile.x * STORY_A2_PREVIEW_MAP.tileSize,
    y: center.y + tile.y * STORY_A2_PREVIEW_MAP.tileSize,
  };
}

export function getStoryIsoPropBasePoint(
  prop: StoryIsoPropDefinition,
  center: StoryPoint,
): StoryPoint {
  return getStoryIsoTileWorldPoint(prop.tile, center);
}

export function getStoryIsoBlockedFootprints(
  map: StoryIsoMapDefinition,
): StoryIsoFootprint[] {
  return map.props
    .filter((prop) => prop.blocksMovement)
    .map((prop) => ({ ...prop.footprint }));
}

export function getStoryIsoMapStats(
  map: StoryIsoMapDefinition,
): StoryIsoMapStats {
  return {
    mode: map.mode,
    tileCount: map.tiles.length,
    roadTileCount: map.tiles.filter(isStoryIsoRoadTile).length,
    propCount: map.props.length,
    blockedFootprintCount: getStoryIsoBlockedFootprints(map).length,
  };
}
```

- [ ] **Step 4: Run the map data test and verify it passes**

Run:

```bash
npm test -- src/visual/storyIsoMap.test.ts
```

Expected:

```text
PASS src/visual/storyIsoMap.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/visual/storyIsoMap.ts src/visual/storyIsoMap.test.ts
git commit -m "feat: add story a2 isometric map data"
```

---

### Task 2: Renderer Consumes A2 Tile Map

**Files:**
- Modify: `src/visual/storySliceRenderer.test.ts`
- Modify: `src/visual/storySliceRenderer.ts`

- [ ] **Step 1: Write the failing renderer tests**

In `src/visual/storySliceRenderer.test.ts`, add imports:

```ts
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoBlockedFootprints,
  getStoryIsoMapStats,
  getStoryIsoTileWorldPoint,
} from "./storyIsoMap";
```

In the `"creates stable named layers under one root"` test, replace the current fixed 63-tile ground assertions with:

```ts
    const isoStats = getStoryIsoMapStats(STORY_A2_PREVIEW_MAP);
    expect(renderer.layers.ground.children).toHaveLength(isoStats.tileCount);
    expect(renderer.debugGroundTiles()).toHaveLength(isoStats.tileCount);
    expect(renderer.debugIsoMapStats()).toEqual(isoStats);
    expect(renderer.debugBlockedFootprints()).toEqual(
      getStoryIsoBlockedFootprints(STORY_A2_PREVIEW_MAP),
    );
    expect(renderer.layers.decal.children).toHaveLength(2);
    expect(renderer.layers.prop.children).toHaveLength(0);
    expect(renderer.layers.fog.children).toHaveLength(4);
    expect(renderer.layers.lighthouse.children).toHaveLength(0);
    expect(renderer.layers.effect.children).toHaveLength(1);
    expect(renderer.layers.worldUi.children).toHaveLength(0);
    expect(renderer.debugSpriteCount()).toBeGreaterThanOrEqual(165);

    const firstMapTile = STORY_A2_PREVIEW_MAP.tiles[0];
    const firstGroundTile = renderer.debugGroundTiles()[0];
    const firstGroundWorldPoint = getStoryIsoTileWorldPoint(
      firstMapTile,
      STORY_CENTER_LIGHTHOUSE.position,
    );
    const projectedFirstGroundPosition = projectStoryPoint(
      firstGroundWorldPoint,
      STORY_CENTER_LIGHTHOUSE.position,
    );

    expect(firstGroundTile.label).toBe("story-a2-ground-curb-0");
    expect(firstGroundTile.kind).toBe(firstMapTile.kind);
    expect(firstGroundTile.worldPoint).toEqual(firstGroundWorldPoint);
    expect(firstGroundTile.projectedPoint).toEqual(projectedFirstGroundPosition);
    expect(firstGroundTile.diamondWidth).toBe(STORY_2_5D_CONFIG.isoTileWidth);
    expect(firstGroundTile.diamondHeight).toBe(STORY_2_5D_CONFIG.isoTileHeight);
    expect(renderer.layers.ground.children[0].label).toBe(firstGroundTile.label);
```

In `"promotes volumetric story props to top-level depth-sorted world children"`, replace the old ground and prop expectations with:

```ts
    const isoStats = getStoryIsoMapStats(STORY_A2_PREVIEW_MAP);
    expect(renderer.debugGroundTiles()).toHaveLength(isoStats.tileCount);
    expect(renderer.debugIsoMapStats()).toEqual(isoStats);

    expect(props.map((prop) => prop.role)).toEqual([
      "building",
      "building",
      "building",
      "vehicle",
      "streetlight",
      "roadblock",
      "sign",
      "lighthouse",
    ]);
    expect(props.map((prop) => prop.label)).toEqual(
      STORY_A2_PREVIEW_MAP.props.map((prop) => prop.label),
    );
    expect(props.filter((prop) => prop.role === "building")).toHaveLength(3);
    expect(props.every((prop) => prop.visualHeight > 0)).toBe(true);
    expect(props.every((prop) => prop.containerParentLabel === "story-world-root"))
      .toBe(true);
    expect(props.every((prop) => prop.shadowChildCount >= 1)).toBe(true);

    const firstBuilding = props[0];
    expect(firstBuilding.label).toBe("story-a2-building-green");
    expect(firstBuilding.tile).toEqual({ x: -3, y: -3 });
    expect(firstBuilding.footprint).toEqual({
      x: -4,
      y: -4,
      width: 2,
      height: 2,
    });
    expect(firstBuilding.basePoint).toEqual({
      x: center.x - 768,
      y: center.y - 768,
    });
    expect(firstBuilding.projectedPoint).toEqual(
      projectStoryPoint(firstBuilding.basePoint, center),
    );
    expect(firstBuilding.zIndex).toBe(
      getStoryDepth(firstBuilding.basePoint, 90),
    );

    const lighthouse = props.at(-1);
    expect(lighthouse?.label).toBe("story-a2-lighthouse");
    expect(lighthouse?.tile).toEqual({ x: 0, y: 0 });
    expect(lighthouse?.basePoint).toEqual(center);
    expect(lighthouse?.zIndex).toBe(getStoryDepth(center, 105));
```

In `"preserves default ground and fog layout without projection"`, add:

```ts
    expect(renderer.debugIsoMapStats()).toBeUndefined();
    expect(renderer.debugBlockedFootprints()).toEqual([]);
```

- [ ] **Step 2: Run the renderer test and verify the expected failure**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
FAIL src/visual/storySliceRenderer.test.ts
TypeError: renderer.debugIsoMapStats is not a function
```

- [ ] **Step 3: Add A2 map types and debug accessors to the renderer**

In `src/visual/storySliceRenderer.ts`, add imports:

```ts
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoBlockedFootprints,
  getStoryIsoMapStats,
  getStoryIsoPropBasePoint,
  getStoryIsoTileWorldPoint,
  type StoryIsoFootprint,
  type StoryIsoMapDefinition,
  type StoryIsoMapStats,
  type StoryIsoPropDefinition,
  type StoryIsoPropRole,
  type StoryIsoTileDefinition,
  type StoryIsoTileKind,
} from "./storyIsoMap";
```

Update the relevant interfaces:

```ts
export interface StorySliceRendererOptions {
  world: Container;
  center: StoryPoint;
  lit: boolean;
  // Enables story 2.5D projection for ground, fog, and volume props.
  projectPoint?: (point: StoryPoint) => StoryPoint;
  isoMap?: StoryIsoMapDefinition;
}

type StoryVolumePropRole = StoryIsoPropRole;

interface StoryVolumePropDefinition {
  label: string;
  role: StoryVolumePropRole;
  texturePath: string;
  x: number;
  y: number;
  scale: number;
  baseYOffset: number;
  visualHeight: number;
  depthOffset: number;
  shadowScaleX: number;
  shadowScaleY: number;
  tile?: StoryIsoPropDefinition["tile"];
  footprint?: StoryIsoFootprint;
}

export interface StoryVolumePropDebug {
  label: string;
  role: StoryVolumePropRole;
  basePoint: StoryPoint;
  projectedPoint: StoryPoint;
  visualHeight: number;
  zIndex: number;
  containerParentLabel: string | undefined;
  shadowChildCount: number;
  tile?: StoryIsoPropDefinition["tile"];
  footprint?: StoryIsoFootprint;
}

export interface StoryGroundTileDebug {
  label: string;
  worldPoint: StoryPoint;
  projectedPoint: StoryPoint;
  diamondWidth: number;
  diamondHeight: number;
  kind: StoryIsoTileKind;
}

export interface StorySliceRenderer {
  root: Container;
  layers: Record<StorySliceLayerName, Container>;
  setLighthouseCharging(): void;
  setLighthouseLit(lit: boolean): void;
  getLighthouseVisualState(): StoryLighthouseVisualState;
  playScanPulse(origin: { x: number; y: number }): void;
  debugGroundTiles(): StoryGroundTileDebug[];
  debugVolumeProps(): StoryVolumePropDebug[];
  debugIsoMapStats(): StoryIsoMapStats | undefined;
  debugBlockedFootprints(): StoryIsoFootprint[];
  debugSpriteCount(): number;
  destroy(): void;
}
```

- [ ] **Step 4: Replace ground helpers with A2-aware helpers**

Replace `getGroundKind`, `getIsoGroundColor`, `makeIsoGroundTile`, and `addGround` with:

```ts
function getGroundKind(asset: string): StoryIsoTileKind {
  if (asset.includes("road-straight")) return "road";
  if (asset.includes("road-cracked")) return "roadCracked";
  if (asset.includes("concrete")) return "concrete";
  return "plaza";
}

function getIsoGroundColor(kind: StoryIsoTileKind): number {
  if (kind === "road") return STORY_ART_PALETTE.roadGreyGreen;
  if (kind === "roadCracked") return 0x39433d;
  if (kind === "curb") return 0x59675f;
  if (kind === "concrete") return 0x667368;
  if (kind === "stain") return 0x405f52;
  if (kind === "rubble") return 0x4b554f;
  if (kind === "blocked") return 0x2c342f;
  return STORY_ART_PALETTE.wastelandOchre;
}

function decorateIsoGroundTile(
  view: Graphics,
  kind: StoryIsoTileKind,
  diamondWidth: number,
  diamondHeight: number,
): void {
  if (kind === "road" || kind === "roadCracked") {
    view
      .moveTo(-diamondWidth * 0.28, 0)
      .lineTo(0, -diamondHeight * 0.16)
      .lineTo(diamondWidth * 0.28, 0)
      .stroke({ color: 0xffd166, alpha: kind === "road" ? 0.3 : 0.18, width: 3 });
    return;
  }

  if (kind === "curb") {
    view
      .moveTo(-diamondWidth * 0.5, 0)
      .lineTo(0, diamondHeight * 0.5)
      .stroke({ color: 0xc7d2b8, alpha: 0.18, width: 2 });
    return;
  }

  if (kind === "rubble") {
    view.circle(-18, 4, 5).fill({ color: 0x222a25, alpha: 0.38 });
    view.circle(14, -8, 3).fill({ color: 0x222a25, alpha: 0.28 });
  }
}

function makeIsoGroundTileFromKind(
  kind: StoryIsoTileKind,
  worldPoint: StoryPoint,
  tileIndex: number,
  labelPrefix: "story-iso-ground" | "story-a2-ground",
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Graphics; debug: StoryGroundTileDebug } {
  const projectedPoint = options.projectPoint?.(worldPoint) ?? worldPoint;
  const diamondWidth = STORY_2_5D_CONFIG.isoTileWidth;
  const diamondHeight = STORY_2_5D_CONFIG.isoTileHeight;
  const view = new Graphics();
  const label = `${labelPrefix}-${kind}-${tileIndex}`;
  view.label = label;
  view.position.set(projectedPoint.x, projectedPoint.y);
  view
    .poly([
      0,
      -diamondHeight / 2,
      diamondWidth / 2,
      0,
      0,
      diamondHeight / 2,
      -diamondWidth / 2,
      0,
    ])
    .fill({
      color: getIsoGroundColor(kind),
      alpha: kind === "plaza" ? 0.58 : kind === "stain" ? 0.42 : 0.76,
    })
    .stroke({ color: 0x050706, alpha: 0.24, width: 2 });
  decorateIsoGroundTile(view, kind, diamondWidth, diamondHeight);

  return {
    view,
    debug: {
      label,
      worldPoint,
      projectedPoint,
      diamondWidth,
      diamondHeight,
      kind,
    },
  };
}

function makeIsoGroundTile(
  asset: string,
  worldPoint: StoryPoint,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Graphics; debug: StoryGroundTileDebug } {
  return makeIsoGroundTileFromKind(
    getGroundKind(asset),
    worldPoint,
    tileIndex,
    "story-iso-ground",
    options,
  );
}

function makeA2GroundTile(
  tile: StoryIsoTileDefinition,
  center: StoryPoint,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Graphics; debug: StoryGroundTileDebug } {
  return makeIsoGroundTileFromKind(
    tile.kind,
    getStoryIsoTileWorldPoint(tile, center),
    tileIndex,
    "story-a2-ground",
    options,
  );
}

function addGround(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
  isoMap: StoryIsoMapDefinition | undefined,
): StoryGroundTileDebug[] {
  if (options.projectPoint && isoMap) {
    return isoMap.tiles.map((tile, tileIndex) => {
      const groundTile = makeA2GroundTile(tile, center, tileIndex, options);
      layers.ground.addChild(groundTile.view);
      return groundTile.debug;
    });
  }

  const tileSize = STORY_2_5D_CONFIG.isoLogicalTileSize;
  const [road, cracked, concrete, grass] = STORY_SLICE_ASSETS.map.groundTiles;
  const debugTiles: StoryGroundTileDebug[] = [];
  let tileIndex = 0;

  for (let ix = -4; ix <= 4; ix += 1) {
    for (let iy = -3; iy <= 3; iy += 1) {
      const isRoad = Math.abs(iy) <= 1 || Math.abs(ix) <= 1;
      const asset = isRoad
        ? Math.abs(ix + iy) % 2 === 0
          ? road
          : cracked
        : Math.abs(ix) % 2 === 0
          ? concrete
          : grass;
      const worldPoint = {
        x: center.x + ix * tileSize,
        y: center.y + iy * tileSize,
      };

      if (options.projectPoint) {
        const tile = makeIsoGroundTile(asset, worldPoint, tileIndex, options);
        layers.ground.addChild(tile.view);
        debugTiles.push(tile.debug);
      } else {
        layers.ground.addChild(
          makeSprite(asset, worldPoint.x, worldPoint.y, 1, options, 1),
        );
      }

      tileIndex += 1;
    }
  }

  return debugTiles;
}
```

- [ ] **Step 5: Make volume props use A2 map definitions when projected**

Replace `getVolumePropDefinitions` with this signature and branch:

```ts
function getVolumePropDefinitions(
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition | undefined,
  lighthouseState: StoryLighthouseVisualState,
): StoryVolumePropDefinition[] {
  if (isoMap) {
    return isoMap.props.map((prop) => {
      const basePoint = getStoryIsoPropBasePoint(prop, center);
      return {
        label: prop.label,
        role: prop.role,
        texturePath:
          prop.role === "lighthouse"
            ? STORY_SLICE_ASSETS.lighthouse.states[lighthouseState]
            : prop.texturePath,
        x: basePoint.x,
        y: basePoint.y,
        scale: prop.scale,
        baseYOffset: 0,
        visualHeight: prop.visualHeight,
        depthOffset: prop.depthOffset,
        shadowScaleX: prop.shadowScaleX,
        shadowScaleY: prop.shadowScaleY,
        tile: prop.tile,
        footprint: prop.footprint,
      };
    });
  }

  const [buildingGreen, buildingOchre, buildingTeal] =
    STORY_SLICE_ASSETS.map.buildings;
  const [, , wreckedCar, streetlight, roadblock, signboard] =
    STORY_SLICE_ASSETS.map.decorations;

  return [
    {
      label: "story-volume-building-green",
      role: "building",
      texturePath: buildingGreen,
      x: center.x - 520,
      y: center.y - 390,
      scale: 0.72,
      baseYOffset: 118,
      visualHeight: 150,
      depthOffset: 70,
      shadowScaleX: 1.45,
      shadowScaleY: 0.36,
    },
    {
      label: "story-volume-building-ochre",
      role: "building",
      texturePath: buildingOchre,
      x: center.x + 540,
      y: center.y - 360,
      scale: 0.7,
      baseYOffset: 112,
      visualHeight: 142,
      depthOffset: 70,
      shadowScaleX: 1.42,
      shadowScaleY: 0.34,
    },
    {
      label: "story-volume-building-teal",
      role: "building",
      texturePath: buildingTeal,
      x: center.x - 440,
      y: center.y + 430,
      scale: 0.66,
      baseYOffset: 108,
      visualHeight: 132,
      depthOffset: 70,
      shadowScaleX: 1.38,
      shadowScaleY: 0.32,
    },
    {
      label: "story-volume-wrecked-car",
      role: "vehicle",
      texturePath: wreckedCar,
      x: center.x + 360,
      y: center.y + 190,
      scale: 0.72,
      baseYOffset: 38,
      visualHeight: 44,
      depthOffset: 38,
      shadowScaleX: 1.1,
      shadowScaleY: 0.22,
    },
    {
      label: "story-volume-streetlight",
      role: "streetlight",
      texturePath: streetlight,
      x: center.x - 250,
      y: center.y - 245,
      scale: 0.78,
      baseYOffset: 82,
      visualHeight: 138,
      depthOffset: 82,
      shadowScaleX: 0.72,
      shadowScaleY: 0.18,
    },
    {
      label: "story-volume-roadblock",
      role: "roadblock",
      texturePath: roadblock,
      x: center.x + 85,
      y: center.y + 310,
      scale: 0.82,
      baseYOffset: 32,
      visualHeight: 34,
      depthOffset: 34,
      shadowScaleX: 0.95,
      shadowScaleY: 0.2,
    },
    {
      label: "story-volume-signboard",
      role: "sign",
      texturePath: signboard,
      x: center.x - 20,
      y: center.y - 335,
      scale: 0.82,
      baseYOffset: 76,
      visualHeight: 88,
      depthOffset: 76,
      shadowScaleX: 0.75,
      shadowScaleY: 0.18,
    },
  ];
}
```

In `makeVolumeProp`, add `tile` and `footprint` to debug:

```ts
      tile: definition.tile ? { ...definition.tile } : undefined,
      footprint: definition.footprint ? { ...definition.footprint } : undefined,
```

- [ ] **Step 6: Wire A2 map and lighthouse state in `createStorySliceRenderer`**

Inside `createStorySliceRenderer`, replace the setup through lighthouse creation with this structure:

```ts
  const activeIsoMap = options.projectPoint
    ? options.isoMap ?? STORY_A2_PREVIEW_MAP
    : undefined;
  let lighthouseState: StoryLighthouseVisualState = options.lit ? "on" : "off";
  const isoMapStats = activeIsoMap ? getStoryIsoMapStats(activeIsoMap) : undefined;
  const blockedFootprints = activeIsoMap
    ? getStoryIsoBlockedFootprints(activeIsoMap)
    : [];

  const root = new Container();
  root.label = "story-art-slice-root";
  options.world.addChild(root);

  const layers = createLayers(root);
  const groundTiles = addGround(layers, options.center, options, activeIsoMap);
  addGroundDecals(layers, options.center, options);
  const volumeProps = getVolumePropDefinitions(
    options.center,
    activeIsoMap,
    lighthouseState,
  ).map((definition) => makeVolumeProp(definition, options));

  const lighthouseTextures = Object.fromEntries(
    STORY_LIGHTHOUSE_VISUAL_STATES.map((state) => [
      state,
      Texture.from(STORY_SLICE_ASSETS.lighthouse.states[state]),
    ]),
  ) as Record<StoryLighthouseVisualState, Texture>;
  const activePulses = new Set<ActivePulse>();
  const fogSprites = addTexturedFog(
    layers,
    options.center,
    lighthouseState,
    options,
  );
  const lighthouseVolume =
    volumeProps.find((prop) => prop.debug.role === "lighthouse") ??
    makeVolumeProp(
      {
        label: "story-volume-lighthouse",
        role: "lighthouse",
        texturePath: STORY_SLICE_ASSETS.lighthouse.states[lighthouseState],
        x: options.center.x,
        y: options.center.y,
        scale: 0.82,
        baseYOffset: 0,
        visualHeight: 190,
        depthOffset: 95,
        shadowScaleX: 1.1,
        shadowScaleY: 0.28,
      },
      options,
    );
  if (!volumeProps.includes(lighthouseVolume)) {
    volumeProps.push(lighthouseVolume);
  }
  const lighthouse = lighthouseVolume.sprite;
  lighthouse.texture = lighthouseTextures[lighthouseState];
```

In the returned object, add:

```ts
    debugIsoMapStats(): StoryIsoMapStats | undefined {
      return isoMapStats ? { ...isoMapStats } : undefined;
    },
    debugBlockedFootprints(): StoryIsoFootprint[] {
      return blockedFootprints.map((footprint) => ({ ...footprint }));
    },
```

- [ ] **Step 7: Run the renderer test and verify it passes**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts src/visual/storyIsoMap.test.ts
```

Expected:

```text
PASS src/visual/storyIsoMap.test.ts
PASS src/visual/storySliceRenderer.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/visual/storySliceRenderer.ts src/visual/storySliceRenderer.test.ts
git commit -m "feat: render story a2 isometric preview map"
```

---

### Task 3: A2 Preview Metrics, E2E, And Inspection Output

**Files:**
- Modify: `src/app/gameStore.test.ts`
- Modify: `src/app/gameStore.ts`
- Modify: `src/game/PixiWastelandGame.ts`
- Modify: `tests/e2e/prototype.spec.ts`
- Modify: `scripts/inspect-story-2-5d.mjs`

- [ ] **Step 1: Write failing store metric tests**

In `src/app/gameStore.test.ts`, add default assertions after `story2_5dPlayerScreenX`:

```ts
    expect(store.storyIsoMapMode).toBeUndefined();
    expect(store.storyIsoMapTileCount).toBeUndefined();
    expect(store.storyIsoMapRoadTileCount).toBeUndefined();
    expect(store.storyIsoMapPropCount).toBeUndefined();
    expect(store.storyIsoMapDepthSortedPropCount).toBeUndefined();
    expect(store.storyIsoMapBlockedFootprintCount).toBeUndefined();
```

Inside `store.syncMetrics({ ... })`, add:

```ts
      storyIsoMapMode: "a2-preview",
      storyIsoMapTileCount: 143,
      storyIsoMapRoadTileCount: 25,
      storyIsoMapPropCount: 8,
      storyIsoMapDepthSortedPropCount: 8,
      storyIsoMapBlockedFootprintCount: 6,
```

After the `story2_5dPlayerScreenX` assertion, add:

```ts
    expect(store.storyIsoMapMode).toBe("a2-preview");
    expect(store.storyIsoMapTileCount).toBe(143);
    expect(store.storyIsoMapRoadTileCount).toBe(25);
    expect(store.storyIsoMapPropCount).toBe(8);
    expect(store.storyIsoMapDepthSortedPropCount).toBe(8);
    expect(store.storyIsoMapBlockedFootprintCount).toBe(6);
```

- [ ] **Step 2: Run store tests and verify the expected failure**

Run:

```bash
npm test -- src/app/gameStore.test.ts
```

Expected:

```text
FAIL src/app/gameStore.test.ts
expected undefined to be 'a2-preview'
```

- [ ] **Step 3: Add A2 metrics to the store contract**

In `src/app/gameStore.ts`, extend `GameMetrics`:

```ts
  storyIsoMapMode?: "a2-preview";
  storyIsoMapTileCount?: number;
  storyIsoMapRoadTileCount?: number;
  storyIsoMapPropCount?: number;
  storyIsoMapDepthSortedPropCount?: number;
  storyIsoMapBlockedFootprintCount?: number;
```

Add defaults in `createInitialMetrics()`:

```ts
    storyIsoMapMode: undefined,
    storyIsoMapTileCount: undefined,
    storyIsoMapRoadTileCount: undefined,
    storyIsoMapPropCount: undefined,
    storyIsoMapDepthSortedPropCount: undefined,
    storyIsoMapBlockedFootprintCount: undefined,
```

Add sync assignments in `syncMetrics(metrics: GameMetrics)`:

```ts
      this.storyIsoMapMode = metrics.storyIsoMapMode;
      this.storyIsoMapTileCount = metrics.storyIsoMapTileCount;
      this.storyIsoMapRoadTileCount = metrics.storyIsoMapRoadTileCount;
      this.storyIsoMapPropCount = metrics.storyIsoMapPropCount;
      this.storyIsoMapDepthSortedPropCount = metrics.storyIsoMapDepthSortedPropCount;
      this.storyIsoMapBlockedFootprintCount = metrics.storyIsoMapBlockedFootprintCount;
```

- [ ] **Step 4: Emit A2 map metrics from the Pixi game**

In `src/game/PixiWastelandGame.ts`, inside `emitMetrics()`, after `storyVolumeProps`, add:

```ts
    const storyIsoMapStats = this.isStoryMode()
      ? this.storySliceRenderer?.debugIsoMapStats()
      : undefined;
    const storyIsoBlockedFootprints = this.isStoryMode()
      ? this.storySliceRenderer?.debugBlockedFootprints()
      : undefined;
```

In the metrics object, after `story2_5dProjectedUnderlayEnabled`, add:

```ts
      storyIsoMapMode: storyIsoMapStats?.mode,
      storyIsoMapTileCount: storyIsoMapStats?.tileCount,
      storyIsoMapRoadTileCount: storyIsoMapStats?.roadTileCount,
      storyIsoMapPropCount: storyIsoMapStats?.propCount,
      storyIsoMapDepthSortedPropCount: storyVolumeProps?.filter(
        (prop) => prop.containerParentLabel === "story-world-root",
      ).length,
      storyIsoMapBlockedFootprintCount: storyIsoBlockedFootprints?.length,
```

- [ ] **Step 5: Update the story e2e assertions**

In `tests/e2e/prototype.spec.ts`, after the existing `story2_5dIsoLogicalTileSize` assertion, add:

```ts
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapMode ?? null))
    .toBe("a2-preview");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapTileCount ?? 0))
    .toBe(143);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapRoadTileCount ?? 0))
    .toBe(25);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapPropCount ?? 0))
    .toBe(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapDepthSortedPropCount ?? 0))
    .toBe(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapBlockedFootprintCount ?? 0))
    .toBe(6);
```

- [ ] **Step 6: Update the inspection script output**

In `scripts/inspect-story-2-5d.mjs`, change the default output path:

```js
const outputPath = process.env.STORY_2_5D_SCREENSHOT ?? "/tmp/story-isometric-a2-preview.png";
```

Add these fields after `story2_5dIsoLogicalTileSize`:

```js
  storyIsoMapMode: metrics?.storyIsoMapMode,
  storyIsoMapTileCount: metrics?.storyIsoMapTileCount,
  storyIsoMapRoadTileCount: metrics?.storyIsoMapRoadTileCount,
  storyIsoMapPropCount: metrics?.storyIsoMapPropCount,
  storyIsoMapDepthSortedPropCount: metrics?.storyIsoMapDepthSortedPropCount,
  storyIsoMapBlockedFootprintCount: metrics?.storyIsoMapBlockedFootprintCount,
```

- [ ] **Step 7: Run focused unit and e2e tests**

Run:

```bash
npm test -- src/app/gameStore.test.ts src/visual/storyIsoMap.test.ts src/visual/storySliceRenderer.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
```

Expected:

```text
PASS src/app/gameStore.test.ts
PASS src/visual/storyIsoMap.test.ts
PASS src/visual/storySliceRenderer.test.ts
1 passed
```

- [ ] **Step 8: Commit**

```bash
git add src/app/gameStore.ts src/app/gameStore.test.ts src/game/PixiWastelandGame.ts tests/e2e/prototype.spec.ts scripts/inspect-story-2-5d.mjs
git commit -m "feat: expose story a2 isometric preview metrics"
```

---

### Task 4: Visual Screenshot Verification And Build

**Files:**
- Modify only if verification reveals a small visual blocker: `src/game/PixiWastelandGame.ts` or `src/visual/storySliceRenderer.ts`

- [ ] **Step 1: Run full unit tests**

Run:

```bash
npm test
```

Expected:

```text
Test Files  44 passed
Tests  203 passed
```

The exact test count may be higher if additional assertions are added while implementing the plan; there must be zero failures.

- [ ] **Step 2: Run story e2e smoke**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
```

Expected:

```text
1 passed
```

- [ ] **Step 3: Capture the A2 preview screenshot**

Run:

```bash
STORY_2_5D_SCREENSHOT=/tmp/story-isometric-a2-preview.png node scripts/inspect-story-2-5d.mjs
```

Expected JSON fields:

```json
{
  "outputPath": "/tmp/story-isometric-a2-preview.png",
  "story2_5dEnabled": true,
  "story2_5dProjectionMode": "isometric-a1",
  "story2_5dIsoTileWidth": 256,
  "story2_5dIsoTileHeight": 128,
  "story2_5dIsoLogicalTileSize": 256,
  "storyIsoMapMode": "a2-preview",
  "storyIsoMapTileCount": 143,
  "storyIsoMapRoadTileCount": 25,
  "storyIsoMapPropCount": 8,
  "storyIsoMapDepthSortedPropCount": 8,
  "storyIsoMapBlockedFootprintCount": 6
}
```

- [ ] **Step 4: Inspect the screenshot visually**

Open `/tmp/story-isometric-a2-preview.png` and verify:

- the first screen reads as a tile-authored isometric plaza
- there are clear diagonal street lanes
- ground is denser than A1, with concrete/curb/road/stain/rubble variation
- buildings and lighthouse have visible base anchors and shadows
- vanguard and zombies remain visible on foot anchors
- the old broad projected road rectangles do not dominate the central plaza
- the screen is not blank

If old broad projected roads visually dominate the central plaza, reduce the road alpha inside `drawStoryCity()`:

```ts
    for (let x = 2200; x <= this.getMapWidth(); x += 2600) {
      this.drawProjectedStoryQuad(road, x, this.getMapHeight() / 2, 84, this.getMapHeight())
        .fill({ color: 0x151914, alpha: 0.18 });
    }
    for (let y = 2200; y <= this.getMapHeight(); y += 2600) {
      this.drawProjectedStoryQuad(road, this.getMapWidth() / 2, y, this.getMapWidth(), 84)
        .fill({ color: 0x151914, alpha: 0.2 });
    }
```

If actor readability is poor because the tile layer is too bright, reduce A2 non-road ground alpha in `makeIsoGroundTileFromKind()`:

```ts
      alpha: kind === "plaza" ? 0.5 : kind === "stain" ? 0.36 : 0.68,
```

After any visual adjustment, run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
STORY_2_5D_SCREENSHOT=/tmp/story-isometric-a2-preview.png node scripts/inspect-story-2-5d.mjs
```

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
✓ built
```

The existing Vite large chunk warning is acceptable if the build exits with code 0.

- [ ] **Step 6: Commit any visual verification adjustments**

If Step 4 required edits, commit them:

```bash
git add src/game/PixiWastelandGame.ts src/visual/storySliceRenderer.ts
git commit -m "style: tune story a2 isometric preview readability"
```

If Step 4 required no edits, do not create an empty commit.

---

## Final Verification Checklist

Before reporting completion, run:

```bash
npm test
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
STORY_2_5D_SCREENSHOT=/tmp/story-isometric-a2-preview.png node scripts/inspect-story-2-5d.mjs
npm run build
git status --short --branch
```

Required results:

- unit tests exit 0
- story e2e smoke exits 0
- screenshot inspection exits 0 and reports `storyIsoMapMode: "a2-preview"`
- build exits 0
- worktree is clean except for intentional generated files outside the repo

## Self-Review Checklist

- Spec coverage: Tasks 1-4 cover map data, tile-driven renderer, prop footprints, debug metrics, e2e, screenshot inspection, and build verification.
- A2 boundary: No task rewrites movement, pathfinding, weapon balance, enemy stats, story progression, classic mode, or Boss Rush.
- Projection consistency: `story2_5dProjectionMode` remains `"isometric-a1"`; A2 preview is identified by `storyIsoMapMode: "a2-preview"`.
- Test-first path: Tasks 1-3 begin with failing unit or browser assertions.
- Visual verification: The plan requires `/tmp/story-isometric-a2-preview.png` before completion.
