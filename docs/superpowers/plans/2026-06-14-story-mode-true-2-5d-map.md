# Story Mode True 2.5D Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make story mode read as a real 2.5D map by giving the lighthouse slice projected ground, volumetric props, stable depth sorting, and a subdued projected city underlay while preserving current gameplay coordinates.

**Architecture:** Keep logic in current 2D world coordinates and project only render placement through `src/visual/story2_5dProjection.ts`. Promote central volumetric props to top-level world children with z-index based on logical base points so they sort against vanguard, zombies, bullets, and effects. Keep story-only metrics for test and visual inspection.

**Tech Stack:** TypeScript, PixiJS v8 `Container`/`Graphics`/`Sprite`, Vitest/jsdom, Playwright, Vite.

---

## Scope Boundary

This plan implements `docs/superpowers/specs/2026-06-14-story-mode-true-2-5d-map-design.md`.

In scope:

- Story mode only.
- Direction C: oblique projection plus volumetric buildings.
- Static central slice props with shadows, visual height, base-point metadata, and z-index.
- Projected/subdued story city roads, regions, gates, and labels.
- Metrics and e2e assertions that prove true 2.5D map rendering is active.
- Visual screenshot inspection after implementation.

Out of scope:

- Classic mode and Boss Rush visual changes.
- Full isometric coordinate rewrite.
- Collision/pathing/spawn/AI rewrites.
- New bitmap asset generation.
- New story missions or cutscenes.

## File Structure

- `src/visual/storySliceRenderer.ts`: add volume prop metadata, top-level depth-sorted prop containers, shadow/height composition, and debug accessors.
- `src/visual/storySliceRenderer.test.ts`: test volume prop metadata, top-level parentage, z-index, projected positions, and sprite counts.
- `src/app/gameStore.ts`: add story true-2.5D map debug metrics.
- `src/app/gameStore.test.ts`: verify metric defaults and sync behavior.
- `src/game/PixiWastelandGame.ts`: project/subdue story city underlay, remove competing flat lighthouse vector, wire volume metrics.
- `tests/e2e/prototype.spec.ts`: assert true-2.5D map metrics in story mode while keeping zombie wave and no-boss assertions.
- `scripts/inspect-story-2-5d.mjs`: print the new map volume metrics with the screenshot output.

---

### Task 1: Story Slice Volume Prop Contract

**Files:**
- Modify: `src/visual/storySliceRenderer.test.ts`
- Modify: `src/visual/storySliceRenderer.ts`

- [ ] **Step 1: Write the failing volume prop test**

Update the projection import in `src/visual/storySliceRenderer.test.ts`:

```ts
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryPoint,
} from "./story2_5dProjection";
```

Add this test inside `describe("story slice renderer", () => { ... })` after `"creates stable named layers under one root"`:

```ts
  it("promotes volumetric story props to top-level depth-sorted world children", () => {
    const world = new Container();
    const center = STORY_CENTER_LIGHTHOUSE.position;
    const renderer = createStorySliceRenderer({
      world,
      center,
      lit: false,
      projectPoint: (point) => projectStoryPoint(point, center),
    });

    const props = renderer.debugVolumeProps();

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
    expect(props.filter((prop) => prop.role === "building")).toHaveLength(3);
    expect(props.every((prop) => prop.visualHeight > 0)).toBe(true);
    expect(props.every((prop) => prop.containerParentLabel === "story-world-root")).toBe(true);
    expect(props.every((prop) => prop.shadowChildCount >= 1)).toBe(true);

    const firstBuilding = props[0];
    expect(firstBuilding.label).toBe("story-volume-building-green");
    expect(firstBuilding.basePoint).toEqual({
      x: center.x - 520,
      y: center.y - 390 + 118,
    });
    expect(firstBuilding.projectedPoint).toEqual(
      projectStoryPoint(firstBuilding.basePoint, center),
    );
    expect(firstBuilding.zIndex).toBe(getStoryDepth(firstBuilding.basePoint, 70));

    const lighthouse = props.at(-1);
    expect(lighthouse?.label).toBe("story-volume-lighthouse");
    expect(lighthouse?.basePoint).toEqual(center);
    expect(lighthouse?.zIndex).toBe(getStoryDepth(center, 95));
  });
```

Update the first renderer test expectations because volume props will be top-level world children rather than children of `layers.prop` and `layers.lighthouse`:

```ts
    expect(renderer.layers.prop.children).toHaveLength(0);
    expect(renderer.layers.lighthouse.children).toHaveLength(0);
    expect(renderer.debugSpriteCount()).toBeGreaterThanOrEqual(86);
```

- [ ] **Step 2: Run the renderer test and verify the expected failure**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
FAIL src/visual/storySliceRenderer.test.ts
TypeError: renderer.debugVolumeProps is not a function
```

- [ ] **Step 3: Add volume prop types and debug accessors**

In `src/visual/storySliceRenderer.ts`, update the Pixi import:

```ts
import { Container, Graphics, Sprite, Texture } from "pixi.js";
```

Update the projection import:

```ts
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  type StoryPoint,
} from "./story2_5dProjection";
```

Add these interfaces near `StorySliceRendererOptions`:

```ts
type StoryVolumePropRole =
  | "building"
  | "vehicle"
  | "streetlight"
  | "roadblock"
  | "sign"
  | "lighthouse";

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
}
```

Extend `StorySliceRenderer`:

```ts
  debugVolumeProps(): StoryVolumePropDebug[];
```

- [ ] **Step 4: Implement top-level volumetric prop containers**

Replace `addProps` with helpers that keep debris in the decal layer and promote volume props directly to `options.world`:

```ts
function getVolumePropDefinitions(center: StoryPoint): StoryVolumePropDefinition[] {
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

function addGroundDecals(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): void {
  const [debrisOne, debrisTwo] = STORY_SLICE_ASSETS.map.decorations;
  layers.decal.addChild(
    makeSprite(debrisOne, center.x - 180, center.y + 140, 0.78, options),
  );
  layers.decal.addChild(
    makeSprite(debrisTwo, center.x + 230, center.y - 110, 0.78, options),
  );
}

function makeVolumeProp(
  definition: StoryVolumePropDefinition,
  options: Pick<StorySliceRendererOptions, "world" | "projectPoint">,
): { container: Container; debug: StoryVolumePropDebug } {
  const basePoint = {
    x: definition.x,
    y: definition.y + definition.baseYOffset,
  };
  const projectedPoint = options.projectPoint?.(basePoint) ?? basePoint;
  const container = new Container();
  container.label = definition.label;
  container.position.set(projectedPoint.x, projectedPoint.y);
  container.zIndex = getStoryDepth(basePoint, definition.depthOffset);
  container.sortableChildren = true;

  const shadow = new Graphics();
  shadow.label = `${definition.label}-shadow`;
  shadow
    .ellipse(0, 0, 86 * definition.shadowScaleX, 24 * definition.shadowScaleY)
    .fill({ color: 0x050706, alpha: 0.44 });
  shadow.zIndex = -2;
  container.addChild(shadow);

  const sprite = new Sprite(Texture.from(definition.texturePath));
  sprite.label = `${definition.label}-sprite`;
  sprite.anchor.set(0.5, 1);
  sprite.position.set(0, -definition.visualHeight * 0.18);
  sprite.scale.set(definition.scale);
  sprite.zIndex = 2;
  container.addChild(sprite);

  options.world.addChild(container);

  return {
    container,
    debug: {
      label: definition.label,
      role: definition.role,
      basePoint,
      projectedPoint,
      visualHeight: definition.visualHeight,
      zIndex: container.zIndex,
      containerParentLabel: container.parent?.label,
      shadowChildCount: container.children.filter((child) =>
        child.label?.endsWith("-shadow"),
      ).length,
    },
  };
}
```

Inside `createStorySliceRenderer`, replace the old prop call:

```ts
  addGround(layers, options.center, options);
  addGroundDecals(layers, options.center, options);
  const volumeProps = getVolumePropDefinitions(options.center).map((definition) =>
    makeVolumeProp(definition, options),
  );
```

Before adding `root` to the world, label the world so tests and debug metrics have a stable parent label:

```ts
  options.world.label ||= "story-world-root";
```

When creating the lighthouse, use a volume prop instead of adding it to `layers.lighthouse`:

```ts
  const lighthouseVolume = makeVolumeProp(
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
  const lighthouse = lighthouseVolume.container.children.find(
    (child) => child.label === "story-volume-lighthouse-sprite",
  ) as Sprite;
  volumeProps.push(lighthouseVolume);
```

Add the accessor in the returned object:

```ts
    debugVolumeProps(): StoryVolumePropDebug[] {
      return volumeProps.map((prop) => ({
        ...prop.debug,
        zIndex: prop.container.zIndex,
        containerParentLabel: prop.container.parent?.label,
        shadowChildCount: prop.container.children.filter((child) =>
          child.label?.endsWith("-shadow"),
        ).length,
      }));
    },
```

Update `debugSpriteCount` so it includes promoted volume containers:

```ts
    debugSpriteCount(): number {
      let count = volumeProps.length;
      for (const prop of volumeProps) {
        count += prop.container.children.length;
      }
      for (const layer of Object.values(layers)) {
        count += layer.children.length;
      }
      return count;
    },
```

Update `destroy` so promoted containers are destroyed with the renderer:

```ts
      for (const prop of volumeProps) {
        prop.container.destroy({ children: true });
      }
      root.destroy({ children: true });
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
git commit -m "feat: add story 2.5d volume props"
```

---

### Task 2: True 2.5D Map Metrics

**Files:**
- Modify: `src/app/gameStore.test.ts`
- Modify: `src/app/gameStore.ts`
- Modify: `src/game/PixiWastelandGame.ts`

- [ ] **Step 1: Write the failing store metric test**

In `src/app/gameStore.test.ts`, extend `"defaults and syncs story art slice metrics"`:

```ts
    expect(store.story2_5dVolumePropCount).toBeUndefined();
    expect(store.story2_5dDepthSortedPropCount).toBeUndefined();
    expect(store.story2_5dProjectedUnderlayEnabled).toBe(false);
```

Add these fields to the `store.syncMetrics({ ... })` call:

```ts
      story2_5dVolumePropCount: 8,
      story2_5dDepthSortedPropCount: 8,
      story2_5dProjectedUnderlayEnabled: true,
```

Add these assertions after the existing `story2_5dPlayerScreenY` assertion:

```ts
    expect(store.story2_5dVolumePropCount).toBe(8);
    expect(store.story2_5dDepthSortedPropCount).toBe(8);
    expect(store.story2_5dProjectedUnderlayEnabled).toBe(true);
```

- [ ] **Step 2: Run the store test and verify the expected failure**

Run:

```bash
npm test -- src/app/gameStore.test.ts
```

Expected:

```text
FAIL src/app/gameStore.test.ts
expected undefined to be false
```

- [ ] **Step 3: Add metrics to the store contract**

In `src/app/gameStore.ts`, extend `GameMetrics`:

```ts
  story2_5dVolumePropCount?: number;
  story2_5dDepthSortedPropCount?: number;
  story2_5dProjectedUnderlayEnabled?: boolean;
```

Add defaults in `createInitialMetrics()`:

```ts
    story2_5dVolumePropCount: undefined,
    story2_5dDepthSortedPropCount: undefined,
    story2_5dProjectedUnderlayEnabled: false,
```

Add sync assignments in `syncMetrics`:

```ts
      this.story2_5dVolumePropCount = metrics.story2_5dVolumePropCount;
      this.story2_5dDepthSortedPropCount = metrics.story2_5dDepthSortedPropCount;
      this.story2_5dProjectedUnderlayEnabled = metrics.story2_5dProjectedUnderlayEnabled;
```

- [ ] **Step 4: Wire metrics from the game renderer**

In `src/game/PixiWastelandGame.ts`, add a private field near `private storySliceRenderer?: StorySliceRenderer;`:

```ts
  private storyProjectedUnderlayEnabled = false;
```

Do not set this field to `true` in this task. Task 3 flips it only after the old top-down city underlay has been replaced with projected graphics.

Add renderer metrics in `emitMetrics()`:

```ts
      story2_5dVolumePropCount: this.isStoryMode()
        ? this.storySliceRenderer?.debugVolumeProps().length
        : undefined,
      story2_5dDepthSortedPropCount: this.isStoryMode()
        ? this.storySliceRenderer
          ?.debugVolumeProps()
          .filter((prop) => prop.containerParentLabel === "story-world-root").length
        : undefined,
      story2_5dProjectedUnderlayEnabled: this.isStoryMode()
        ? this.storyProjectedUnderlayEnabled
        : false,
```

- [ ] **Step 5: Run metric tests and renderer tests**

Run:

```bash
npm test -- src/app/gameStore.test.ts src/visual/storySliceRenderer.test.ts
```

Expected:

```text
PASS src/app/gameStore.test.ts
PASS src/visual/storySliceRenderer.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/gameStore.ts src/app/gameStore.test.ts src/game/PixiWastelandGame.ts
git commit -m "feat: expose story true 2.5d map metrics"
```

---

### Task 3: Project And Subdue Story City Underlay

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`
- Modify: `tests/e2e/prototype.spec.ts`

- [ ] **Step 1: Add failing e2e assertions for true 2.5D map metrics**

In `tests/e2e/prototype.spec.ts`, inside `"story mode map tuning starts with zombie waves and without boss encounters"` after the existing `story2_5dGroundScaleY` assertion, add:

```ts
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dVolumePropCount ?? 0))
    .toBeGreaterThanOrEqual(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dDepthSortedPropCount ?? 0))
    .toBeGreaterThanOrEqual(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectedUnderlayEnabled ?? false))
    .toBe(true);
```

- [ ] **Step 2: Run the story e2e test and verify the expected failure**

Run:

```bash
npm run test:e2e -- --grep "story mode map tuning"
```

Expected before the projected underlay replacement in this task is complete:

```text
FAIL tests/e2e/prototype.spec.ts
Expected: true
Received: false
```

The volume prop count assertions should already pass after Task 2. The `story2_5dProjectedUnderlayEnabled` assertion should fail until the projected underlay replacement is implemented in this task.

- [ ] **Step 3: Add projected quad helpers**

In `src/game/PixiWastelandGame.ts`, add these helpers near `setViewPosition`:

```ts
  private drawProjectedStoryQuad(
    view: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Graphics {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    const topLeft = this.projectPoint({ x: left, y: top });
    const topRight = this.projectPoint({ x: right, y: top });
    const bottomRight = this.projectPoint({ x: right, y: bottom });
    const bottomLeft = this.projectPoint({ x: left, y: bottom });

    return view
      .moveTo(topLeft.x, topLeft.y)
      .lineTo(topRight.x, topRight.y)
      .lineTo(bottomRight.x, bottomRight.y)
      .lineTo(bottomLeft.x, bottomLeft.y)
      .closePath();
  }

  private placeStoryWorldLabel(label: Text, x: number, y: number, depthOffset = 160): void {
    const projected = this.projectPoint({ x, y });
    label.position.set(projected.x, projected.y);
    label.zIndex = this.getStoryVisualDepth({ x, y }, depthOffset);
  }
```

- [ ] **Step 4: Replace flat story roads and regions with projected underlay graphics**

In `drawStoryCity()`, replace the road drawing block with:

```ts
    this.storyProjectedUnderlayEnabled = true;

    const road = new Graphics();
    road.zIndex = this.getStoryVisualDepth({ x: 0, y: 0 }, -900);
    for (let x = 2200; x <= this.getMapWidth(); x += 2600) {
      this.drawProjectedStoryQuad(road, x, this.getMapHeight() / 2, 84, this.getMapHeight())
        .fill({ color: 0x151914, alpha: 0.34 });
    }
    for (let y = 2200; y <= this.getMapHeight(); y += 2600) {
      this.drawProjectedStoryQuad(road, this.getMapWidth() / 2, y, this.getMapWidth(), 84)
        .fill({ color: 0x151914, alpha: 0.42 });
    }
    this.world.addChild(road);
```

In the story region loop, replace the top-down rectangle drawing with projected quads:

```ts
      this.drawProjectedStoryQuad(district, region.x, region.y, region.width, region.height)
        .fill({ color: region.color, alpha: unlocked ? 0.28 : 0.12 })
        .stroke({
          color: unlocked ? 0x59614f : 0x1a080b,
          alpha: unlocked ? 0.34 : 0.6,
          width: unlocked ? 2 : 10,
        });
      district.zIndex = this.getStoryVisualDepth(
        { x: region.x, y: region.y + region.height / 2 },
        -820,
      );
```

Replace label placement:

```ts
      this.placeStoryWorldLabel(
        label,
        region.x - region.width / 2 + 34,
        region.y - region.height / 2 + 24,
      );
```

Replace lock label placement:

```ts
        this.placeStoryWorldLabel(lockLabel, region.x, region.y, 170);
```

- [ ] **Step 5: Project passage gates and remove the competing flat lighthouse vector**

In the passage loop, replace `gate.rect(...).fill(...).stroke(...)` with:

```ts
          this.drawProjectedStoryQuad(gate, rect.x, rect.y, rect.width, rect.height)
            .fill({ color: unlocked ? 0x151914 : 0x160709, alpha: unlocked ? 0.36 : 0.34 })
            .stroke({
              color: unlocked ? 0x050706 : 0x9a1f2f,
              alpha: unlocked ? 0.5 : 0.64,
              width: unlocked ? 4 : 6,
            });
          gate.zIndex = this.getStoryVisualDepth(
            { x: rect.x, y: rect.y + rect.height / 2 },
            -780,
          );
```

Leave the marker loop intact for now, but lower its alpha values to `0.05` for unlocked and `0.025` for locked so it reads as texture instead of top-down UI.

Remove the old `tower`, `"中心灯塔"` label, and lighthouse instruction sub-label blocks from `drawStoryCity()`. The central landmark and glow should be owned by `createStorySliceRenderer`.

- [ ] **Step 6: Run unit and e2e tests**

Run:

```bash
npm test -- src/app/gameStore.test.ts src/visual/storySliceRenderer.test.ts
npm run test:e2e -- --grep "story mode map tuning"
```

Expected:

```text
PASS src/app/gameStore.test.ts
PASS src/visual/storySliceRenderer.test.ts
PASS tests/e2e/prototype.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/game/PixiWastelandGame.ts tests/e2e/prototype.spec.ts
git commit -m "feat: project story city underlay"
```

---

### Task 4: Visual Inspection Script And Regression Sweep

**Files:**
- Modify: `scripts/inspect-story-2-5d.mjs`

- [ ] **Step 1: Update the inspection script output**

In `scripts/inspect-story-2-5d.mjs`, add the true-map metrics to the final `console.log` object:

```js
  story2_5dVolumePropCount: metrics?.story2_5dVolumePropCount,
  story2_5dDepthSortedPropCount: metrics?.story2_5dDepthSortedPropCount,
  story2_5dProjectedUnderlayEnabled: metrics?.story2_5dProjectedUnderlayEnabled,
```

- [ ] **Step 2: Run the focused unit tests**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts src/app/gameStore.test.ts src/visual/story2_5dProjection.test.ts src/visual/storyActorVisuals.test.ts src/visual/playerWeaponVisuals.test.ts
```

Expected:

```text
PASS src/visual/storySliceRenderer.test.ts
PASS src/app/gameStore.test.ts
PASS src/visual/story2_5dProjection.test.ts
PASS src/visual/storyActorVisuals.test.ts
PASS src/visual/playerWeaponVisuals.test.ts
```

- [ ] **Step 3: Run the browser e2e story smoke**

Run:

```bash
npm run test:e2e -- --grep "story mode map tuning"
```

Expected:

```text
PASS tests/e2e/prototype.spec.ts
```

- [ ] **Step 4: Capture the visual inspection screenshot**

Start the dev server if one is not already running:

```bash
npm run dev -- --host 127.0.0.1 --port 5317
```

In a second terminal, run:

```bash
STORY_2_5D_SCREENSHOT=/tmp/story-true-2-5d-map.png node scripts/inspect-story-2-5d.mjs
```

Expected JSON fields:

```json
{
  "story2_5dEnabled": true,
  "story2_5dGroundScaleY": 0.56,
  "story2_5dVolumePropCount": 8,
  "story2_5dDepthSortedPropCount": 8,
  "story2_5dProjectedUnderlayEnabled": true
}
```

Open `/tmp/story-true-2-5d-map.png` and verify:

- the old flat lighthouse vector is gone
- central buildings have ground shadows and height
- at least one prop visually overlaps the actor plane
- roads and region zones are compressed into an oblique underlay
- zombies are visible and the screen is not blank

- [ ] **Step 5: Run final build**

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
git commit -m "test: inspect true story 2.5d map metrics"
```

---

## Self-Review Checklist

- Spec coverage: Tasks 1-3 cover volumetric props, depth sorting, projected underlay, fog/lighthouse layering, metrics, and e2e story playability.
- Test-first path: Each behavior change has a failing unit or e2e assertion before production edits.
- Scope control: No non-story mode rendering, AI, pathing, collision, or asset generation changes.
- Type consistency: The new metric names are `story2_5dVolumePropCount`, `story2_5dDepthSortedPropCount`, and `story2_5dProjectedUnderlayEnabled` across store, game metrics, e2e, and inspection output.
- Visual verification: The plan requires `/tmp/story-true-2-5d-map.png` before final completion.
