# Story Mode Isometric A2 Preview Design

## Goal

Move story mode from A1 visual isometric projection toward an A2 true 2.5D isometric city map. This first A2 step is a playable preview slice, not a full gameplay rewrite. It should make the game look like the generated target preview: a hand-painted diamond-tile wasteland city with diagonal streets, visible building footprints, vertical props, tile-aligned clutter, and clear actor occlusion.

The preview should preserve current story combat, weapon behavior, enemy spawning, damage, progression, and free movement unless a small collision adjustment is required for visible building footprints.

## Player Experience

On entering story mode, the first screen should no longer feel like flat projected rectangles with some standing characters. It should read as a real isometric city plaza:

- ground is made from diamond tiles with varied concrete, road, curb, rubble, and toxic-stained variants
- roads follow the two isometric diagonals and form actual lanes through the plaza
- the lighthouse/reactor and nearby structures occupy clear tile footprints
- buildings, barriers, signs, and vehicles have base shadows and vertical height
- vanguard and zombies stand on tile foot anchors and can pass in front of or behind props
- bullets, hit sparks, scan effects, fog sheets, and actor shadows remain on the same projected plane

The intended look is still readable action-roguelite gameplay, not a slow tactics-game grid. The tile structure is visual and spatial scaffolding first; full turn/grid rules are not part of this pass.

## A2 Preview Boundary

In scope:

- story mode only
- a data-driven isometric preview map around the starting lighthouse
- tile definitions for ground, roads, curbs, plaza tiles, rubble, and blocked footprints
- renderer support for tile-driven diamond ground and prop placement
- depth sorting based on tile base points and actor foot anchors
- a debug metric set proving the A2 preview map is active
- one screenshot inspection command for visual review
- light collision masks for major visible building/prop footprints if needed to prevent actors walking through large structures

Out of scope:

- full tile-grid movement
- full pathfinding rewrite
- full map editor
- replacing all story regions with tile maps
- changing classic mode or boss rush
- changing weapon balance, story progression, enemy stats, or wave pacing
- generating the final full hand-painted asset library

## Architecture

A1 already isolates story projection in `src/visual/story2_5dProjection.ts`. A2 preview should keep that projection and add a map-data layer above it:

1. Story gameplay state remains in existing world coordinates.
2. A new tile map module describes the starting plaza in logical tile coordinates.
3. The renderer converts tile coordinates to world anchor points, then uses the existing projection helpers for screen placement.
4. Props define a base tile footprint and a vertical visual layer. Their z-index comes from their base anchor, not from image center.
5. Optional collision rectangles are derived from large blocked footprints and fed into story-mode collision only when the object is clearly solid.

This avoids the risky part of A2 while still producing the visual result: the city is authored as an isometric grid, but combat still runs on the current free-movement system.

## Components

### Story Isometric Map Data

Add a focused data module for the first preview slice, for example `src/visual/storyIsoMap.ts`.

It should define:

- tile size in logical coordinates, matching A1 projection constants
- a compact 2D or coordinate-list map around the lighthouse
- tile kinds: `plaza`, `road`, `roadCracked`, `curb`, `concrete`, `stain`, `rubble`, `blocked`
- prop definitions with tile anchor, footprint size, role, height, texture or generated-graphics fallback, and depth offset
- spawn/readability metadata only if tests need it

The data should be readable enough to tune manually. For this preview, a 13x11 or similar tile field is enough.

### Ground Renderer

Refactor `storySliceRenderer` so the current hardcoded 9x7 tile loops can be replaced by map data.

Each ground tile should render as a diamond with:

- fill palette by tile kind
- subtle outline and surface variation
- optional road markings along diagonal lanes
- optional curb strips where road meets plaza
- low alpha fog still above the ground

The first implementation may use Pixi `Graphics` diamonds instead of final bitmap tiles. The important part is composition and depth, not final asset fidelity.

### Prop And Occlusion Renderer

Props should be placed from tile anchors, not arbitrary screen coordinates. Each prop needs:

- base anchor point
- footprint in tile coordinates
- visual height
- shadow ellipse on the ground plane
- z-index from the base edge
- child image or high-detail graphics fallback

This is where A2 becomes visibly better than A1: a building or roadblock can stand in front of an actor when the actor is behind its base, while actors in front remain visible.

### Story City Underlay

`PixiWastelandGame.drawStoryCity()` currently projects broad road and region rectangles. In the A2 preview, the starting lighthouse area should favor the tile map and avoid drawing large rectangular underlay shapes over it.

The broader locked regions can remain as low-alpha projected district shapes outside the preview slice. The first screen should be dominated by the A2 map, not the old underlay.

### Metrics And Debugging

Expose metrics through the existing debug path:

- keep `story2_5dProjectionMode: "isometric-a1"` because the projection math remains A1
- add `storyIsoMapMode: "a2-preview"` to identify the tile-authored preview map
- tile width, tile height, logical tile size
- preview tile count
- preview road tile count
- preview prop count
- depth-sorted prop count
- blocked footprint count

The inspection script should print these values and capture `/tmp/story-isometric-a2-preview.png`.

## Visual Direction

Use the generated preview image as the target direction:

- high-detail cartoon wasteland city
- teal-grey concrete and toxic fog
- muted ochre road markings
- rusty orange props and barriers
- blue energy accents on the vanguard and lighthouse
- yellow-green zombies
- crisp chunky outlines
- tile seams and painterly surface detail

Do not over-darken the map. Characters must remain readable during action.

## Data Flow

Story mode startup:

1. `PixiWastelandGame.drawStoryCity()` creates the broad story background.
2. `createStorySliceRenderer()` receives the A2 preview map data and story projection callback.
3. Ground tiles are rendered from map coordinates.
4. Props are rendered from map coordinates and attached to the world container for depth sorting where needed.
5. Actor, weapon, projectile, and effect rendering continues through existing projection helpers.
6. Metrics expose tile and prop counts for tests and screenshot inspection.

## Testing

Unit tests:

- projection tests continue to prove isometric mapping and inverse mapping
- map data tests verify tile counts, road counts, blocked footprint counts, and required central lighthouse anchor
- renderer tests verify map-driven ground tile debug metadata, prop debug metadata, and z-index ordering
- store tests verify new A2 preview metrics default and sync behavior

E2E:

- story mode still starts zombie waves
- boss encounters remain absent from the opening story tuning test
- A2 preview metric is active
- preview tile count and prop count are nonzero and stable
- vanguard projected screen coordinates still follow the projection helper

Visual:

- run the screenshot inspection script
- confirm diamond tile city, diagonal roads, visible building footprints, actors/zombies on foot anchors, and nonblank gameplay screen

## Risks

- If prop footprints are too aggressive, movement can feel blocked in a game that was built for free movement. Start with only large visual obstacles and keep pathways wide.
- If the tile count is too high, Pixi `Graphics` draws may cost performance. Keep the first preview slice compact and cache or batch later only if profiling shows a problem.
- If the broader region underlay remains too strong, it can visually fight the A2 map. The first screen should prioritize the tile slice.
- If occlusion is too strong, the player can disappear during combat. Use base sorting and keep key combat props lower or offset from the starting combat lane.

## Acceptance Criteria

- Story mode first screen clearly resembles a true isometric tile city, not only projected rectangles.
- The starting plaza contains tile-authored roads, curbs, concrete, rubble, and stains.
- Lighthouse and major props have visible tile footprints and depth-sorted bases.
- Vanguard, zombies, bullets, hit sparks, fog, and scan effects remain playable and projected consistently.
- Zombies still spawn in story mode and opening story progression remains intact.
- The screenshot inspection output reports A2 preview metrics and saves a review image.
- `npm test`, the story e2e smoke test, screenshot inspection, and production build pass before the work is called complete.
