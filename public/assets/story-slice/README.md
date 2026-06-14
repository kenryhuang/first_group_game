# Story Slice Asset Pack

This folder contains the first art-slice assets for the story-mode fog city lighthouse scene.

Current committed PNGs are deterministic placeholder assets for pipeline validation and should be replaced with polished production art in a later pass.

## Legacy Placeholder Style

The root-level placeholder assets follow this older non-isometric style. The
A2 city pack below is intentionally isometric.

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

## A2 City Art Pack

`a2-city/` contains the first detailed isometric city art refresh for story mode. These PNGs are concept-image-matched sprites for the A2 preview map: center reactor/lighthouse states, ruined industrial buildings, diamond road/concrete tiles, and compact city props.

Export rules:

- PNG with alpha channel.
- Lighthouse and buildings: 512x512.
- Road and concrete tiles: 256x256 with transparent corners.
- Compact props: 128x128 except wrecked car at 256x256.
- Style: isometric cartoon wasteland city, teal-grey concrete, rusted metal, cyan energy accents, crisp dark outlines.
- No text, watermark, logos, UI, or extra characters.
