import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Texture as PixiTexture } from "pixi.js";
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

const { Cache, Graphics, Texture } = await import("pixi.js");
const {
  attachStoryActorVisual,
  getStoryActorDirection,
} = await import("./storyActorVisuals");

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

describe("story actor visuals", () => {
  beforeEach(() => {
    seedStoryTextures();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    expectNoConsoleNoise();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    Cache.reset();
  });

  it("chooses a cardinal direction from movement", () => {
    expect(getStoryActorDirection({ x: 1, y: 0 })).toBe("right");
    expect(getStoryActorDirection({ x: -1, y: 0 })).toBe("left");
    expect(getStoryActorDirection({ x: 0, y: -1 })).toBe("up");
    expect(getStoryActorDirection({ x: 0, y: 1 })).toBe("down");
    expect(getStoryActorDirection({ x: 0.1, y: 0.8 })).toBe("down");
  });

  it("attaches an animated sprite child to an existing graphics actor", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "idle", "down");

    expect(view.children).toContain(visual.sprite);
    expect(visual.character).toBe("vanguard");
    expect(visual.animation).toBe("idle");
    expect(visual.direction).toBe("down");
  });

  it("updates animation and flashes without removing the actor view", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "zombie", "run", "left");

    visual.play("hit", "left");
    visual.flash(0xff5b5b);

    expect(visual.animation).toBe("hit");
    expect(visual.direction).toBe("left");
    expect(view.destroyed).toBe(false);
  });
});
