import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_SLICE_LAYER_NAMES } from "./storyArtDirection";
import { createStorySliceRenderer } from "./storySliceRenderer";

describe("story slice renderer", () => {
  it("creates stable named layers under one root", () => {
    const world = new Container();
    const renderer = createStorySliceRenderer({
      world,
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    expect(world.children).toContain(renderer.root);
    expect(Object.keys(renderer.layers)).toEqual([...STORY_SLICE_LAYER_NAMES]);
    expect(renderer.debugSpriteCount()).toBeGreaterThanOrEqual(18);
  });

  it("updates lighthouse visual state", () => {
    const renderer = createStorySliceRenderer({
      world: new Container(),
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: false,
    });

    expect(renderer.getLighthouseVisualState()).toBe("off");

    renderer.setLighthouseCharging();
    expect(renderer.getLighthouseVisualState()).toBe("charging");

    renderer.setLighthouseLit(true);
    expect(renderer.getLighthouseVisualState()).toBe("on");

    renderer.setLighthouseLit(false);
    expect(renderer.getLighthouseVisualState()).toBe("off");
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
  });
});
