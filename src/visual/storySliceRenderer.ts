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

function addGround(
  layers: Record<StorySliceLayerName, Container>,
  center: { x: number; y: number },
): void {
  const tileSize = 256;
  const [road, cracked, concrete, grass] = STORY_SLICE_ASSETS.map.groundTiles;
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
      layers.ground.addChild(
        makeSprite(
          asset,
          center.x + ix * tileSize,
          center.y + iy * tileSize,
          1,
        ),
      );
    }
  }
}

function addProps(
  layers: Record<StorySliceLayerName, Container>,
  center: { x: number; y: number },
): void {
  const [buildingGreen, buildingOchre, buildingTeal] =
    STORY_SLICE_ASSETS.map.buildings;
  layers.prop.addChild(
    makeSprite(buildingGreen, center.x - 520, center.y - 390, 0.72),
  );
  layers.prop.addChild(
    makeSprite(buildingOchre, center.x + 540, center.y - 360, 0.7),
  );
  layers.prop.addChild(
    makeSprite(buildingTeal, center.x - 440, center.y + 430, 0.66),
  );

  const [debrisOne, debrisTwo, wreckedCar, streetlight, roadblock, signboard] =
    STORY_SLICE_ASSETS.map.decorations;
  layers.decal.addChild(
    makeSprite(debrisOne, center.x - 180, center.y + 140, 0.78),
  );
  layers.decal.addChild(
    makeSprite(debrisTwo, center.x + 230, center.y - 110, 0.78),
  );
  layers.prop.addChild(
    makeSprite(wreckedCar, center.x + 360, center.y + 190, 0.72),
  );
  layers.prop.addChild(
    makeSprite(streetlight, center.x - 250, center.y - 245, 0.78),
  );
  layers.prop.addChild(
    makeSprite(roadblock, center.x + 85, center.y + 310, 0.82),
  );
  layers.prop.addChild(
    makeSprite(signboard, center.x - 20, center.y - 335, 0.82),
  );
}

export function createStorySliceRenderer(
  options: StorySliceRendererOptions,
): StorySliceRenderer {
  const root = new Container();
  root.label = "story-art-slice-root";
  options.world.addChild(root);

  const layers = createLayers(root);
  addGround(layers, options.center);
  addProps(layers, options.center);

  let lighthouseState: StoryLighthouseVisualState = options.lit ? "on" : "off";
  const lighthouse = makeSprite(
    STORY_SLICE_ASSETS.lighthouse.states[lighthouseState],
    options.center.x,
    options.center.y,
    0.82,
  );
  lighthouse.label = "story-center-lighthouse-sprite";
  layers.lighthouse.addChild(lighthouse);

  const coreGlow = makeSprite(
    STORY_SLICE_ASSETS.lighthouse.coreGlow,
    options.center.x,
    options.center.y,
    0.72,
  );
  coreGlow.label = "story-center-lighthouse-core-glow";
  coreGlow.alpha = options.lit ? 0.82 : 0.16;
  layers.effect.addChild(coreGlow);

  const setState = (state: StoryLighthouseVisualState): void => {
    lighthouseState = state;
    lighthouse.texture = Sprite.from(
      STORY_SLICE_ASSETS.lighthouse.states[state],
    ).texture;
    coreGlow.alpha =
      state === "on" ? 0.82 : state === "charging" ? 0.46 : 0.16;
  };

  return {
    root,
    layers,
    setLighthouseCharging: () => setState("charging"),
    setLighthouseLit: (lit: boolean) => setState(lit ? "on" : "off"),
    getLighthouseVisualState: () => lighthouseState,
    playScanPulse(origin: { x: number; y: number }): void {
      const pulse = makeSprite(
        STORY_SLICE_ASSETS.effects.scanRing,
        origin.x,
        origin.y,
        0.22,
      );
      pulse.tint = STORY_ART_PALETTE.mechCyan;
      pulse.alpha = 0.82;
      layers.effect.addChild(pulse);
      gsap.to(pulse.scale, {
        x: 3.4,
        y: 3.4,
        duration: 0.72,
        ease: "power2.out",
      });
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

export function isStoryLighthouseVisualState(
  value: string,
): value is StoryLighthouseVisualState {
  return STORY_LIGHTHOUSE_VISUAL_STATES.includes(
    value as StoryLighthouseVisualState,
  );
}
