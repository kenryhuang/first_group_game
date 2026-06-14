import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Texture as PixiTexture } from "pixi.js";
import {
  getStorySliceAssetPaths,
  STORY_SLICE_ASSETS,
  type StoryAnimationName,
  type StoryDirection,
} from "./storyAssetManifest";
import type { StoryActorCharacter } from "./storyActorVisuals";

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
  STORY_ACTOR_FOOT_ANCHORS,
  STORY_ACTOR_SCALES,
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

function getExpectedTextures(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): PixiTexture[] {
  const definition =
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction];
  if (!definition) {
    return [Texture.WHITE];
  }
  return definition.frames.map((frame) => {
    const texture = cachedTextures.get(frame);
    expect(texture).toBeDefined();
    return texture as PixiTexture;
  });
}

function getExpectedAnimationSpeed(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): number {
  const frameMs =
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]
      ?.frameMs ?? 120;
  return 1000 / frameMs / 60;
}

function getExpectedLoop(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): boolean {
  return (
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]
      ?.loop ?? true
  );
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
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it("uses boosted C2 scales and foot anchors for the redrawn character art", () => {
    const vanguardView = new Graphics();
    const vanguard = attachStoryActorVisual(
      vanguardView,
      "vanguard",
      "idle",
      "down",
    );
    const zombieView = new Graphics();
    const zombie = attachStoryActorVisual(zombieView, "zombie", "idle", "down");

    expect(STORY_ACTOR_SCALES.vanguard).toBe(0.57);
    expect(STORY_ACTOR_SCALES.zombie).toBe(0.43);
    expect(STORY_ACTOR_FOOT_ANCHORS.vanguard).toBe(0.88);
    expect(STORY_ACTOR_FOOT_ANCHORS.zombie).toBe(0.9);
    expect(vanguard.sprite.scale.x).toBeCloseTo(0.57);
    expect(vanguard.sprite.scale.y).toBeCloseTo(0.57);
    expect(vanguard.sprite.anchor.x).toBeCloseTo(0.5);
    expect(vanguard.sprite.anchor.y).toBeCloseTo(0.88);
    expect(zombie.sprite.scale.x).toBeCloseTo(0.43);
    expect(zombie.sprite.scale.y).toBeCloseTo(0.43);
    expect(zombie.sprite.anchor.x).toBeCloseTo(0.5);
    expect(zombie.sprite.anchor.y).toBeCloseTo(0.9);
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

  it("updates sprite playback metadata from manifest definitions", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "idle", "down");

    visual.play("attack", "right");

    expect(visual.sprite.textures).toEqual(
      getExpectedTextures("vanguard", "attack", "right"),
    );
    expect(visual.sprite.animationSpeed).toBeCloseTo(
      getExpectedAnimationSpeed("vanguard", "attack", "right"),
    );
    expect(visual.sprite.loop).toBe(
      getExpectedLoop("vanguard", "attack", "right"),
    );
  });

  it("uses the white texture fallback for a missing animation definition", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "death", "down");

    expect(visual.sprite.textures).toEqual([Texture.WHITE]);
    expect(visual.sprite.animationSpeed).toBeCloseTo(1000 / 120 / 60);
    expect(visual.sprite.loop).toBe(true);
  });

  it("restores a flash tint after the flash timer completes", () => {
    vi.useFakeTimers();
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "idle", "down");
    visual.sprite.tint = 0x123456;

    visual.flash(0xff5b5b);

    expect(visual.sprite.tint).toBe(0xff5b5b);
    vi.advanceTimersByTime(79);
    expect(visual.sprite.tint).toBe(0xff5b5b);
    vi.advanceTimersByTime(1);
    expect(visual.sprite.tint).toBe(0x123456);
  });

  it("keeps overlapping flashes tied to the stable base tint", () => {
    vi.useFakeTimers();
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "vanguard", "idle", "down");
    visual.sprite.tint = 0x123456;

    visual.flash(0xff5b5b);
    vi.advanceTimersByTime(40);
    visual.flash(0x68e1fd);
    vi.advanceTimersByTime(40);

    expect(visual.sprite.tint).toBe(0x68e1fd);
    vi.advanceTimersByTime(40);
    expect(visual.sprite.tint).toBe(0x123456);
  });

  it("destroys the sprite idempotently and clears a pending flash timeout", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "zombie", "run", "left");

    visual.flash(0xff5b5b);
    visual.destroy();

    expect(visual.sprite.destroyed).toBe(true);
    expect(visual.sprite.playing).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(() => visual.destroy()).not.toThrow();
    vi.advanceTimersByTime(80);
    expect(visual.sprite.destroyed).toBe(true);
  });

  it("destroys the attached sprite when the parent graphics view is destroyed", () => {
    const view = new Graphics();
    const visual = attachStoryActorVisual(view, "zombie", "run", "left");

    expect(visual.sprite.playing).toBe(true);
    view.destroy();

    expect(view.destroyed).toBe(true);
    expect(visual.sprite.destroyed).toBe(true);
    expect(visual.sprite.playing).toBe(false);
  });
});
