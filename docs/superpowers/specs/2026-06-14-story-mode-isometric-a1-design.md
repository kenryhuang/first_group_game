# Story Mode Isometric A1 Design

## Goal

Convert story mode from the current C-style oblique 2.5D map to direction A: a diamond isometric map. The first phase is A1: visual isometric rendering only. Gameplay coordinates, movement, collision, spawning, enemy AI, bullets, damage, and story progression stay in the existing world coordinate system.

After A1 proves the look and camera feel, A2 can consider a deeper tile-grid gameplay rewrite.

## Player Experience

Story mode should read as a clear diamond-tile city map instead of a compressed rectangular top-down map. Ground, roads, fog, lighthouse, buildings, vehicles, vanguard, zombies, bullets, hit sparks, and scan effects all appear in the same isometric projection. The player should still move freely with the current controls, but the world visually looks like a diagonal grid with front/back depth.

The first screen should make the A direction obvious:

- repeated ground tiles are diamond-shaped, not rectangular blocks
- roads run along isometric diagonals
- vanguard and zombies stand on tile diamonds by foot anchors
- buildings and the lighthouse sort by their base point and can occlude actors
- bullets and effects visually follow the same projection as actors

## Architecture

Add an isometric projection mode for story rendering while preserving logical world coordinates. The projection module should support both the current C projection and the new A1 isometric projection, with story mode selecting the isometric path once A1 is enabled.

A1 projection uses world coordinates relative to the story origin:

```ts
screenX = origin.x + (dx - dy) * tileWidthHalf;
screenY = origin.y + (dx + dy) * tileHeightHalf;
```

`dx` and `dy` are scaled logical world offsets. The exact scale is tuned in tests and screenshot inspection, but the API must remain stable:

- `projectStoryPoint(point, origin)` returns a screen point
- `unprojectStoryPoint(point, origin)` returns an approximate logical point for pointer aim
- `projectStoryAngle(from, to, origin)` computes visual angle from projected positions
- `getStoryDepth(point, offset)` keeps y-depth stable for actors and props

## Components

### Projection Module

`src/visual/story2_5dProjection.ts` becomes the story projection gateway. A1 should add named isometric config values such as tile width, tile height, logical tile size, and mode. Tests should prove world-to-screen, inverse mapping, visual aim angles, and depth ordering.

The implementation should avoid rewriting callers across the game. Existing call sites already use `projectStoryPoint`, `unprojectStoryPoint`, and `projectStoryAngle`; A1 should make those functions produce the isometric visual output.

### Story Slice Renderer

`src/visual/storySliceRenderer.ts` should draw a diamond-tile ground field around the lighthouse. Ground tiles can reuse existing bitmap textures as clipped/rotated/positioned diamond sprites or lightweight Pixi `Graphics` diamond masks for the first pass.

The current volume props remain, but their projected positions come from the isometric projection. Buildings and lighthouse continue to be promoted to depth-sorted world children.

### Story City Underlay

`PixiWastelandGame.drawStoryCity()` should replace broad projected rectangles with isometric diamond strips and low-alpha diamond regions. The underlay should support roads along the two iso diagonals, not vertical/horizontal top-down lanes.

### Actors, Weapons, Effects, And Camera

Actors, weapon muzzle visuals, projectiles, effects, scan pulses, labels, and camera follow should keep going through the existing projection helpers. No gameplay math changes are allowed in A1.

Pointer aim should continue using `unprojectStoryPoint` so mouse targeting remains understandable after the projection change.

## A2 Later

A2 is intentionally out of scope for this spec. A2 may include:

- logical tile coordinates for movement and spawn rules
- tile occupancy or collision masks
- pathfinding tuned for isometric streets
- map editing based on tile data rather than handcrafted slice placement
- broader asset pipeline for isometric building and terrain variants

A1 must leave clear boundaries for A2 by keeping projection logic isolated and keeping renderer metadata explicit.

## Not In Scope

- Rewriting movement, collision, enemy AI, spawning, damage, or story unlock logic.
- Rebuilding all map art as new hand-painted isometric assets.
- Changing classic mode or Boss Rush.
- Adding cutscenes or new story content.
- Solving full tile-based pathfinding.

## Acceptance Criteria

- Story mode clearly shows a diamond isometric map on first load.
- Vanguard, zombies, bullets, hit sparks, fog, scan pulse, buildings, and lighthouse use the same projection.
- Existing zombie waves still spawn and remain playable.
- The central volume props still report depth metadata and sort against actors.
- Pointer aim remains usable after inverse projection.
- Current C-style compressed rectangular ground no longer dominates the story screen.
- Classic mode and Boss Rush visuals remain unchanged.

## Testing

- Update projection unit tests for isometric constants, world-to-screen mapping, inverse mapping, visual aim angle, and depth.
- Update story slice renderer tests for diamond ground placement and volume prop projection.
- Update e2e metrics to assert A1 isometric projection is enabled.
- Run the story visual inspection script and capture a screenshot for visual review.
- Run full unit tests, story e2e smoke, and production build before completion.
