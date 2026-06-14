import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sprite as PixiSprite, Texture as PixiTexture } from "pixi.js";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_SLICE_LAYER_NAMES } from "./storyArtDirection";
import {
  getStorySliceAssetPaths,
  STORY_SLICE_ASSETS,
} from "./storyAssetManifest";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryPoint,
} from "./story2_5dProjection";
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoBlockedFootprints,
  getStoryIsoMapStats,
  getStoryIsoTileWorldPoint,
} from "./storyIsoMap";

const canvasContextStub = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) })),
  globalCompositeOperation: "source-over",
  fillStyle: "#000000",
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => canvasContextStub),
});

const { Cache, Container, Sprite, Texture } = await import("pixi.js");
const { gsap } = await import("gsap");
const { createStorySliceRenderer } = await import("./storySliceRenderer");

const cachedTextures = new Map<string, PixiTexture>();
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

function seedStoryTextures(): void {
  cachedTextures.clear();
  Cache.reset();

  for (const path of getStorySliceAssetPaths(STORY_SLICE_ASSETS)) {
    const texture = new Texture({ label: path });
    cachedTextures.set(path, texture);
    Cache.set(path, texture);
  }
}

function expectNoConsoleNoise(): void {
  expect(consoleErrorSpy).not.toHaveBeenCalled();
  expect(consoleWarnSpy).not.toHaveBeenCalled();
}

describe("story slice renderer", () => {
  beforeEach(() => {
    seedStoryTextures();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expectNoConsoleNoise();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    gsap.globalTimeline.clear();
    Cache.reset();
  });

  it("creates stable named layers under one root", () => {
    const world = new Container();
    const renderer = createStorySliceRenderer({
      world,
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
      projectPoint: (point) =>
        projectStoryPoint(point, STORY_CENTER_LIGHTHOUSE.position),
    });

    expect(world.children).toContain(renderer.root);
    expect(Object.keys(renderer.layers)).toEqual([...STORY_SLICE_LAYER_NAMES]);
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

    const firstFogSprite = renderer.layers.fog.children[0] as PixiSprite;
    expect(firstFogSprite.scale.x).toBe(2.2);
    expect(firstFogSprite.scale.y).toBe(2.2 * STORY_2_5D_CONFIG.isoFogScaleY);

    const coreGlow = renderer.layers.effect.children[0] as PixiSprite;
    expect(coreGlow.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.coreGlow),
    );
  });

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
    expect(
      props.every((prop) => prop.containerParentLabel === "story-world-root"),
    ).toBe(true);
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
  });

  it("preserves default ground and fog layout without projection", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    const firstGroundSprite = renderer.layers.ground.children[0] as PixiSprite;
    const firstGroundPosition = {
      x: STORY_CENTER_LIGHTHOUSE.position.x - 4 * 256,
      y: STORY_CENTER_LIGHTHOUSE.position.y - 3 * 256,
    };

    expect(firstGroundSprite.position.x).toBe(firstGroundPosition.x);
    expect(firstGroundSprite.position.y).toBe(firstGroundPosition.y);
    expect(firstGroundSprite.scale.x).toBe(1);
    expect(firstGroundSprite.scale.y).toBe(1);

    const firstFogSprite = renderer.layers.fog.children[0] as PixiSprite;
    expect(firstFogSprite.scale.x).toBe(2.2);
    expect(firstFogSprite.scale.y).toBe(2.2);
    expect(renderer.debugIsoMapStats()).toBeUndefined();
    expect(renderer.debugBlockedFootprints()).toEqual([]);
  });

  it("preserves legacy projected ground layout when iso map is disabled", () => {
    const world = new Container();
    const center = STORY_CENTER_LIGHTHOUSE.position;
    const renderer = createStorySliceRenderer({
      world,
      center,
      lit: false,
      projectPoint: (point) => projectStoryPoint(point, center),
      isoMap: null,
    });

    expect(renderer.layers.ground.children).toHaveLength(63);
    expect(renderer.debugGroundTiles()).toHaveLength(63);

    const firstGroundTile = renderer.debugGroundTiles()[0];
    const projectedFirstGroundPosition = projectStoryPoint(
      {
        x: center.x - 4 * 256,
        y: center.y - 3 * 256,
      },
      center,
    );

    expect(firstGroundTile.label).toBe("story-iso-ground-concrete-0");
    expect(firstGroundTile.projectedPoint).toEqual(projectedFirstGroundPosition);
    expect(renderer.debugIsoMapStats()).toBeUndefined();
    expect(renderer.debugBlockedFootprints()).toEqual([]);
  });

  it("adds textured fog that thins as the lighthouse turns on", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });
    const fogSprites = renderer.layers.fog.children as PixiSprite[];

    expect(fogSprites).toHaveLength(4);
    for (const fog of fogSprites) {
      expect(fog.texture).toBe(cachedTextures.get(STORY_SLICE_ASSETS.effects.fogNoise));
      expect(fog.alpha).toBe(0.38);
      expect(fog.tint).toBe(0xb9fff0);
      expect(fog.scale.x).toBe(2.2);
      expect(fog.scale.y).toBe(2.2);
    }

    renderer.setLighthouseCharging();
    expect(fogSprites[0].alpha).toBe(0.24);

    renderer.setLighthouseLit(true);
    expect(fogSprites[0].alpha).toBe(0.12);

    renderer.setLighthouseLit(false);
    expect(fogSprites[0].alpha).toBe(0.38);
  });

  it("updates lighthouse visual state", () => {
    const world = new Container();
    const renderer = createStorySliceRenderer({
      world,
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });
    const lighthouseContainer = world.children.find(
      (child) => child.label === "story-volume-lighthouse",
    ) as InstanceType<typeof Container>;
    const lighthouse = lighthouseContainer.children.find(
      (child) => child.label === "story-volume-lighthouse-sprite",
    ) as PixiSprite;

    expect(renderer.getLighthouseVisualState()).toBe("off");
    expect(lighthouse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.states.off),
    );

    renderer.setLighthouseCharging();
    expect(renderer.getLighthouseVisualState()).toBe("charging");
    expect(lighthouse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.states.charging),
    );

    renderer.setLighthouseLit(true);
    expect(renderer.getLighthouseVisualState()).toBe("on");
    expect(lighthouse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.states.on),
    );

    renderer.setLighthouseLit(false);
    expect(renderer.getLighthouseVisualState()).toBe("off");
    expect(lighthouse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.states.off),
    );
  });

  it("adds a scan pulse to the effect layer", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });
    const beforeCount = renderer.layers.effect.children.length;

    renderer.playScanPulse(STORY_CENTER_LIGHTHOUSE.position);

    expect(renderer.layers.effect.children.length).toBe(beforeCount + 1);
    const pulse = renderer.layers.effect.children.at(-1) as PixiSprite;
    expect(pulse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.effects.scanRing),
    );
  });

  it("cleans up active scan pulse tweens on destroy", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    renderer.playScanPulse(STORY_CENTER_LIGHTHOUSE.position);

    const pulse = renderer.layers.effect.children.at(-1) as PixiSprite;
    expect(gsap.getTweensOf(pulse)).toHaveLength(1);
    expect(gsap.getTweensOf(pulse.scale)).toHaveLength(1);

    renderer.destroy();

    expect(gsap.getTweensOf(pulse)).toHaveLength(0);
    expect(gsap.getTweensOf(pulse.scale)).toHaveLength(0);
    expect(pulse.destroyed).toBe(true);
  });
});
