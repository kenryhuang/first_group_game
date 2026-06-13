import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sprite as PixiSprite, Texture as PixiTexture } from "pixi.js";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_SLICE_LAYER_NAMES } from "./storyArtDirection";
import {
  getStorySliceAssetPaths,
  STORY_SLICE_ASSETS,
} from "./storyAssetManifest";

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
    });

    expect(world.children).toContain(renderer.root);
    expect(Object.keys(renderer.layers)).toEqual([...STORY_SLICE_LAYER_NAMES]);
    expect(renderer.layers.ground.children).toHaveLength(63);
    expect(renderer.layers.decal.children).toHaveLength(2);
    expect(renderer.layers.prop.children).toHaveLength(7);
    expect(renderer.layers.lighthouse.children).toHaveLength(1);
    expect(renderer.layers.effect.children).toHaveLength(1);
    expect(renderer.layers.worldUi.children).toHaveLength(0);
    expect(renderer.debugSpriteCount()).toBe(74);

    const lighthouse = renderer.layers.lighthouse.children[0] as PixiSprite;
    const coreGlow = renderer.layers.effect.children[0] as PixiSprite;
    expect(lighthouse.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.states.off),
    );
    expect(coreGlow.texture).toBe(
      cachedTextures.get(STORY_SLICE_ASSETS.lighthouse.coreGlow),
    );
  });

  it("updates lighthouse visual state", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });
    const lighthouse = renderer.layers.lighthouse.children[0] as PixiSprite;

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
