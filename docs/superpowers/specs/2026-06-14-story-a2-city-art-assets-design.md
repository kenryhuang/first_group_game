# Story A2 City Art Asset Refresh Design

## Goal

Upgrade the current story-mode A2 preview map from simple placeholder tiles and props into a detailed cartoon wasteland city that follows the approved concept image: an isometric city intersection with a central reactor tower, ruined concrete streets, boxy industrial buildings, teal fog, rusted metal details, yellow-green zombies, and readable player combat.

This pass is an art-asset refresh only. The current 2.5D/isometric camera, story movement, enemy spawning, weapon behavior, collision approach, and A2 map coordinates should remain unchanged unless a tiny prop scale adjustment is required after visual inspection.

## Reference Direction

Use `/Users/huanggui/Downloads/已生成图像 1.png` as the style reference.

Key visual traits:

- Isometric cartoon concept-art style with crisp ink-like outlines.
- Cool teal-grey concrete, dark asphalt roads, muted ochre lane markings.
- Rusted orange-brown metal trim, weathered doors, pipes, vents, rooftop units.
- Central cylindrical reactor/lighthouse with bright cyan core lighting.
- Ruined city density: cracked pavement, rubble, barricades, broken signage, industrial clutter.
- Atmospheric green-blue fog that should not obscure player readability.

## Asset Set

Create a first-screen A2 asset pack under `public/assets/story-slice/a2-city/`.

### Center Tower

Generate four PNG assets:

- `lighthouse-off.png`
- `lighthouse-charging.png`
- `lighthouse-on.png`
- `lighthouse-core-glow.png`

The tower should be a large isometric cylindrical reactor with a concrete/octagonal plinth, rusted metal panels, pipes, door details, railing, and a cyan glass core. The three states should differ mainly in cyan light intensity so gameplay state changes remain readable.

### Buildings

Generate three PNG building props:

- `building-green-01.png`
- `building-ochre-01.png`
- `building-teal-01.png`

Each building should be a separate isometric prop with a visible roof, broken walls, dark door/window openings, vents, pipes, rust stains, edge highlights, and enough transparent padding for shadows and depth sorting. They should match the concept image but stay varied in silhouette and color.

### Street Tiles

Generate four ground tile PNGs:

- `road-straight-01.png`
- `road-cracked-01.png`
- `concrete-broken-01.png`
- `wasteland-grass-01.png`

Each tile should be a diamond isometric ground tile matching the current A2 projection ratio. Roads need dark asphalt, cracked seams, subtle lane markings, and grime. Concrete/plaza tiles need modular slabs, chips, stains, rubble flecks, and teal-grey painterly texture. The grass slot should become a polluted edge/concrete-rubble tile rather than bright natural grass.

### Props

Generate four props:

- `wrecked-car-01.png`
- `streetlight-broken-01.png`
- `roadblock-01.png`
- `signboard-broken-01.png`

These should be compact, readable isometric props with transparent backgrounds, chunky outlines, rust/grime, and sizes compatible with the existing A2 map placements.

## Integration

Keep old assets in place as fallback. Update `src/visual/storyAssetManifest.ts` to point story A2 map assets to the new `a2-city` paths once the files exist.

Update `src/visual/storySliceRenderer.ts` only where necessary so A2 ground can use the generated tile imagery instead of simple Pixi diamond fills. Preserve the existing debug labels, map metrics, blocked footprint metrics, and `isoMap: null` legacy fallback behavior.

The current A2 map data in `src/visual/storyIsoMap.ts` remains the source of tile/prop placement. This pass can adjust per-prop scale values if generated art is visibly too large or too small, but it should not redesign the map layout.

## Validation

Required checks before calling the work complete:

- `npm test`
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"`
- `STORY_2_5D_SCREENSHOT=/tmp/story-a2-city-art-refresh.png node scripts/inspect-story-2-5d.mjs`
- `npm run build`

Visual acceptance:

- The first story screen reads as a detailed isometric city intersection, not placeholder colored tiles.
- The central tower resembles the concept image and remains the strongest landmark.
- Buildings and props have clear footprints and depth layering.
- Roads and pavement show cracked, painterly detail without hurting actor readability.
- Vanguard, zombies, bullets, and fog remain visible during play.
