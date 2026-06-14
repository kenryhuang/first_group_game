# Story A2 City Art Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the story-mode A2 preview's placeholder map art with a concept-image-matched isometric wasteland city asset pack.

**Architecture:** Keep the current A2 map coordinates, story projection, combat, and collision behavior. Add a new `public/assets/story-slice/a2-city/` asset pack, point the story asset manifest at it, and render A2 ground tiles with texture sprites while keeping legacy projected fallback behavior intact.

**Tech Stack:** TypeScript, PixiJS v8, Vite public assets, Vitest/jsdom, Playwright, built-in image generation, PNG chroma-key post-processing with the installed imagegen helper.

---

## Scope Boundary

This plan implements `docs/superpowers/specs/2026-06-14-story-a2-city-art-assets-design.md`.

In scope:

- Generate first-screen A2 city assets inspired by `/Users/huanggui/Downloads/已生成图像 1.png`.
- Add generated PNG files under `public/assets/story-slice/a2-city/`.
- Update story asset manifest paths to consume the new A2 city assets.
- Render A2 map ground tiles with generated diamond tile imagery.
- Keep legacy non-projected and `isoMap: null` renderer paths compatible.
- Validate file existence, PNG dimensions, alpha channel, browser story smoke test, screenshot, and production build.

Out of scope:

- Character sprite regeneration.
- Camera/projection changes.
- Story map layout redesign.
- Movement/pathfinding rewrites.
- Balance, wave, or weapon changes.

## File Structure

- Create `public/assets/story-slice/a2-city/lighthouse/*.png`: new center reactor/tower states.
- Create `public/assets/story-slice/a2-city/map/*.png`: new ground, building, and prop assets.
- Modify `public/assets/story-slice/README.md`: document the A2 city art pack style and export rules.
- Modify `src/visual/storyAssetManifest.ts`: point map and lighthouse paths to `a2-city`.
- Modify `src/visual/storyAssetManifest.test.ts`: assert the manifest references the new paths.
- Modify `src/visual/storyAssetFiles.test.ts`: validate generated file existence, dimensions, and alpha-capable PNG color type.
- Modify `src/visual/storySliceRenderer.ts`: render A2 ground tiles with generated textures and retain debug metadata.
- Modify `src/visual/storySliceRenderer.test.ts`: assert A2 ground texture paths and sprite usage.

---

### Task 1: Asset Contract Tests

**Files:**
- Modify: `src/visual/storyAssetManifest.test.ts`
- Modify: `src/visual/storyAssetFiles.test.ts`

- [ ] **Step 1: Update manifest expectations to require the A2 city paths**

Edit `src/visual/storyAssetManifest.test.ts` so the first and third tests include the new asset paths:

```ts
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
```

Then replace the map/lighthouse assertions in `lists the required map, lighthouse, and effect assets`:

```ts
expect(STORY_SLICE_ASSETS.map.groundTiles).toEqual(A2_CITY_GROUND_TILES);
expect(STORY_SLICE_ASSETS.map.decorations).toEqual(A2_CITY_DECORATIONS);
expect(STORY_SLICE_ASSETS.map.buildings).toEqual(A2_CITY_BUILDINGS);
expect(STORY_SLICE_ASSETS.lighthouse.states).toEqual({
  off: "/assets/story-slice/a2-city/lighthouse/lighthouse-off.png",
  charging: "/assets/story-slice/a2-city/lighthouse/lighthouse-charging.png",
  on: "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png",
});
expect(STORY_SLICE_ASSETS.lighthouse.coreGlow).toBe(
  "/assets/story-slice/a2-city/lighthouse/lighthouse-core-glow.png",
);
```

Update the flattening test's path checks:

```ts
expect(paths).toContain("/assets/story-slice/a2-city/map/road-straight-01.png");
expect(paths).toContain(
  "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png",
);
```

- [ ] **Step 2: Add PNG dimension and alpha validation for A2 city assets**

Edit `src/visual/storyAssetFiles.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
```

Add helpers below the imports:

```ts
interface PngInfo {
  width: number;
  height: number;
  colorType: number;
}

const A2_CITY_EXPECTED_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/assets/story-slice/a2-city/map/road-straight-01.png": { width: 256, height: 256 },
  "/assets/story-slice/a2-city/map/road-cracked-01.png": { width: 256, height: 256 },
  "/assets/story-slice/a2-city/map/concrete-broken-01.png": { width: 256, height: 256 },
  "/assets/story-slice/a2-city/map/wasteland-grass-01.png": { width: 256, height: 256 },
  "/assets/story-slice/a2-city/map/debris-small-01.png": { width: 128, height: 128 },
  "/assets/story-slice/a2-city/map/debris-small-02.png": { width: 128, height: 128 },
  "/assets/story-slice/a2-city/map/wrecked-car-01.png": { width: 256, height: 256 },
  "/assets/story-slice/a2-city/map/streetlight-broken-01.png": { width: 128, height: 128 },
  "/assets/story-slice/a2-city/map/roadblock-01.png": { width: 128, height: 128 },
  "/assets/story-slice/a2-city/map/signboard-broken-01.png": { width: 128, height: 128 },
  "/assets/story-slice/a2-city/map/building-green-01.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/map/building-ochre-01.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/map/building-teal-01.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-off.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-charging.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-on.png": { width: 512, height: 512 },
  "/assets/story-slice/a2-city/lighthouse/lighthouse-core-glow.png": { width: 512, height: 512 },
};

function publicAssetPath(assetPath: string): string {
  const relativePath = assetPath.replace(/^\//, "");
  return join(process.cwd(), "public", relativePath.replace(/^assets\//, "assets/"));
}

function readPngInfo(filePath: string): PngInfo {
  const bytes = readFileSync(filePath);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}
```

Replace the path join inside the existing missing-file test:

```ts
return !existsSync(publicAssetPath(assetPath));
```

Add this test:

```ts
it("has correctly sized alpha-capable A2 city PNG assets", () => {
  for (const [assetPath, expected] of Object.entries(A2_CITY_EXPECTED_DIMENSIONS)) {
    const png = readPngInfo(publicAssetPath(assetPath));
    expect(png.width).toBe(expected.width);
    expect(png.height).toBe(expected.height);
    expect([4, 6]).toContain(png.colorType);
  }
});
```

- [ ] **Step 3: Run focused tests and verify the expected failure**

Run:

```bash
npm test -- src/visual/storyAssetManifest.test.ts src/visual/storyAssetFiles.test.ts
```

Expected:

```text
FAIL src/visual/storyAssetManifest.test.ts
Expected manifest paths to equal /assets/story-slice/a2-city/...

FAIL src/visual/storyAssetFiles.test.ts
Missing A2 city files under public/assets/story-slice/a2-city/...
```

- [ ] **Step 4: Commit the failing asset contract tests**

```bash
git add src/visual/storyAssetManifest.test.ts src/visual/storyAssetFiles.test.ts
git commit -m "test: require story a2 city art assets"
```

---

### Task 2: Generate And Save A2 City Assets

**Files:**
- Create: `public/assets/story-slice/a2-city/lighthouse/lighthouse-off.png`
- Create: `public/assets/story-slice/a2-city/lighthouse/lighthouse-charging.png`
- Create: `public/assets/story-slice/a2-city/lighthouse/lighthouse-on.png`
- Create: `public/assets/story-slice/a2-city/lighthouse/lighthouse-core-glow.png`
- Create: `public/assets/story-slice/a2-city/map/road-straight-01.png`
- Create: `public/assets/story-slice/a2-city/map/road-cracked-01.png`
- Create: `public/assets/story-slice/a2-city/map/concrete-broken-01.png`
- Create: `public/assets/story-slice/a2-city/map/wasteland-grass-01.png`
- Create: `public/assets/story-slice/a2-city/map/debris-small-01.png`
- Create: `public/assets/story-slice/a2-city/map/debris-small-02.png`
- Create: `public/assets/story-slice/a2-city/map/wrecked-car-01.png`
- Create: `public/assets/story-slice/a2-city/map/streetlight-broken-01.png`
- Create: `public/assets/story-slice/a2-city/map/roadblock-01.png`
- Create: `public/assets/story-slice/a2-city/map/signboard-broken-01.png`
- Create: `public/assets/story-slice/a2-city/map/building-green-01.png`
- Create: `public/assets/story-slice/a2-city/map/building-ochre-01.png`
- Create: `public/assets/story-slice/a2-city/map/building-teal-01.png`
- Modify: `public/assets/story-slice/README.md`

- [ ] **Step 1: Create asset directories**

Run:

```bash
mkdir -p public/assets/story-slice/a2-city/lighthouse public/assets/story-slice/a2-city/map tmp/imagegen/a2-city/source
```

Expected: directories exist before the image generation step writes source and final PNG files.

- [ ] **Step 2: Generate each source PNG with built-in image generation**

Use the built-in `image_gen` tool once per row. Treat `/Users/huanggui/Downloads/已生成图像 1.png` as a style reference only, not as an edit target. Each prompt must include the shared constraints.

Shared constraints for every prompt:

```text
Use case: stylized-concept
Asset type: isometric 2.5D game sprite PNG
Input image: /Users/huanggui/Downloads/已生成图像 1.png as style reference for palette, linework, perspective, material detail, and wasteland city mood
Style/medium: high-detail cartoon isometric game art, crisp ink-like outlines, painterly texture, production-quality sprite
Lighting/mood: teal-grey foggy wasteland city, readable action game contrast
Color palette: teal-grey concrete, dark asphalt, muted ochre lane markings, rusted orange-brown metal, cyan energy accents
Composition/framing: single isolated asset centered on a perfectly flat solid #ff00ff chroma-key background, generous padding, no crop, no cast shadow outside the subject
Constraints: no text, no watermark, no logos, no UI, no characters, no bullets, no #ff00ff inside the subject
Avoid: photorealism, top-down flat icon, soft blurred edges, decorative gradient background, extra objects outside the requested asset
```

Asset-specific requests:

| Output source file in `tmp/imagegen/a2-city/source/` | Prompt subject line |
| --- | --- |
| `lighthouse-off-source.png` | `Subject: large isometric cylindrical reactor tower, octagonal concrete plinth, rusted panels, pipes, railing, sealed door, cyan glass core dimly glowing, off state, designed to fit a 512x512 sprite.` |
| `lighthouse-charging-source.png` | `Subject: same style large isometric cylindrical reactor tower, octagonal plinth, rusted panels, pipes, railing, cyan glass core charging with medium cyan glow, designed to fit a 512x512 sprite.` |
| `lighthouse-on-source.png` | `Subject: same style large isometric cylindrical reactor tower, octagonal plinth, rusted panels, pipes, railing, bright cyan glass core fully lit, designed to fit a 512x512 sprite.` |
| `lighthouse-core-glow-source.png` | `Subject: isolated cyan reactor core glow effect, circular glass energy bloom, soft but contained edges, no tower body, designed to overlay a 512x512 tower sprite.` |
| `building-green-01-source.png` | `Subject: isometric ruined teal-green industrial building, visible roof, broken walls, vents, pipes, dark door opening, rust stains, cracked concrete base, designed to fit a 512x512 sprite.` |
| `building-ochre-01-source.png` | `Subject: isometric ruined ochre concrete utility building, rooftop machinery, rusted metal trim, cracked walls, dark windows, rubble at base, designed to fit a 512x512 sprite.` |
| `building-teal-01-source.png` | `Subject: isometric ruined blue-teal two-story block building, rooftop tank, pipes, broken window openings, rust streaks, damaged corner, designed to fit a 512x512 sprite.` |
| `road-straight-01-source.png` | `Subject: diamond isometric road tile, dark cracked asphalt, subtle ochre lane markings following the isometric diagonal, grime, chipped edges, transparent corners, designed to fit a 256x256 tile.` |
| `road-cracked-01-source.png` | `Subject: diamond isometric road tile, dark asphalt with heavier cracks, broken lane marking fragments, rubble flecks, oil stains, transparent corners, designed to fit a 256x256 tile.` |
| `concrete-broken-01-source.png` | `Subject: diamond isometric concrete plaza tile, teal-grey slab seams, chipped corners, cracks, small rubble, painterly grime, transparent corners, designed to fit a 256x256 tile.` |
| `wasteland-grass-01-source.png` | `Subject: diamond isometric polluted concrete edge tile, sparse toxic moss, rubble, teal stains, broken slab seams, no bright natural grass, transparent corners, designed to fit a 256x256 tile.` |
| `debris-small-01-source.png` | `Subject: compact isometric rubble pile, broken concrete chunks, small pipe pieces, rusted scraps, readable silhouette, designed to fit a 128x128 prop sprite.` |
| `debris-small-02-source.png` | `Subject: compact isometric rubble and crate debris cluster, cracked stones, rusted metal fragments, teal grime, readable silhouette, designed to fit a 128x128 prop sprite.` |
| `wrecked-car-01-source.png` | `Subject: isometric rusted wrecked compact car, broken windows, dented body, missing tire, wasteland grime, readable silhouette, designed to fit a 256x256 prop sprite.` |
| `streetlight-broken-01-source.png` | `Subject: tall broken isometric streetlight pole, bent lamp head, exposed wires, rusted base, slim readable silhouette, designed to fit a 128x128 prop sprite.` |
| `roadblock-01-source.png` | `Subject: isometric striped concrete road barrier, black-yellow hazard paint, chipped concrete, rusted metal braces, designed to fit a 128x128 prop sprite.` |
| `signboard-broken-01-source.png` | `Subject: isometric broken roadside signboard with no readable text, green rusted panel, bent posts, cracked base, designed to fit a 128x128 prop sprite.` |

After each image generation call returns an output path, copy that PNG to the matching `tmp/imagegen/a2-city/source/*-source.png` file before starting the next row.

- [ ] **Step 3: Remove chroma key and resize to final paths**

Run this shell loop:

```bash
python3 - <<'PY'
from pathlib import Path
import subprocess
from PIL import Image

root = Path("tmp/imagegen/a2-city/source")
out = Path("public/assets/story-slice/a2-city")
helper = Path.home() / ".codex/skills/.system/imagegen/scripts/remove_chroma_key.py"

assets = {
    "lighthouse-off": ("lighthouse/lighthouse-off.png", (512, 512)),
    "lighthouse-charging": ("lighthouse/lighthouse-charging.png", (512, 512)),
    "lighthouse-on": ("lighthouse/lighthouse-on.png", (512, 512)),
    "lighthouse-core-glow": ("lighthouse/lighthouse-core-glow.png", (512, 512)),
    "building-green-01": ("map/building-green-01.png", (512, 512)),
    "building-ochre-01": ("map/building-ochre-01.png", (512, 512)),
    "building-teal-01": ("map/building-teal-01.png", (512, 512)),
    "road-straight-01": ("map/road-straight-01.png", (256, 256)),
    "road-cracked-01": ("map/road-cracked-01.png", (256, 256)),
    "concrete-broken-01": ("map/concrete-broken-01.png", (256, 256)),
    "wasteland-grass-01": ("map/wasteland-grass-01.png", (256, 256)),
    "debris-small-01": ("map/debris-small-01.png", (128, 128)),
    "debris-small-02": ("map/debris-small-02.png", (128, 128)),
    "wrecked-car-01": ("map/wrecked-car-01.png", (256, 256)),
    "streetlight-broken-01": ("map/streetlight-broken-01.png", (128, 128)),
    "roadblock-01": ("map/roadblock-01.png", (128, 128)),
    "signboard-broken-01": ("map/signboard-broken-01.png", (128, 128)),
}

for stem, (relative_out, size) in assets.items():
    source = root / f"{stem}-source.png"
    keyed = Path("tmp/imagegen/a2-city") / f"{stem}-alpha.png"
    final = out / relative_out
    final.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "python3",
        str(helper),
        "--input",
        str(source),
        "--out",
        str(keyed),
        "--auto-key",
        "border",
        "--soft-matte",
        "--transparent-threshold",
        "12",
        "--opaque-threshold",
        "220",
        "--despill",
    ], check=True)
    image = Image.open(keyed).convert("RGBA")
    image = image.resize(size, Image.Resampling.LANCZOS)
    image.save(final)
    print(final, image.size, image.mode)
PY
```

Expected:

```text
public/assets/story-slice/a2-city/lighthouse/lighthouse-off.png (512, 512) RGBA
...
public/assets/story-slice/a2-city/map/signboard-broken-01.png (128, 128) RGBA
```

- [ ] **Step 4: Update README art-pack notes**

Append this section to `public/assets/story-slice/README.md`:

```md
## A2 City Art Pack

`a2-city/` contains the first detailed isometric city art refresh for story mode. These PNGs are concept-image-matched sprites for the A2 preview map: center reactor/lighthouse states, ruined industrial buildings, diamond road/concrete tiles, and compact city props.

Export rules:

- PNG with alpha channel.
- Lighthouse and buildings: 512x512.
- Road and concrete tiles: 256x256 with transparent corners.
- Compact props: 128x128 except wrecked car at 256x256.
- Style: isometric cartoon wasteland city, teal-grey concrete, rusted metal, cyan energy accents, crisp dark outlines.
- No text, watermark, logos, UI, or extra characters.
```

- [ ] **Step 5: Run asset file tests and verify file failures are resolved**

Run:

```bash
npm test -- src/visual/storyAssetFiles.test.ts
```

Expected:

```text
PASS src/visual/storyAssetFiles.test.ts
```

- [ ] **Step 6: Commit generated assets**

```bash
git add public/assets/story-slice/a2-city public/assets/story-slice/README.md src/visual/storyAssetFiles.test.ts
git commit -m "feat: add story a2 city art assets"
```

---

### Task 3: Manifest And Renderer Integration

**Files:**
- Modify: `src/visual/storyAssetManifest.ts`
- Modify: `src/visual/storyAssetManifest.test.ts`
- Modify: `src/visual/storySliceRenderer.ts`
- Modify: `src/visual/storySliceRenderer.test.ts`

- [ ] **Step 1: Update renderer tests for A2 textured ground tiles**

In `src/visual/storySliceRenderer.test.ts`, update the first test after the existing `diamondHeight` assertion:

```ts
expect(firstGroundTile.texturePath).toBe(
  STORY_SLICE_ASSETS.map.groundTiles[3],
);
const firstGroundTileContainer = renderer.layers.ground.children[0] as InstanceType<typeof Container>;
const firstGroundTileSprite = firstGroundTileContainer.children.find(
  (child) => child.label === "story-a2-ground-curb-0-sprite",
) as PixiSprite;
expect(firstGroundTileSprite.texture).toBe(
  cachedTextures.get(STORY_SLICE_ASSETS.map.groundTiles[3]),
);
```

Add these assertions to the `scales custom iso map ground diamonds with tile size` test after the custom debug stat check:

```ts
expect(renderer.debugGroundTiles()[0].texturePath).toBe(
  STORY_SLICE_ASSETS.map.groundTiles[0],
);
```

- [ ] **Step 2: Run renderer tests and verify the expected failure**

Run:

```bash
npm test -- src/visual/storySliceRenderer.test.ts
```

Expected:

```text
FAIL src/visual/storySliceRenderer.test.ts
Expected firstGroundTile.texturePath to be /assets/story-slice/a2-city/map/wasteland-grass-01.png
```

- [ ] **Step 3: Update manifest paths**

Edit `src/visual/storyAssetManifest.ts`:

```ts
const A2_CITY_PATH = "/assets/story-slice/a2-city";
```

Replace the `map` and `lighthouse` sections:

```ts
  map: {
    groundTiles: [
      `${A2_CITY_PATH}/map/road-straight-01.png`,
      `${A2_CITY_PATH}/map/road-cracked-01.png`,
      `${A2_CITY_PATH}/map/concrete-broken-01.png`,
      `${A2_CITY_PATH}/map/wasteland-grass-01.png`,
    ],
    decorations: [
      `${A2_CITY_PATH}/map/debris-small-01.png`,
      `${A2_CITY_PATH}/map/debris-small-02.png`,
      `${A2_CITY_PATH}/map/wrecked-car-01.png`,
      `${A2_CITY_PATH}/map/streetlight-broken-01.png`,
      `${A2_CITY_PATH}/map/roadblock-01.png`,
      `${A2_CITY_PATH}/map/signboard-broken-01.png`,
    ],
    buildings: [
      `${A2_CITY_PATH}/map/building-green-01.png`,
      `${A2_CITY_PATH}/map/building-ochre-01.png`,
      `${A2_CITY_PATH}/map/building-teal-01.png`,
    ],
  },
  lighthouse: {
    states: {
      off: `${A2_CITY_PATH}/lighthouse/lighthouse-off.png`,
      charging: `${A2_CITY_PATH}/lighthouse/lighthouse-charging.png`,
      on: `${A2_CITY_PATH}/lighthouse/lighthouse-on.png`,
    },
    coreGlow: `${A2_CITY_PATH}/lighthouse/lighthouse-core-glow.png`,
  },
```

- [ ] **Step 4: Add A2 ground texture metadata and sprite rendering**

Edit `src/visual/storySliceRenderer.ts`.

Change `StoryGroundTileDebug`:

```ts
export interface StoryGroundTileDebug {
  label: string;
  worldPoint: StoryPoint;
  projectedPoint: StoryPoint;
  diamondWidth: number;
  diamondHeight: number;
  kind: StoryIsoTileKind;
  texturePath?: string;
}
```

Add this helper below `getIsoGroundColor`:

```ts
function getA2GroundTexturePath(kind: StoryIsoTileKind): string {
  const [road, cracked, concrete, pollutedEdge] =
    STORY_SLICE_ASSETS.map.groundTiles;
  if (kind === "road") return road;
  if (kind === "roadCracked") return cracked;
  if (kind === "curb" || kind === "rubble" || kind === "stain") {
    return pollutedEdge;
  }
  return concrete;
}
```

Replace `makeA2GroundTile` with:

```ts
function makeA2GroundTile(
  tile: StoryIsoTileDefinition,
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Container; debug: StoryGroundTileDebug } {
  const worldPoint = getIsoTileWorldPoint(tile, center, isoMap);
  const projectedPoint = options.projectPoint?.(worldPoint) ?? worldPoint;
  const diamondScale = getIsoMapTileScale(isoMap);
  const diamondWidth = STORY_2_5D_CONFIG.isoTileWidth * diamondScale;
  const diamondHeight = STORY_2_5D_CONFIG.isoTileHeight * diamondScale;
  const texturePath = getA2GroundTexturePath(tile.kind);
  const label = `story-a2-ground-${tile.kind}-${tileIndex}`;
  const view = new Container();
  view.label = label;
  view.position.set(projectedPoint.x, projectedPoint.y);

  const sprite = new Sprite(Texture.from(texturePath));
  sprite.label = `${label}-sprite`;
  sprite.anchor.set(0.5);
  sprite.width = diamondWidth;
  sprite.height = diamondHeight;
  view.addChild(sprite);

  const outline = new Graphics();
  outline
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
    .stroke({ color: 0x050706, alpha: 0.22, width: 2 });
  view.addChild(outline);

  return {
    view,
    debug: {
      label,
      worldPoint,
      projectedPoint,
      diamondWidth,
      diamondHeight,
      kind: tile.kind,
      texturePath,
    },
  };
}
```

- [ ] **Step 5: Run focused tests and verify they pass**

Run:

```bash
npm test -- src/visual/storyAssetManifest.test.ts src/visual/storyAssetFiles.test.ts src/visual/storySliceRenderer.test.ts
```

Expected:

```text
PASS src/visual/storyAssetManifest.test.ts
PASS src/visual/storyAssetFiles.test.ts
PASS src/visual/storySliceRenderer.test.ts
```

- [ ] **Step 6: Commit manifest and renderer integration**

```bash
git add src/visual/storyAssetManifest.ts src/visual/storyAssetManifest.test.ts src/visual/storyAssetFiles.test.ts src/visual/storySliceRenderer.ts src/visual/storySliceRenderer.test.ts
git commit -m "feat: use story a2 city art assets"
```

---

### Task 4: Visual Tuning And Final Verification

**Files:**
- Modify: `src/visual/storyIsoMap.ts`
- Modify: `src/visual/storySliceRenderer.test.ts`
- Modify: `scripts/inspect-story-2-5d.mjs`

- [ ] **Step 1: Update screenshot script default path for this pass**

Edit `scripts/inspect-story-2-5d.mjs`:

```js
const outputPath = process.env.STORY_2_5D_SCREENSHOT ?? "/tmp/story-a2-city-art-refresh.png";
```

- [ ] **Step 2: Run screenshot inspection**

Run:

```bash
STORY_2_5D_SCREENSHOT=/tmp/story-a2-city-art-refresh.png node scripts/inspect-story-2-5d.mjs
```

Expected:

```json
{
  "outputPath": "/tmp/story-a2-city-art-refresh.png",
  "story2_5dEnabled": true,
  "storyIsoMapMode": "a2-preview",
  "storyIsoMapTileCount": 143,
  "storyIsoMapPropCount": 8,
  "storyIsoMapBlockedFootprintCount": 6,
  "story2_5dProjectedUnderlayEnabled": true
}
```

- [ ] **Step 3: Inspect the screenshot**

Open `/tmp/story-a2-city-art-refresh.png` with the local image viewer.

Acceptance criteria:

- Center tower is the visual landmark and resembles the concept image's reactor tower.
- Road and concrete tiles show generated art texture, not plain Pixi diamond fills.
- Three buildings have varied silhouettes and do not hide the vanguard at spawn.
- Roadblock, sign, streetlight, and wrecked car are readable at gameplay zoom.
- Zombies, vanguard, bullets, hit sparks, and fog remain readable.

- [ ] **Step 4: Adjust prop scales only if the screenshot fails acceptance**

If a generated prop is visibly too large or too small, edit only the relevant `scale`, `visualHeight`, `shadowScaleX`, or `shadowScaleY` values in `src/visual/storyIsoMap.ts`. Preserve tile coordinates, footprints, and blocked rect counts.

After any scale adjustment, update `src/visual/storySliceRenderer.test.ts` only for changed expected z-index or debug values. Do not change map counts.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5317 npx playwright test --grep "story mode map tuning"
STORY_2_5D_SCREENSHOT=/tmp/story-a2-city-art-refresh.png node scripts/inspect-story-2-5d.mjs
npm run build
```

Expected:

```text
npm test: all Vitest files pass
Playwright story mode map tuning: 1 passed
inspect-story-2-5d: prints A2 metrics and writes /tmp/story-a2-city-art-refresh.png
npm run build: exits 0
```

- [ ] **Step 6: Commit final tuning**

If Step 4 changed code or Step 1 changed the script, commit:

```bash
git add src/visual/storyIsoMap.ts src/visual/storySliceRenderer.test.ts scripts/inspect-story-2-5d.mjs
git commit -m "fix: tune story a2 city art presentation"
```

If only generated assets and renderer integration changed, no extra commit is needed for this task.

---

## Completion

After Task 4 passes:

1. Request code review with `superpowers:requesting-code-review`.
2. Fix Critical and Important findings.
3. Re-run final verification.
4. Use `superpowers:finishing-a-development-branch` to present merge, PR, keep-branch, or discard options.
