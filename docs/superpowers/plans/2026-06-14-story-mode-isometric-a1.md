# Story Mode Isometric A1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert story mode rendering to A1 diamond isometric visuals while preserving the current world coordinates, movement, collision, enemy AI, spawning, combat, and story progression.

**Architecture:** Keep all gameplay state in existing logical world coordinates. Change the story projection gateway so existing render call sites project through an isometric transform, then update the story slice ground and debug metrics to prove the A1 path is active. A2 tile-grid gameplay remains out of scope.

**Tech Stack:** TypeScript, PixiJS v8 `Container`/`Graphics`/`Sprite`, Vitest/jsdom, Playwright, Vite.

---

## Scope Boundary

This plan implements `docs/superpowers/specs/2026-06-14-story-mode-isometric-a1-design.md`.

In scope:

- Story mode only.
- A1 visual isometric projection.
- Diamond ground tiles around the lighthouse slice.
- Existing actors, bullets, effects, fog, volume props, and camera using the same projection helpers.
- Store/debug/e2e metrics proving the isometric projection is active.
- Visual screenshot inspection after implementation.

Out of scope:

- A2 gameplay tile grid.
- Pathfinding, collision, spawn, AI, damage, or story unlock rewrites.
- New hand-painted isometric bitmap asset generation.
- Classic mode and Boss Rush visual changes.

## File Structure

- `src/visual/story2_5dProjection.ts`: replace C-style y compression with A1 isometric projection constants and inverse mapping.
- `src/visual/story2_5dProjection.test.ts`: update projection tests for A1 constants, world-to-screen mapping, inverse mapping, angle projection, and stable depth.
- `src/visual/storySliceRenderer.ts`: draw diamond ground tiles when story projection is active and expose ground tile debug metadata.
- `src/visual/storySliceRenderer.test.ts`: update renderer tests for diamond ground debug metadata and isometric fog scaling.
- `src/app/gameStore.ts`: add A1 projection metrics while keeping existing story 2.5D metrics backward-compatible.
- `src/app/gameStore.test.ts`: verify A1 metric defaults and sync behavior.
- `src/game/PixiWastelandGame.ts`: emit A1 metrics and player projected X/Y.
- `tests/e2e/prototype.spec.ts`: replace C ground-scale assertions with A1 isometric projection assertions.
- `scripts/inspect-story-2-5d.mjs`: print A1 projection metrics in screenshot output.

---

### Task 1: A1 Isometric Projection Contract

**Files:**
- Modify: `src/visual/story2_5dProjection.test.ts`
- Modify: `src/visual/story2_5dProjection.ts`

- [ ] **Step 1: Write the failing projection tests**

Replace `src/visual/story2_5dProjection.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryAngle,
  projectStoryPoint,
  unprojectStoryPoint,
} from "./story2_5dProjection";

describe("story 2.5D projection", () => {
  const origin = { x: 20000, y: 19800 };

  it("uses the A1 isometric projection constants", () => {
    expect(STORY_2_5D_CONFIG.projectionMode).toBe("isometric-a1");
    expect(STORY_2_5D_CONFIG.isoLogicalTileSize).toBe(256);
    expect(STORY_2_5D_CONFIG.isoTileWidth).toBe(256);
    expect(STORY_2_5D_CONFIG.isoTileHeight).toBe(128);
    expect(STORY_2_5D_CONFIG.isoFogScaleY).toBe(0.5);
    expect(STORY_2_5D_CONFIG.actorScaleBoost).toBe(1.1);
    expect(STORY_2_5D_CONFIG.weaponYOffset).toBe(-18);
    expect(STORY_2_5D_CONFIG.effectYOffset).toBe(-8);
  });

  it("projects logical world points onto an isometric diamond plane", () => {
    expect(projectStoryPoint({ x: 20256, y: 19800 }, origin)).toEqual({
      x: 20128,
      y: 19864,
    });
    expect(projectStoryPoint({ x: 20000, y: 20056 }, origin)).toEqual({
      x: 19872,
      y: 19864,
    });
    expect(projectStoryPoint({ x: 20256, y: 20056 }, origin)).toEqual({
      x: 20000,
      y: 19928,
    });
  });

  it("inverts isometric screen points back into logical world coordinates", () => {
    const world = { x: 20333, y: 19725 };
    const projected = projectStoryPoint(world, origin);

    expect(unprojectStoryPoint(projected, origin).x).toBeCloseTo(world.x);
    expect(unprojectStoryPoint(projected, origin).y).toBeCloseTo(world.y);
  });

  it("computes visual aim angles from isometric projected positions", () => {
    expect(
      projectStoryAngle(origin, { x: origin.x + 256, y: origin.y }, origin),
    ).toBeCloseTo(Math.atan2(64, 128));
    expect(
      projectStoryAngle(origin, { x: origin.x, y: origin.y + 256 }, origin),
    ).toBeCloseTo(Math.atan2(64, -128));
    expect(
      projectStoryAngle(origin, { x: origin.x + 256, y: origin.y + 256 }, origin),
    ).toBeCloseTo(Math.PI / 2);
  });

  it("keeps farther-south objects later in depth order even with small offsets", () => {
    expect(getStoryDepth({ x: 0, y: 200 }, 40)).toBeLessThan(
      getStoryDepth({ x: 0, y: 201 }, 0),
    );
    expect(getStoryDepth({ x: 0, y: 200 }, 120)).toBeGreaterThan(
      getStoryDepth({ x: 0, y: 200 }, 40),
    );
  });
});
```

- [ ] **Step 2: Run the projection test and verify the expected failure**

Run:

```bash
npm test -- src/visual/story2_5dProjection.test.ts
```

Expected:

```text
FAIL src/visual/story2_5dProjection.test.ts
expected undefined to be 'isometric-a1'
```

- [ ] **Step 3: Implement A1 isometric projection**

Replace `src/visual/story2_5dProjection.ts` with:

```ts
export interface StoryPoint {
  x: number;
  y: number;
}

export const STORY_2_5D_CONFIG = {
  projectionMode: "isometric-a1",
  isoLogicalTileSize: 256,
  isoTileWidth: 256,
  isoTileHeight: 128,
  isoFogScaleY: 0.5,
  actorScaleBoost: 1.1,
  weaponYOffset: -18,
  effectYOffset: -8,
  depthStride: 100,
} as const;

function getIsoTileOffsets(point: StoryPoint, origin: StoryPoint): StoryPoint {
  return {
    x: (point.x - origin.x) / STORY_2_5D_CONFIG.isoLogicalTileSize,
    y: (point.y - origin.y) / STORY_2_5D_CONFIG.isoLogicalTileSize,
  };
}

export function projectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  const tileOffset = getIsoTileOffsets(point, origin);
  const halfWidth = STORY_2_5D_CONFIG.isoTileWidth / 2;
  const halfHeight = STORY_2_5D_CONFIG.isoTileHeight / 2;

  return {
    x: origin.x + (tileOffset.x - tileOffset.y) * halfWidth,
    y: origin.y + (tileOffset.x + tileOffset.y) * halfHeight,
  };
}

export function unprojectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  const halfWidth = STORY_2_5D_CONFIG.isoTileWidth / 2;
  const halfHeight = STORY_2_5D_CONFIG.isoTileHeight / 2;
  const projectedX = (point.x - origin.x) / halfWidth;
  const projectedY = (point.y - origin.y) / halfHeight;
  const tileX = (projectedX + projectedY) / 2;
  const tileY = (projectedY - projectedX) / 2;

  return {
    x: origin.x + tileX * STORY_2_5D_CONFIG.isoLogicalTileSize,
    y: origin.y + tileY * STORY_2_5D_CONFIG.isoLogicalTileSize,
  };
}

export function projectStoryAngle(
  from: StoryPoint,
  to: StoryPoint,
  origin: StoryPoint,
): number {
  const projectedFrom = projectStoryPoint(from, origin);
  const projectedTo = projectStoryPoint(to, origin);

  return Math.atan2(
    projectedTo.y - projectedFrom.y,
    projectedTo.x - projectedFrom.x,
  );
}

export function getStoryDepth(point: StoryPoint, offset = 0): number {
  return point.y * STORY_2_5D_CONFIG.depthStride + offset;
}
```

- [ ] **Step 4: Run the projection test and verify it passes**

Run:

```bash
npm test -- src/visual/story2_5dProjection.test.ts
```

Expected:

```text
PASS src/visual/story2_5dProjection.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/visual/story2_5dProjection.ts src/visual/story2_5dProjection.test.ts
git commit -m "feat: switch story projection to isometric a1"
```

---

### Task 2: Diamond Story Slice Ground

**Files:**
- Modify: `src/visual/storySliceRenderer.test.ts`
- Modify: `src/visual/storySliceRenderer.ts`

- [ ] **Step 1: Write the failing renderer tests**

In `src/visual/storySliceRenderer.test.ts`, update the first renderer test so the ground assertions use a new debug accessor:

```ts
    const firstGroundTile = renderer.debugGroundTiles()[0];
    const projectedFirstGroundPosition = projectStoryPoint(
      {
        x: STORY_CENTER_LIGHTHOUSE.position.x - 4 * 256,
        y: STORY_CENTER_LIGHTHOUSE.position.y - 3 * 256,
      },
      STORY_CENTER_LIGHTHOUSE.position,
    );

    expect(firstGroundTile.label).toBe("story-iso-ground-concrete-0");
    expect(firstGroundTile.projectedPoint).toEqual(projectedFirstGroundPosition);
    expect(firstGroundTile.diamondWidth).toBe(STORY_2_5D_CONFIG.isoTileWidth);
    expect(firstGroundTile.diamondHeight).toBe(STORY_2_5D_CONFIG.isoTileHeight);
    expect(renderer.layers.ground.children[0].label).toBe(firstGroundTile.label);
```

Update the fog assertion in the same test:

```ts
    expect(firstFogSprite.scale.y).toBe(2.2 * STORY_2_5D_CONFIG.isoFogScaleY);
```

In the volume prop test, add this assertion after `const props = renderer.debugVolumeProps();`:

```ts
    expect(renderer.debugGroundTiles()).toHaveLength(63);
```

- [ ] **Step 2: Run the renderer test and verify the expected failure**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
FAIL src/visual/storySliceRenderer.test.ts
TypeError: renderer.debugGroundTiles is not a function
```

- [ ] **Step 3: Add ground tile debug types and diamond tile helpers**

In `src/visual/storySliceRenderer.ts`, add this interface after `StoryVolumePropDebug`:

```ts
export interface StoryGroundTileDebug {
  label: string;
  worldPoint: StoryPoint;
  projectedPoint: StoryPoint;
  diamondWidth: number;
  diamondHeight: number;
  kind: "road" | "cracked" | "concrete" | "grass";
}
```

Extend `StorySliceRenderer`:

```ts
  debugGroundTiles(): StoryGroundTileDebug[];
```

Replace `getGroundPlaneScaleY` with:

```ts
function getGroundPlaneScaleY(
  scale: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): number {
  return options.projectPoint ? scale * STORY_2_5D_CONFIG.isoFogScaleY : scale;
}
```

Add these helpers before `addGround`:

```ts
function getGroundKind(asset: string): StoryGroundTileDebug["kind"] {
  if (asset.includes("road-straight")) return "road";
  if (asset.includes("road-cracked")) return "cracked";
  if (asset.includes("concrete")) return "concrete";
  return "grass";
}

function getIsoGroundColor(kind: StoryGroundTileDebug["kind"]): number {
  if (kind === "road") return STORY_ART_PALETTE.roadGreyGreen;
  if (kind === "cracked") return 0x39433d;
  if (kind === "concrete") return 0x667368;
  return STORY_ART_PALETTE.wastelandOchre;
}

function makeIsoGroundTile(
  asset: string,
  worldPoint: StoryPoint,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Graphics; debug: StoryGroundTileDebug } {
  const kind = getGroundKind(asset);
  const projectedPoint = options.projectPoint?.(worldPoint) ?? worldPoint;
  const diamondWidth = STORY_2_5D_CONFIG.isoTileWidth;
  const diamondHeight = STORY_2_5D_CONFIG.isoTileHeight;
  const view = new Graphics();
  const label = `story-iso-ground-${kind}-${tileIndex}`;
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
    .fill({ color: getIsoGroundColor(kind), alpha: kind === "grass" ? 0.5 : 0.74 })
    .stroke({ color: 0x050706, alpha: 0.2, width: 2 });

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
```

- [ ] **Step 4: Return debug metadata from `addGround`**

Replace the `addGround` function in `src/visual/storySliceRenderer.ts` with:

```ts
function addGround(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): StoryGroundTileDebug[] {
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
        layers.ground.addChild(makeSprite(asset, worldPoint.x, worldPoint.y, 1, options, 1));
      }

      tileIndex += 1;
    }
  }

  return debugTiles;
}
```

In `createStorySliceRenderer`, change:

```ts
  addGround(layers, options.center, options);
```

to:

```ts
  const groundTiles = addGround(layers, options.center, options);
```

Add the accessor to the returned object:

```ts
    debugGroundTiles(): StoryGroundTileDebug[] {
      return groundTiles.map((tile) => ({ ...tile }));
    },
```

- [ ] **Step 5: Run the renderer test and verify it passes**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
PASS src/visual/storySliceRenderer.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/visual/storySliceRenderer.ts src/visual/storySliceRenderer.test.ts
git commit -m "feat: render story ground as isometric diamonds"
```

---

### Task 3: A1 Metrics And Browser Assertions

**Files:**
- Modify: `src/app/gameStore.test.ts`
- Modify: `src/app/gameStore.ts`
- Modify: `src/game/PixiWastelandGame.ts`
- Modify: `tests/e2e/prototype.spec.ts`

- [ ] **Step 1: Write failing store metric tests**

In `src/app/gameStore.test.ts`, add default assertions after `story2_5dProjectedUnderlayEnabled`:

```ts
    expect(store.story2_5dProjectionMode).toBeUndefined();
    expect(store.story2_5dIsoTileWidth).toBeUndefined();
    expect(store.story2_5dIsoTileHeight).toBeUndefined();
    expect(store.story2_5dIsoLogicalTileSize).toBeUndefined();
    expect(store.story2_5dPlayerScreenX).toBeUndefined();
```

Inside the existing `store.syncMetrics({ ... })` call, add:

```ts
      story2_5dProjectionMode: "isometric-a1",
      story2_5dIsoTileWidth: 256,
      story2_5dIsoTileHeight: 128,
      story2_5dIsoLogicalTileSize: 256,
      story2_5dPlayerScreenX: 19900,
```

Add sync assertions after the existing `story2_5dProjectedUnderlayEnabled` assertion:

```ts
    expect(store.story2_5dProjectionMode).toBe("isometric-a1");
    expect(store.story2_5dIsoTileWidth).toBe(256);
    expect(store.story2_5dIsoTileHeight).toBe(128);
    expect(store.story2_5dIsoLogicalTileSize).toBe(256);
    expect(store.story2_5dPlayerScreenX).toBe(19900);
```

- [ ] **Step 2: Run store tests and verify the expected failure**

Run:

```bash
npm test -- src/app/gameStore.test.ts
```

Expected:

```text
FAIL src/app/gameStore.test.ts
expected undefined to be 'isometric-a1'
```

- [ ] **Step 3: Add A1 metrics to the store contract**

In `src/app/gameStore.ts`, extend `GameMetrics`:

```ts
  story2_5dProjectionMode?: "isometric-a1";
  story2_5dIsoTileWidth?: number;
  story2_5dIsoTileHeight?: number;
  story2_5dIsoLogicalTileSize?: number;
  story2_5dPlayerScreenX?: number;
```

Add defaults in `createInitialMetrics()`:

```ts
    story2_5dProjectionMode: undefined,
    story2_5dIsoTileWidth: undefined,
    story2_5dIsoTileHeight: undefined,
    story2_5dIsoLogicalTileSize: undefined,
    story2_5dPlayerScreenX: undefined,
```

Add sync assignments in `syncMetrics`:

```ts
      this.story2_5dProjectionMode = metrics.story2_5dProjectionMode;
      this.story2_5dIsoTileWidth = metrics.story2_5dIsoTileWidth;
      this.story2_5dIsoTileHeight = metrics.story2_5dIsoTileHeight;
      this.story2_5dIsoLogicalTileSize = metrics.story2_5dIsoLogicalTileSize;
      this.story2_5dPlayerScreenX = metrics.story2_5dPlayerScreenX;
```

- [ ] **Step 4: Emit A1 metrics from the Pixi game**

In `src/game/PixiWastelandGame.ts`, add this before the metrics object in `emitMetrics()`:

```ts
    const projectedPlayer =
      this.isStoryMode() && this.player ? this.projectPoint(this.player) : undefined;
```

Replace the existing story projection metric block:

```ts
      story2_5dEnabled: this.isStoryMode(),
      story2_5dGroundScaleY: this.isStoryMode() ? STORY_2_5D_CONFIG.groundScaleY : undefined,
      story2_5dPlayerScreenY: this.isStoryMode() && this.player ? this.projectPoint(this.player).y : undefined,
```

with:

```ts
      story2_5dEnabled: this.isStoryMode(),
      story2_5dProjectionMode: this.isStoryMode()
        ? STORY_2_5D_CONFIG.projectionMode
        : undefined,
      story2_5dGroundScaleY: undefined,
      story2_5dIsoTileWidth: this.isStoryMode()
        ? STORY_2_5D_CONFIG.isoTileWidth
        : undefined,
      story2_5dIsoTileHeight: this.isStoryMode()
        ? STORY_2_5D_CONFIG.isoTileHeight
        : undefined,
      story2_5dIsoLogicalTileSize: this.isStoryMode()
        ? STORY_2_5D_CONFIG.isoLogicalTileSize
        : undefined,
      story2_5dPlayerScreenX: projectedPlayer?.x,
      story2_5dPlayerScreenY: projectedPlayer?.y,
```

- [ ] **Step 5: Update story e2e projection assertions**

In `tests/e2e/prototype.spec.ts`, replace the `story2_5dGroundScaleY` assertion and the following C-style player screen formula assertion with:

```ts
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectionMode ?? null))
    .toBe("isometric-a1");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoTileWidth ?? 0))
    .toBe(256);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoTileHeight ?? 0))
    .toBe(128);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoLogicalTileSize ?? 0))
    .toBe(256);
```

Keep the volume prop and underlay assertions. After those assertions, add:

```ts
  await expect
    .poll(() =>
      page.evaluate(() => {
        const metrics = window.__prototypeDebug;
        if (
          !metrics?.playerX ||
          !metrics.playerY ||
          !metrics.story2_5dPlayerScreenX ||
          !metrics.story2_5dPlayerScreenY ||
          !metrics.story2_5dIsoTileWidth ||
          !metrics.story2_5dIsoTileHeight ||
          !metrics.story2_5dIsoLogicalTileSize
        ) {
          return false;
        }
        const originX = 20000;
        const originY = 19800;
        const dx = (metrics.playerX - originX) / metrics.story2_5dIsoLogicalTileSize;
        const dy = (metrics.playerY - originY) / metrics.story2_5dIsoLogicalTileSize;
        const expectedX = originX + (dx - dy) * (metrics.story2_5dIsoTileWidth / 2);
        const expectedY = originY + (dx + dy) * (metrics.story2_5dIsoTileHeight / 2);

        return (
          Math.abs(metrics.story2_5dPlayerScreenX - expectedX) < 0.5 &&
          Math.abs(metrics.story2_5dPlayerScreenY - expectedY) < 0.5 &&
          Math.abs(metrics.story2_5dPlayerScreenX - metrics.playerX) > 1 &&
          Math.abs(metrics.story2_5dPlayerScreenY - metrics.playerY) > 1
        );
      }),
    )
    .toBe(true);
```

- [ ] **Step 6: Run focused store and browser tests**

Run:

```bash
npm test -- src/app/gameStore.test.ts src/visual/story2_5dProjection.test.ts src/visual/storySliceRenderer.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
```

Expected:

```text
PASS src/app/gameStore.test.ts
PASS src/visual/story2_5dProjection.test.ts
PASS src/visual/storySliceRenderer.test.ts
1 passed
```

- [ ] **Step 7: Commit**

```bash
git add src/app/gameStore.ts src/app/gameStore.test.ts src/game/PixiWastelandGame.ts tests/e2e/prototype.spec.ts
git commit -m "feat: expose story isometric a1 metrics"
```

---

### Task 4: Inspection Script And Final Verification

**Files:**
- Modify: `scripts/inspect-story-2-5d.mjs`

- [ ] **Step 1: Update screenshot inspection output**

In `scripts/inspect-story-2-5d.mjs`, replace the current story projection output fields:

```js
  story2_5dGroundScaleY: metrics?.story2_5dGroundScaleY,
  story2_5dPlayerScreenY: metrics?.story2_5dPlayerScreenY,
```

with:

```js
  story2_5dProjectionMode: metrics?.story2_5dProjectionMode,
  story2_5dIsoTileWidth: metrics?.story2_5dIsoTileWidth,
  story2_5dIsoTileHeight: metrics?.story2_5dIsoTileHeight,
  story2_5dIsoLogicalTileSize: metrics?.story2_5dIsoLogicalTileSize,
  story2_5dPlayerScreenX: metrics?.story2_5dPlayerScreenX,
  story2_5dPlayerScreenY: metrics?.story2_5dPlayerScreenY,
```

- [ ] **Step 2: Run full unit tests**

Run:

```bash
npm test
```

Expected:

```text
Test Files  43 passed
Tests  200 passed
```

- [ ] **Step 3: Run story e2e smoke**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
```

Expected:

```text
1 passed
```

- [ ] **Step 4: Capture visual inspection screenshot**

Make sure the dev server is running at `http://127.0.0.1:5317/`. If it is not running, start it:

```bash
npm run dev
```

Run:

```bash
STORY_2_5D_SCREENSHOT=/tmp/story-isometric-a1.png node scripts/inspect-story-2-5d.mjs
```

Expected JSON fields:

```json
{
  "story2_5dEnabled": true,
  "story2_5dProjectionMode": "isometric-a1",
  "story2_5dIsoTileWidth": 256,
  "story2_5dIsoTileHeight": 128,
  "story2_5dIsoLogicalTileSize": 256,
  "story2_5dVolumePropCount": 8,
  "story2_5dDepthSortedPropCount": 8,
  "story2_5dProjectedUnderlayEnabled": true
}
```

Open `/tmp/story-isometric-a1.png` and verify:

- ground tiles read as diamonds
- roads run along isometric diagonals
- vanguard and zombies are visible on the diamond map
- central volume props and lighthouse remain visible and sorted
- the screen is not blank

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 6: Commit**

```bash
git add scripts/inspect-story-2-5d.mjs
git commit -m "test: inspect story isometric a1 metrics"
```

---

## Self-Review Checklist

- Spec coverage: Tasks 1-4 cover A1 isometric projection, diamond ground, shared actor/effect projection through existing helpers, metrics, e2e, screenshot inspection, and build verification.
- A2 boundary: No task rewrites gameplay coordinates, movement, collision, spawn logic, AI, damage, story unlocks, or pathfinding.
- Test-first path: Each behavior change starts with failing unit/e2e assertions before production edits.
- Type consistency: A1 metric names are `story2_5dProjectionMode`, `story2_5dIsoTileWidth`, `story2_5dIsoTileHeight`, `story2_5dIsoLogicalTileSize`, and `story2_5dPlayerScreenX`.
- Visual verification: The plan requires `/tmp/story-isometric-a1.png` before completion.
