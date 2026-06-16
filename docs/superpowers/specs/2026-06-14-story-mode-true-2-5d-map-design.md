# Story Mode True 2.5D Map Design

## Goal

Move story mode from "2D map with upright actors" to a convincing 2.5D map using direction C from the visual companion: oblique projection plus volumetric buildings. Keep the current logical world coordinates, combat, enemy AI, pathing, and story progression intact.

## Player Experience

The first readable screen should feel like a slanted ruined city block rather than a top-down board. Roads and ground tiles sit on a compressed oblique plane. Buildings, the lighthouse, cars, streetlights, roadblocks, and signs have visible height, shadows, and stable front/back ordering. Vanguard and zombies still anchor at their feet and can pass in front of or behind tall props without flicker.

## Architecture

Use the existing story projection layer as the contract. Logic continues to read and write world coordinates. Rendering converts those coordinates through `projectStoryPoint`, then assigns z-depth from the logical foot or base point with `getStoryDepth`.

The work stays story-mode-only. Classic and Boss Rush map drawing must remain unchanged.

## Components

### Story Slice Renderer

`src/visual/storySliceRenderer.ts` becomes the owner of the handcrafted 2.5D art slice around the lighthouse. It should expose metadata for props that need depth sorting:

- logical base point
- projected position
- visual height
- depth offset
- role, such as building, vehicle, streetlight, roadblock, sign, lighthouse

Buildings should no longer read as flat map cards. Each building sprite gets a projected ground shadow, a small vertical lift, and an implied roof/face separation. This can be done with sprite composition and lightweight Pixi `Graphics`; new bitmap assets are optional for this pass.

### Story City Underlay

`PixiWastelandGame.drawStoryCity` currently draws large top-down roads, regions, gates, and labels. For story mode, these underlays should be visually subordinated:

- roads use projected strips or compressed graphics
- region rectangles become low-alpha projected ground zones
- labels move into the world UI layer or are toned down
- old flat lighthouse vector art is removed or reduced so the slice renderer lighthouse owns the center landmark

### Depth And Occlusion

The story world already enables `sortableChildren`. This pass should make the map participate in that system:

- prop/lighthouse containers use logical base y for z-index
- actors keep foot-based z-index
- effects remain above actors unless explicitly ground-bound
- building shadows and ground decals stay below actors

The rule is stable y-depth, not distance-to-camera heuristics, to avoid jitter during movement and firing.

### Fog And Atmosphere

Texture fog should stay attached to the ground plane. Its y-scale remains compressed by the story projection, but it should layer behind tall silhouettes so buildings and the lighthouse read as vertical forms through the haze.

## Not In Scope

- A full isometric coordinate rewrite.
- Rebuilding collision boxes, pathfinding, spawn math, or AI.
- Redrawing all map assets before proving the composition.
- Changing non-story modes.
- Adding new story quests or cutscenes.

## Acceptance Criteria

- Story mode visibly reads as a 2.5D city map, not a flat 2D board.
- At least three central buildings, the lighthouse, and major props have clear height, shadows, and depth metadata.
- Vanguard and zombies can move in front of and behind central props without z-order flicker.
- Bullets, hit sparks, scan pulses, and fog remain aligned with the projected scene.
- The old top-down city graphics no longer dominate the first screen.
- Existing story zombie waves still spawn and remain playable.
- Classic mode and Boss Rush visuals are unchanged.

## Testing

- Add unit tests for story slice prop metadata, projected positions, and depth offsets.
- Add unit tests for story city map volume metrics or renderer wiring.
- Keep existing projection, actor visual, weapon visual, and story slice tests passing.
- Run the story 2.5D visual inspection script and capture screenshots after implementation.
- Run the relevant story e2e test to confirm zombie waves still appear.
